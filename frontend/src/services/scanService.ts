import { notifyReportsChanged } from './reportEvents';
import { API_BASE_URL, ApiError, apiFetch } from './api';
import type { ScanResponse, ScanSummaryItem } from '../types/scan';

export async function submitScan(url: string): Promise<ScanResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout for full multi-vector investigation

  try {
    const res = await apiFetch(`${API_BASE_URL}/api/v1/scans`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ url }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      const detail = errJson?.detail || `Investigation failed with status ${res.status}`;
      throw new ApiError(detail, res.status);
    }

    const data: ScanResponse = await res.json();
    notifyReportsChanged();
    return data;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new ApiError('Investigation timed out while analyzing target infrastructure (20s).', 408);
    }
    if (err instanceof ApiError) {
      throw err;
    }
    throw new ApiError(err.message || 'Failed to submit investigation request.', 0);
  }
}

export async function fetchRecentScans(limit: number = 10): Promise<ScanSummaryItem[]> {
  try {
    const res = await apiFetch(`${API_BASE_URL}/api/v1/scans?limit=${limit}`, {
      headers: { 'Accept': 'application/json' },
    });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function fetchScanById(scanId: string): Promise<ScanResponse> {
  const res = await apiFetch(`${API_BASE_URL}/api/v1/scans/${scanId}`, {
    headers: { 'Accept': 'application/json' },
  });
  if (!res.ok) {
    throw new ApiError('Scan report not found or unavailable.', res.status);
  }
  return await res.json();
}
