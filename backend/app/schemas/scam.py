from typing import List, Optional, Literal, Dict, Any
from pydantic import BaseModel, Field, field_validator


class ScamAnalyzeRequest(BaseModel):
    message: str = Field(
        ...,
        min_length=5,
        max_length=5000,
        description="The suspicious SMS, WhatsApp, email, job offer, or payment request text to analyze.",
        examples=[
            "Dear SBI user, your YONO account is blocked today due to pending PAN KYC. Update immediately at https://bit.ly/sbi-pan-kyc",
            "Congratulations! You won ₹25,000 cash prize. Click here to approve UPI collect request and enter your PIN to receive money.",
        ]
    )
    context: Optional[str] = Field(
        default="sms",
        description="Context medium of the message."
    )

    @field_validator("context", mode="before")
    @classmethod
    def normalize_context(cls, v: Any) -> str:
        if not v or not isinstance(v, str):
            return "sms"
        v_clean = v.strip().lower().replace(" ", "_").replace("-", "_")
        allowed = {"sms", "whatsapp", "email", "job_offer", "payment_request", "other"}
        return v_clean if v_clean in allowed else "other"


class ExtractedIndicator(BaseModel):
    type: Literal["url", "domain", "phone", "email", "upi_id", "brand", "currency_amount", "suspicious_app"]
    value: str
    context_snippet: str = ""


class ScamTactic(BaseModel):
    id: str
    category: Literal[
        "urgency_threat",
        "financial_fraud",
        "credential_harvesting",
        "impersonation",
        "fake_reward",
        "social_engineering",
        "job_scam"
    ]
    name: str
    severity: Literal["info", "low", "medium", "high", "critical"]
    evidence: str
    explanation: str


class ScamAnalysisResponse(BaseModel):
    id: str
    message_preview: str
    risk_score: int = Field(..., ge=0, le=100)
    risk_classification: Literal[
        "Low Risk", "Suspicious", "High Risk", "Confirmed Malicious", "Inconclusive"
    ]
    confidence: Literal["Low", "Medium", "High"]
    summary: str
    analysis_source: Literal["ai_llm", "rule_based_fallback"]
    model_used: Optional[str] = None
    detected_language: str = "en"
    scam_archetype: str
    tactics: List[ScamTactic] = Field(default_factory=list)
    extracted_indicators: List[ExtractedIndicator] = Field(default_factory=list)
    recommended_actions: List[str] = Field(default_factory=list)
    limitations: List[str] = Field(default_factory=list)
    disclaimer: str = (
        "A Low Risk result does not guarantee that a message is authentic or safe. "
        "Absence of known scam patterns is not proof of legitimacy. Always verify directly through official channels."
    )
    created_at: str


class ScamAnalysisSummaryItem(BaseModel):
    id: str
    message_preview: str
    risk_classification: str
    risk_score: int
    confidence: str
    analysis_source: str
    scam_archetype: str
    detected_tactics_count: int
    summary: Optional[str] = None
    created_at: str


class SafetyGuidanceRequest(BaseModel):
    action_taken: Literal[
        "received_only",
        "clicked_link",
        "entered_password",
        "shared_otp",
        "made_upi_payment"
    ]
    scam_type: Optional[str] = None
    involves_indian_payment: bool = True


class SafetyGuidanceResponse(BaseModel):
    action_taken: str
    action_title: str
    severity_level: Literal["low", "medium", "high", "critical"]
    urgent_warning: Optional[str] = None
    immediate_steps: List[str]
    reporting_channels: List[Dict[str, str]]
    preventative_measures: List[str]
