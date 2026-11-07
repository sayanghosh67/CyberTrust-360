import { notifyReportsChanged } from './reportEvents';
import { API_BASE_URL, ApiError, apiFetch } from './api';
import type {
  ScamAnalysisResponse,
  ScamAnalysisSummaryItem,
  ActionTakenType,
  SafetyGuidanceResponse,
} from '../types/scam';
import {
  performEdgeScamAnalysis,
  getEdgeScams,
  getEdgeSafetyGuidance,
} from './edgeFallback';

export async function analyzeScamMessage(
  message: string,
  context: string = 'sms'
): Promise<ScamAnalysisResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

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

    if (res.ok) {
      const data: ScamAnalysisResponse = await res.json();
      notifyReportsChanged();
      return data;
    }
  } catch (_err: unknown) {
    clearTimeout(timeoutId);
  }

  // Graceful fallback to client-side Edge Scam DNA Engine
  const edgeResult = performEdgeScamAnalysis(message, context);
  notifyReportsChanged();
  return edgeResult;
}

export async function fetchRecentScamAnalyses(limit: number = 8): Promise<ScamAnalysisSummaryItem[]> {
  try {
    const res = await apiFetch(`${API_BASE_URL}/api/v1/scam/analyses?limit=${limit}`, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) return data;
    }
  } catch {
    // Fallback to Edge scams
  }

  const edgeScams = getEdgeScams().slice(0, limit);
  return edgeScams.map((s) => ({
    id: s.id,
    message_preview: s.message_preview,
    risk_classification: s.risk_classification,
    risk_score: s.risk_score,
    confidence: s.confidence,
    analysis_source: s.analysis_source,
    scam_archetype: s.scam_archetype,
    detected_tactics_count: s.tactics.length,
    summary: s.summary,
    created_at: s.created_at,
  }));
}

export async function fetchScamAnalysisById(id: string): Promise<ScamAnalysisResponse> {
  try {
    const res = await apiFetch(`${API_BASE_URL}/api/v1/scam/analyses/${id}`, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fallback to Edge scams
  }

  const found = getEdgeScams().find((s) => s.id === id);
  if (found) return found;

  throw new ApiError('Scam analysis report not found.', 404);
}

export async function fetchSafetyGuidance(actionTaken: ActionTakenType): Promise<SafetyGuidanceResponse> {
  try {
    const res = await apiFetch(`${API_BASE_URL}/api/v1/scam/guidance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ action_taken: actionTaken, involves_indian_payment: true }),
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fallback to Edge safety guidance
  }

  return getEdgeSafetyGuidance(actionTaken);
}
