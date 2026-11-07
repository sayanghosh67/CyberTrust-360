from datetime import datetime
from pydantic import BaseModel, Field


class DashboardMetricsResponse(BaseModel):
    total_url_investigations: int = Field(..., description="Total URL threat investigation reports in database")
    total_scam_analyses: int = Field(..., description="Total Scam DNA message analyses in database")
    high_risk_reports: int = Field(..., description="Total high-risk or confirmed malicious investigations")
    related_threat_indicators: int = Field(..., description="Distinct indicators in the latest 100 URL and 100 scam records; excludes graph fixtures")
    blockchain_registered_reports: int = Field(..., description="Distinct reports with saved confirmed registrations; live verification is separate")
    timestamp: datetime = Field(..., description="Timestamp of metrics generation")

