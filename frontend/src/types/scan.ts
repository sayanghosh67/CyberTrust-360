export type RiskClassification =
  | 'Low Risk'
  | 'Suspicious'
  | 'High Risk'
  | 'Confirmed Malicious'
  | 'Inconclusive';

export type ConfidenceLevel = 'Low' | 'Medium' | 'High';

export type IndicatorSeverity = 'info' | 'low' | 'medium' | 'high' | 'critical';

export interface TyposquatMatch {
  brand: string;
  similarity: number;
  reason: string;
}

export interface URLAnalysis {
  original_url: string;
  canonical_url: string;
  hostname: string;
  registered_domain: string;
  subdomain: string;
  tld: string;
  scheme: string;
  is_ip_address: boolean;
  is_url_shortener: boolean;
  suspicious_patterns: string[];
  typosquatting_matches: TyposquatMatch[];
}

export interface DNSAnalysis {
  status: 'resolved' | 'failed' | 'unavailable';
  a_records: string[];
  aaaa_records: string[];
  mx_records: string[];
  txt_records: string[];
  ns_records: string[];
  error_message?: string | null;
}

export interface SSLAnalysis {
  https_available: boolean;
  valid: boolean;
  expired: boolean;
  days_remaining?: number | null;
  issuer: Record<string, string>;
  subject: {
    common_name?: string;
    alt_names?: string[];
  };
  protocol?: string | null;
  cipher?: string | null;
  hostname_mismatch: boolean;
  error_message?: string | null;
}

export interface HeadersAnalysis {
  status_code?: number | null;
  hsts_present: boolean;
  csp_present: boolean;
  x_frame_options?: string | null;
  x_content_type_options?: string | null;
  referrer_policy?: string | null;
  permissions_policy?: string | null;
  server?: string | null;
  redirect_count: number;
  redirect_chain: string[];
  is_http_to_https_redirect: boolean;
  suspicious_redirect: boolean;
  missing_headers: string[];
  error_message?: string | null;
}

export interface ThreatIntelSource {
  provider: string;
  status: 'clean' | 'malicious' | 'suspicious' | 'not_configured' | 'unavailable';
  details?: string | null;
  reference_url?: string | null;
}

export interface DetectedIndicator {
  name: string;
  category: 'url' | 'dns' | 'ssl' | 'headers' | 'threat_intel';
  severity: IndicatorSeverity;
  description: string;
  technical_evidence: string;
}

export interface ScanResponse {
  id: string;
  url: string;
  hostname: string;
  registered_domain: string;
  created_at: string;
  risk_classification: RiskClassification;
  risk_score: number;
  confidence: ConfidenceLevel;
  summary: string;
  recommended_actions: string[];
  disclaimer: string;
  url_analysis: URLAnalysis;
  dns_analysis: DNSAnalysis;
  ssl_analysis: SSLAnalysis;
  headers_analysis: HeadersAnalysis;
  threat_intel: ThreatIntelSource[];
  indicators: DetectedIndicator[];
  failed_checks: string[];
}

export interface ScanSummaryItem {
  id: string;
  url: string;
  hostname: string;
  registered_domain: string;
  ip_address?: string | null;
  risk_classification: RiskClassification;
  risk_score: number;
  confidence: ConfidenceLevel;
  summary?: string | null;
  created_at: string;
}
