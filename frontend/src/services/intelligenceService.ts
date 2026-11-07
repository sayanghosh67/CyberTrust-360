import { API_BASE_URL, ApiError } from './api';
import type {
  GraphResponse,
  IndicatorsResponse,
  ReportRelationshipsResponse,
} from '../types/intelligence';

export async function fetchThreatGraph(
  filterType?: string,
  search?: string,
  limit: number = 100,
  includeDemo: boolean = false
): Promise<GraphResponse> {
  const params = new URLSearchParams();
  if (filterType && filterType !== 'all') params.append('filter_type', filterType);
  if (search && search.trim()) params.append('search', search.trim());
  params.append('limit', limit.toString());
  if (includeDemo) params.append('include_demo', 'true');

  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/intelligence/graph?${params.toString()}`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new ApiError(err?.detail || `Graph query failed (${res.status})`, res.status);
    }
    return await res.json();
  } catch (err: unknown) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(err instanceof Error ? err.message : 'Failed to fetch threat graph', 0);
  }
}

export async function fetchReportRelationships(reportId: string): Promise<ReportRelationshipsResponse> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/intelligence/relationships/${encodeURIComponent(reportId)}`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new ApiError(err?.detail || `Failed to fetch relationships for report (${res.status})`, res.status);
    }
    return await res.json();
  } catch (err: unknown) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(err instanceof Error ? err.message : 'Failed to fetch report relationships', 0);
  }
}

export async function fetchTopRecurringIndicators(limit: number = 20): Promise<IndicatorsResponse> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/intelligence/indicators?limit=${limit}`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new ApiError(err?.detail || `Failed to fetch indicators (${res.status})`, res.status);
    }
    return await res.json();
  } catch (err: unknown) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(err instanceof Error ? err.message : 'Failed to fetch recurring indicators', 0);
  }
}
