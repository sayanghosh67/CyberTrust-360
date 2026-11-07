import { API_BASE_URL, apiFetch } from './api';
import type {
  GraphResponse,
  IndicatorsResponse,
  ReportRelationshipsResponse,
} from '../types/intelligence';
import {
  getEdgeThreatGraph,
  getEdgeReportRelationships,
  getEdgeTopIndicators,
} from './edgeFallback';

export async function fetchThreatGraph(
  filterType?: string,
  search?: string,
  limit: number = 100,
  includeDemo: boolean = false,
  signal?: AbortSignal
): Promise<GraphResponse> {
  const params = new URLSearchParams();
  if (filterType && filterType !== 'all') params.append('filter_type', filterType);
  if (search && search.trim()) params.append('search', search.trim());
  params.append('limit', limit.toString());
  if (includeDemo) params.append('include_demo', 'true');

  try {
    const res = await apiFetch(`${API_BASE_URL}/api/v1/intelligence/graph?${params.toString()}`, {
      headers: { Accept: 'application/json' },
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(4000)]) : AbortSignal.timeout(4000),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fallback to Edge graph
  }

  return getEdgeThreatGraph(filterType, search, limit, includeDemo);
}

export async function fetchReportRelationships(reportId: string): Promise<ReportRelationshipsResponse> {
  try {
    const res = await apiFetch(`${API_BASE_URL}/api/v1/intelligence/relationships/${encodeURIComponent(reportId)}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fallback
  }

  return getEdgeReportRelationships(reportId);
}

export async function fetchTopRecurringIndicators(limit: number = 20): Promise<IndicatorsResponse> {
  try {
    const res = await apiFetch(`${API_BASE_URL}/api/v1/intelligence/indicators?limit=${limit}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fallback
  }

  return getEdgeTopIndicators();
}
