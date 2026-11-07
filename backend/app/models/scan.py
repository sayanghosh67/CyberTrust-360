import uuid
import json
from datetime import datetime, timezone
from sqlalchemy import String, Integer, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column
from backend.app.models.base import Base


class ScanRecord(Base):
    __tablename__ = "scan_records"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    url: Mapped[str] = mapped_column(String(2048), nullable=False, index=True)
    hostname: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    registered_domain: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    ip_address: Mapped[str] = mapped_column(String(100), nullable=True)

    risk_classification: Mapped[str] = mapped_column(
        String(50), nullable=False, default="Inconclusive"
    )
    risk_score: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    confidence: Mapped[str] = mapped_column(String(20), nullable=False, default="Medium")
    summary: Mapped[str] = mapped_column(Text, nullable=True)

    # Full technical details stored as JSON string
    report_data: Mapped[str] = mapped_column(Text, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    def to_summary_dict(self) -> dict:
        return {
            "id": self.id,
            "url": self.url,
            "hostname": self.hostname,
            "registered_domain": self.registered_domain,
            "ip_address": self.ip_address,
            "risk_classification": self.risk_classification,
            "risk_score": self.risk_score,
            "confidence": self.confidence,
            "summary": self.summary,
            "created_at": self.created_at.isoformat(),
        }

    def to_full_dict(self) -> dict:
        try:
            full_data = json.loads(self.report_data)
        except Exception:
            full_data = {}

        # Merge summary metadata
        full_data["id"] = self.id
        full_data["created_at"] = self.created_at.isoformat()
        full_data["risk_classification"] = self.risk_classification
        full_data["risk_score"] = self.risk_score
        full_data["confidence"] = self.confidence
        return full_data
