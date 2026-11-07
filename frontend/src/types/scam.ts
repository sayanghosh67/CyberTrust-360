export type RiskClassification =
  | 'Low Risk'
  | 'Suspicious'
  | 'High Risk'
  | 'Confirmed Malicious'
  | 'Inconclusive';

export type IndicatorType =
  | 'url'
  | 'domain'
  | 'phone'
  | 'email'
  | 'upi_id'
  | 'brand'
  | 'currency_amount'
  | 'suspicious_app';

export interface ExtractedIndicator {
  type: IndicatorType;
  value: string;
  context_snippet: string;
}

export interface ScamTactic {
  id: string;
  category:
    | 'urgency_threat'
    | 'financial_fraud'
    | 'credential_harvesting'
    | 'impersonation'
    | 'fake_reward'
    | 'social_engineering'
    | 'job_scam';
  name: string;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  evidence: string;
  explanation: string;
}

export interface ScamAnalysisResponse {
  id: string;
  message_preview: string;
  risk_score: number;
  risk_classification: RiskClassification;
  confidence: 'Low' | 'Medium' | 'High';
  summary: string;
  analysis_source: 'ai_llm' | 'rule_based_fallback';
  model_used?: string | null;
  detected_language: string;
  scam_archetype: string;
  tactics: ScamTactic[];
  extracted_indicators: ExtractedIndicator[];
  recommended_actions: string[];
  limitations: string[];
  disclaimer: string;
  created_at: string;
}

export interface ScamAnalysisSummaryItem {
  id: string;
  message_preview: string;
  risk_classification: RiskClassification;
  risk_score: number;
  confidence: string;
  analysis_source: string;
  scam_archetype: string;
  detected_tactics_count: number;
  summary?: string | null;
  created_at: string;
}

export type ActionTakenType =
  | 'received_only'
  | 'clicked_link'
  | 'entered_password'
  | 'shared_otp'
  | 'made_upi_payment';

export interface ReportingChannel {
  name: string;
  contact: string;
  url: string;
  description: string;
}

export interface SafetyGuidanceResponse {
  action_taken: ActionTakenType;
  action_title: string;
  severity_level: 'low' | 'medium' | 'high' | 'critical';
  urgent_warning?: string | null;
  immediate_steps: string[];
  reporting_channels: ReportingChannel[];
  preventative_measures: string[];
}
