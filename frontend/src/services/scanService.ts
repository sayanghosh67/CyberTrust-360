import { notifyReportsChanged } from './reportEvents';
import { API_BASE_URL, ApiError, apiFetch } from './api';
import type { ScanResponse, ScanSummaryItem } from '../types/scan';
import { performEdgeUrlScan, getEdgeScans } from './edgeFallback';

export async function submitScan(url: string): Promise<ScanResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s fast failover to edge

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

    if (res.ok) {
      const data: ScanResponse = await res.json();
      notifyReportsChanged();
      return data;
    }
  } catch (_err: unknown) {
    clearTimeout(timeoutId);
  }

  // Graceful fallback to client-side Edge Engine
  const edgeResult = await performEdgeUrlScan(url);
  notifyReportsChanged();
  return edgeResult;
}

export async function fetchRecentScans(limit: number = 10): Promise<ScanSummaryItem[]> {
  try {
    const res = await apiFetch(`${API_BASE_URL}/api/v1/scans?limit=${limit}`, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      const items = await res.json();
      if (Array.isArray(items) && items.length > 0) return items;
    }
  } catch {
    // Fallback to Edge scans
  }

  const edgeScans = getEdgeScans().slice(0, limit);
  return edgeScans.map((s) => ({
    id: s.id,
    url: s.url,
    hostname: s.hostname,
    registered_domain: s.registered_domain,
    ip_address: s.dns_analysis?.a_records?.[0] || null,
    risk_classification: s.risk_classification,
    risk_score: s.risk_score,
    confidence: s.confidence,
    summary: s.summary,
    created_at: s.created_at,
  }));
}

export async function fetchScanById(scanId: string): Promise<ScanResponse> {
  try {
    const res = await apiFetch(`${API_BASE_URL}/api/v1/scans/${scanId}`, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fallback to Edge scans
  }

  const found = getEdgeScans().find((s) => s.id === scanId);
  if (found) return found;

  throw new ApiError('Scan report not found or unavailable.', 404);
}
