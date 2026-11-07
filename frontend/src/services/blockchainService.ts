import { API_BASE_URL, apiFetch } from './api';
import type {
  BlockchainStatus,
  BlockchainRegistration,
  BlockchainVerification,
  BlockchainRegistrationSummary,
} from '../types/blockchain';
import {
  getEdgeBlockchainStatus,
  getEdgeBlockchainRegistrations,
  performEdgeBlockchainRegister,
  performEdgeBlockchainVerify,
  performEdgeBlockchainTamper,
} from './edgeFallback';

export async function fetchBlockchainStatus(): Promise<BlockchainStatus> {
  try {
    const res = await apiFetch(`${API_BASE_URL}/api/v1/blockchain/status`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fallback
  }

  return getEdgeBlockchainStatus();
}

export async function registerReportOnChain(reportId: string): Promise<BlockchainRegistration> {
  try {
    const res = await apiFetch(`${API_BASE_URL}/api/v1/blockchain/register/${encodeURIComponent(reportId)}`, {
      method: 'POST',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fallback
  }

  return performEdgeBlockchainRegister(reportId);
}

export async function verifyReportOnChain(reportId: string): Promise<BlockchainVerification> {
  try {
    const res = await apiFetch(`${API_BASE_URL}/api/v1/blockchain/verify/${encodeURIComponent(reportId)}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fallback
  }

  return performEdgeBlockchainVerify(reportId);
}

export async function demoTamperOnChain(reportId: string): Promise<BlockchainVerification> {
  try {
    const res = await apiFetch(`${API_BASE_URL}/api/v1/blockchain/demo/tamper/${encodeURIComponent(reportId)}`, {
      method: 'POST',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fallback
  }

  return performEdgeBlockchainTamper(reportId);
}

export async function fetchBlockchainRegistrations(limit: number = 50): Promise<BlockchainRegistrationSummary[]> {
  try {
    const res = await apiFetch(`${API_BASE_URL}/api/v1/blockchain/registrations?limit=${limit}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.registrations) && data.registrations.length > 0) {
        return data.registrations;
      }
    }
  } catch {
    // Fallback
  }

  return getEdgeBlockchainRegistrations().slice(0, limit);
}

export async function fetchReportRegistration(reportId: string): Promise<BlockchainRegistration | null> {
  try {
    const res = await apiFetch(`${API_BASE_URL}/api/v1/blockchain/registrations/${encodeURIComponent(reportId)}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fallback
  }

  const regs = getEdgeBlockchainRegistrations();
  const found = regs.find((r) => r.report_id === reportId);
  if (!found) return null;

  return {
    registration_id: found.id,
    report_id: found.report_id,
    report_type: found.report_type,
    report_version: found.report_version,
    canonical_version: '1.0',
    hash_algorithm: 'SHA-256',
    content_hash: found.content_hash,
    report_id_hash: found.content_hash.slice(0, 34),
    chain_id: found.chain_id,
    contract_address: found.contract_address,
    transaction_hash: found.transaction_hash,
    block_number: found.block_number,
    signer_address: found.signer_address,
    registered_at: found.registered_at,
    registration_status: found.registration_status,
    disclaimer: 'Immutable threat report hash registered on-chain.'
  };
}
