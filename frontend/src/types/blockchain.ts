export interface BlockchainStatus {
  connected: boolean;
  network_name: string;
  chain_id: number;
  latest_block: number;
  contract_address: string;
  signer_address: string;
  environment: string;
  total_registered_reports: number;
  disclaimer: string;
}

export interface BlockchainRegistration {
  registration_id: string;
  report_id: string;
  report_type: 'url_scan' | 'scam_report' | string;
  report_version: number;
  canonical_version: string;
  hash_algorithm: string;
  content_hash: string;
  report_id_hash: string;
  chain_id: number;
  contract_address: string;
  transaction_hash: string;
  block_number: number;
  signer_address: string;
  registered_at: string;
  registration_status: string;
  disclaimer: string;
}

export interface BlockchainVerification {
  report_id: string;
  report_type: string;
  verification_status: 'VERIFIED' | 'MISMATCH' | 'NOT_REGISTERED' | 'PENDING' | 'VERIFICATION_UNAVAILABLE' | 'ERROR';
  status_label: string;
  is_match: boolean;
  computed_content_hash: string;
  recorded_content_hash?: string | null;
  report_id_hash: string;
  transaction_hash?: string | null;
  block_number?: number | null;
  contract_address?: string | null;
  chain_id?: number | null;
  registered_at?: string | null;
  verified_at: string;
  tamper_detected: boolean;
  explanation: string;
  disclaimer: string;
}

export interface BlockchainRegistrationSummary {
  id: string;
  report_id: string;
  report_type: string;
  report_version: number;
  content_hash: string;
  chain_id: number;
  contract_address: string;
  transaction_hash: string;
  block_number: number;
  signer_address: string;
  registration_status: string;
  registered_at: string;
}

