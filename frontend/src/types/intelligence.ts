export type NodeType =
  | 'scam_report'
  | 'url_scan'
  | 'domain'
  | 'url'
  | 'brand'
  | 'tactic'
  | 'indicator';

export type RelationshipCategory =
  | 'VERIFIED_SHARED_INDICATOR'
  | 'POSSIBLE_RELATIONSHIP';

export type RiskLevel =
  | 'Low Risk'
  | 'Suspicious'
  | 'High Risk'
  | 'Confirmed Malicious'
  | 'Inconclusive';

export interface GraphNodeData {
  id: string;
  type: NodeType;
  label: string;
  sublabel?: string | null;
  risk_classification?: RiskLevel | null;
  risk_score?: number | null;
  severity?: 'info' | 'low' | 'medium' | 'high' | 'critical' | null;
  indicator_type?: string | null;
  report_count: number;
  properties: Record<string, unknown>;
}

export interface GraphEdgeData {
  id: string;
  source: string;
  target: string;
  label: string;
  relationship_type: string;
  category: RelationshipCategory;
  evidence: string;
  source_report_ids: string[];
  confidence: 'Low' | 'Medium' | 'High';
  weight: number;
  limitations: string;
}

export interface GraphResponse {
  nodes: GraphNodeData[];
  edges: GraphEdgeData[];
  total_reports_analyzed: number;
  verified_relationships_count: number;
  possible_relationships_count: number;
  is_demo_data: boolean;
  generated_at: string;
}

export interface RecurringIndicatorSummary {
  type: string;
  value: string;
  report_count: number;
  report_ids: string[];
  risk_classifications: string[];
  first_seen: string;
  last_seen: string;
}

export interface IndicatorsResponse {
  indicators: RecurringIndicatorSummary[];
  total_count: number;
}

export interface ConnectedReportSummary {
  report_id: string;
  report_type: 'scam_report' | 'url_scan';
  label: string;
  risk_classification: string;
  risk_score: number;
  connection_type: RelationshipCategory;
  shared_indicators: string[];
  evidence: string;
}

export interface ReportRelationshipsResponse {
  report_id: string;
  report_type: 'scam_report' | 'url_scan';
  report_label: string;
  connected_reports: ConnectedReportSummary[];
  total_connected_reports: number;
  verified_shared_count: number;
  possible_inferred_count: number;
  limitations: string;
}
