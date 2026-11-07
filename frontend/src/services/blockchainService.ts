import { API_BASE_URL, ApiError, apiFetch } from './api';
import type {
  BlockchainStatus,
  BlockchainRegistration,
  BlockchainVerification,
  BlockchainRegistrationSummary,
} from '../types/blockchain';

export async function fetchBlockchainStatus(): Promise<BlockchainStatus> {
  try {
    const res = await apiFetch(`${API_BASE_URL}/api/v1/blockchain/status`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new ApiError(err?.detail || `Failed to fetch status (${res.status})`, res.status);
    }
    return await res.json();
  } catch (err: unknown) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(err instanceof Error ? err.message : 'Network error connecting to blockchain status probe', 0);
  }
}

export async function registerReportOnChain(reportId: string): Promise<BlockchainRegistration> {
  try {
    const res = await apiFetch(`${API_BASE_URL}/api/v1/blockchain/register/${encodeURIComponent(reportId)}`, {
      method: 'POST',
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new ApiError(err?.detail || `Blockchain registration failed (${res.status})`, res.status);
    }
    return await res.json();
  } catch (err: unknown) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(err instanceof Error ? err.message : 'Failed to register report on blockchain', 0);
  }
}

export async function verifyReportOnChain(reportId: string): Promise<BlockchainVerification> {
  try {
    const res = await apiFetch(`${API_BASE_URL}/api/v1/blockchain/verify/${encodeURIComponent(reportId)}`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new ApiError(err?.detail || `Verification request failed (${res.status})`, res.status);
    }
    return await res.json();
  } catch (err: unknown) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(err instanceof Error ? err.message : 'Failed to verify report integrity against blockchain', 0);
  }
}

export async function demoTamperOnChain(reportId: string): Promise<BlockchainVerification> {
  try {
    const res = await apiFetch(`${API_BASE_URL}/api/v1/blockchain/demo/tamper/${encodeURIComponent(reportId)}`, {
      method: 'POST',
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new ApiError(err?.detail || `Tamper demonstration failed (${res.status})`, res.status);
    }
    return await res.json();
  } catch (err: unknown) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(err instanceof Error ? err.message : 'Failed to execute tamper demonstration', 0);
  }
}

export async function fetchBlockchainRegistrations(limit: number = 50): Promise<BlockchainRegistrationSummary[]> {
  try {
    const res = await apiFetch(`${API_BASE_URL}/api/v1/blockchain/registrations?limit=${limit}`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) {
      return [];
    }
    const data = await res.json();
    return data.registrations || [];
  } catch {
    return [];
  }
}

export async function fetchReportRegistration(reportId: string): Promise<BlockchainRegistration | null> {
  try {
    const res = await apiFetch(`${API_BASE_URL}/api/v1/blockchain/registrations/${encodeURIComponent(reportId)}`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) {
      return null;
    }
    return await res.json();
  } catch {
    return null;
  }
}

