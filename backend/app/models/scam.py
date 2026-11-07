import uuid
import json
from datetime import datetime, timezone
from sqlalchemy import String, Integer, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column
from backend.app.models.base import Base


class ScamAnalysisRecord(Base):
    __tablename__ = "scam_analysis_records"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    # Sanitized preview of submitted text to avoid storing unnecessary sensitive data
    message_preview: Mapped[str] = mapped_column(String(255), nullable=False)
    message_hash: Mapped[str] = mapped_column(String(64), nullable=False, index=True)

    risk_classification: Mapped[str] = mapped_column(String(50), nullable=False, default="Inconclusive")
    risk_score: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    confidence: Mapped[str] = mapped_column(String(20), nullable=False, default="Medium")
    analysis_source: Mapped[str] = mapped_column(String(50), nullable=False, default="rule_based_fallback")
    scam_archetype: Mapped[str] = mapped_column(String(100), nullable=False, default="General Analysis")
    detected_tactics_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    detected_language: Mapped[str] = mapped_column(String(20), nullable=False, default="en")
    summary: Mapped[str] = mapped_column(Text, nullable=True)

    # Full structured analysis stored as JSON text
    report_data: Mapped[str] = mapped_column(Text, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    def to_summary_dict(self) -> dict:
        return {
            "id": self.id,
            "message_preview": self.message_preview,
            "risk_classification": self.risk_classification,
            "risk_score": self.risk_score,
            "confidence": self.confidence,
            "analysis_source": self.analysis_source,
            "scam_archetype": self.scam_archetype,
            "detected_tactics_count": self.detected_tactics_count,
            "summary": self.summary,
            "created_at": self.created_at.isoformat(),
        }

    def to_full_dict(self) -> dict:
        try:
            full = json.loads(self.report_data)
        except Exception:
            full = {}
        full["id"] = self.id
        full["created_at"] = self.created_at.isoformat()
        full["risk_classification"] = self.risk_classification
        full["risk_score"] = self.risk_score
        full["confidence"] = self.confidence
        full["analysis_source"] = self.analysis_source
        return full

