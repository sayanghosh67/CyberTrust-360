from datetime import datetime
from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field


class ScanCreateRequest(BaseModel):
    url: str = Field(
        ...,
        min_length=1,
        max_length=2048,
        description="Target URL or domain to investigate (e.g., https://example.com)",
        examples=["https://example.com", "http://suspicious-login-verify.xyz"]
    )


class TyposquatMatch(BaseModel):
    brand: str
    similarity: float
    reason: str


class URLAnalysis(BaseModel):
    original_url: str
    canonical_url: str
    hostname: str
    registered_domain: str
    subdomain: str = ""
    tld: str
    scheme: str
    is_ip_address: bool = False
    is_url_shortener: bool = False
    suspicious_patterns: List[str] = Field(default_factory=list)
    typosquatting_matches: List[TyposquatMatch] = Field(default_factory=list)


class DNSAnalysis(BaseModel):
    status: Literal["resolved", "failed", "unavailable"] = "unavailable"
    a_records: List[str] = Field(default_factory=list)
    aaaa_records: List[str] = Field(default_factory=list)
    mx_records: List[str] = Field(default_factory=list)
    txt_records: List[str] = Field(default_factory=list)
    ns_records: List[str] = Field(default_factory=list)
    error_message: Optional[str] = None


class SSLAnalysis(BaseModel):
    https_available: bool = False
    valid: bool = False
    expired: bool = False
    days_remaining: Optional[int] = None
    issuer: Dict[str, str] = Field(default_factory=dict)
    subject: Dict[str, Any] = Field(default_factory=dict)
    protocol: Optional[str] = None
    cipher: Optional[str] = None
    hostname_mismatch: bool = False
    error_message: Optional[str] = None


class HeadersAnalysis(BaseModel):
    status_code: Optional[int] = None
    hsts_present: bool = False
    csp_present: bool = False
    x_frame_options: Optional[str] = None
    x_content_type_options: Optional[str] = None
    referrer_policy: Optional[str] = None
    permissions_policy: Optional[str] = None
    server: Optional[str] = None
    redirect_count: int = 0
    redirect_chain: List[str] = Field(default_factory=list)
    is_http_to_https_redirect: bool = False
    suspicious_redirect: bool = False
    cross_domain_redirect: bool = False
    https_downgrade: bool = False
    blocked_redirect: bool = False
    redirect_notes: List[str] = Field(default_factory=list)
    missing_headers: List[str] = Field(default_factory=list)
    error_message: Optional[str] = None


class ThreatIntelSource(BaseModel):
    provider: str
    status: Literal["clean", "malicious", "suspicious", "not_configured", "unavailable"]
    details: Optional[str] = None
    reference_url: Optional[str] = None


class DetectedIndicator(BaseModel):
    name: str
    category: Literal["url", "dns", "ssl", "headers", "threat_intel"]
    severity: Literal["info", "low", "medium", "high", "critical"]
    description: str
    technical_evidence: str


class ScanSummaryItem(BaseModel):
    id: str
    url: str
    hostname: str
    registered_domain: str
    ip_address: Optional[str] = None
    risk_classification: str
    risk_score: int
    confidence: str
    summary: Optional[str] = None
    created_at: str


class ScanResponse(BaseModel):
    id: str
    url: str
    hostname: str
    registered_domain: str
    created_at: str
    risk_classification: Literal[
        "Low Risk", "Suspicious", "High Risk", "Confirmed Malicious", "Inconclusive"
    ]
    risk_score: int = Field(..., ge=0, le=100, description="Risk score from 0 to 100")
    confidence: Literal["Low", "Medium", "High"]
    summary: str
    recommended_actions: List[str]
    disclaimer: str = (
        "A Low Risk result does not guarantee that a website is safe. "
        "Absence of known threats is not proof of safety."
    )
    url_analysis: URLAnalysis
    dns_analysis: DNSAnalysis
    ssl_analysis: SSLAnalysis
    headers_analysis: HeadersAnalysis
    threat_intel: List[ThreatIntelSource]
    indicators: List[DetectedIndicator]
    failed_checks: List[str] = Field(default_factory=list)
