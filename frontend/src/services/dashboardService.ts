import { API_BASE_URL, ApiError, apiFetch } from './api';
import type { DashboardMetrics } from '../types/dashboard';

export async function fetchDashboardMetrics(): Promise<DashboardMetrics> {
  try {
    const res = await apiFetch(`${API_BASE_URL}/api/v1/dashboard/metrics`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new ApiError(err?.detail || `Failed to fetch dashboard metrics (${res.status})`, res.status);
    }
    return await res.json();
  } catch (err: unknown) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(err instanceof Error ? err.message : 'Network error connecting to metrics probe', 0);
  }
}
