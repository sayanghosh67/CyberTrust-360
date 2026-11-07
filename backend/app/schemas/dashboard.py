from datetime import datetime
from pydantic import BaseModel, Field


class DashboardMetricsResponse(BaseModel):
    total_url_investigations: int = Field(..., description="Total URL threat investigation reports in database")
    total_scam_analyses: int = Field(..., description="Total Scam DNA message analyses in database")
    high_risk_reports: int = Field(..., description="Total high-risk or confirmed malicious investigations")
    related_threat_indicators: int = Field(..., description="Total tracked cross-report threat indicators")
    blockchain_registered_reports: int = Field(..., description="Total immutable on-chain attestations")
    timestamp: datetime = Field(..., description="Timestamp of metrics generation")
