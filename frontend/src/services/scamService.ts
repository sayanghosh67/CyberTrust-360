import { notifyReportsChanged } from './reportEvents';
import { API_BASE_URL, ApiError, apiFetch } from './api';
import type {
  ScamAnalysisResponse,
  ScamAnalysisSummaryItem,
  ActionTakenType,
  SafetyGuidanceResponse,
} from '../types/scam';

export async function analyzeScamMessage(
  message: string,
  context: string = 'sms'
): Promise<ScamAnalysisResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);

  const normalizedContext = context.toLowerCase().replace(/[\s-]+/g, '_');

  try {
    const res = await apiFetch(`${API_BASE_URL}/api/v1/scam/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ message, context: normalizedContext }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      const detail = errJson?.detail || `Analysis failed with status ${res.status}`;
      throw new ApiError(detail, res.status);
    }

    const data: ScamAnalysisResponse = await res.json();
    notifyReportsChanged();
    return data;
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === 'AbortError') {
      throw new ApiError('Scam analysis timed out (20s). Please try again.', 408);
    }
    if (err instanceof ApiError) {
      throw err;
    }
    throw new ApiError(err instanceof Error ? err.message : 'Failed to analyze scam message.', 0);
  }
}

export async function fetchRecentScamAnalyses(limit: number = 8): Promise<ScamAnalysisSummaryItem[]> {
  try {
    const res = await apiFetch(`${API_BASE_URL}/api/v1/scam/analyses?limit=${limit}`, {
      headers: { 'Accept': 'application/json' },
    });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function fetchScamAnalysisById(id: string): Promise<ScamAnalysisResponse> {
  const res = await apiFetch(`${API_BASE_URL}/api/v1/scam/analyses/${id}`, {
    headers: { 'Accept': 'application/json' },
  });
  if (!res.ok) {
    throw new ApiError('Scam analysis report not found.', res.status);
  }
  return await res.json();
}

export async function fetchSafetyGuidance(actionTaken: ActionTakenType): Promise<SafetyGuidanceResponse> {
  const res = await apiFetch(`${API_BASE_URL}/api/v1/scam/guidance`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({ action_taken: actionTaken, involves_indian_payment: true }),
  });
  if (!res.ok) {
    throw new ApiError('Failed to fetch safety guidance.', res.status);
  }
  return await res.json();
}
