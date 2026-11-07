import type { BackendHealthResponse } from '../types/health';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:8000' : '');

export class ApiError extends Error {
  statusCode?: number;

  constructor(message: string, statusCode?: number) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
  }
}

export async function fetchBackendHealth(): Promise<{ data: BackendHealthResponse; latencyMs: number }> {
  const startTime = performance.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    const response = await fetch(`${API_BASE_URL}/api/health`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const latencyMs = Math.round(performance.now() - startTime);

    if (!response.ok) {
      const errorText = await response.text();
      throw new ApiError(`Backend returned ${response.status}: ${errorText}`, response.status);
    }

    const data: BackendHealthResponse = await response.json();
    return { data, latencyMs };
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new ApiError('Connection timed out while contacting backend (6000ms)', 408);
    }
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(error.message || 'Failed to connect to backend service', 0);
  }
}

export { API_BASE_URL };

// Public visitors never receive an operator token or see an access-token form.
let sessionRequest: Promise<string> | null = null;
export function accessToken(): string { return sessionStorage.getItem('cybertrust-visitor') || ''; }
async function visitorSession(): Promise<string> {
  const existing = accessToken();
  if (existing) return existing;
  if (!sessionRequest) {
    sessionRequest = (async () => {
      const response = await fetch(`${API_BASE_URL}/api/v1/access/session`, { method: 'POST', signal: AbortSignal.timeout(8000) });
      if (!response.ok) throw new ApiError('Unable to start a private session. Please try again shortly.', response.status);
      const data = await response.json();
      sessionStorage.setItem('cybertrust-visitor', data.access_token);
      return data.access_token as string;
    })().finally(() => { sessionRequest = null; });
  }
  return sessionRequest;
}
export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const sentToken = await visitorSession();
  headers.set('Authorization', `Bearer ${sentToken}`);
  let response = await fetch(input, { ...init, headers });
  if (response.status === 401) {
    if (accessToken() === sentToken) sessionStorage.removeItem('cybertrust-visitor');
    headers.set('Authorization', `Bearer ${await visitorSession()}`);
    response = await fetch(input, { ...init, headers });
  }
  return response;
}
