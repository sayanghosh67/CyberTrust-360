import { API_BASE_URL, apiFetch } from './api';
import type { DashboardMetrics } from '../types/dashboard';
import { getEdgeDashboardMetrics } from './edgeFallback';

export async function fetchDashboardMetrics(): Promise<DashboardMetrics> {
  try {
    const res = await apiFetch(`${API_BASE_URL}/api/v1/dashboard/metrics`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fallback to Edge metrics
  }

  return getEdgeDashboardMetrics();
}
