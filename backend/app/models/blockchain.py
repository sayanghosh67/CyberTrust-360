import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Integer, DateTime, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from backend.app.models.base import Base


class BlockchainRegistrationRecord(Base):
    __tablename__ = "blockchain_registration_records"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    report_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    report_type: Mapped[str] = mapped_column(String(32), nullable=False)  # "url_scan" | "scam_report"
    report_version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    canonical_version: Mapped[str] = mapped_column(String(16), nullable=False, default="v1")
    hash_algorithm: Mapped[str] = mapped_column(String(16), nullable=False, default="sha256")

    # Cryptographic commitments (0x-prefixed hex)
    content_hash: Mapped[str] = mapped_column(String(66), nullable=False, index=True)
    report_id_hash: Mapped[str] = mapped_column(String(66), nullable=False, index=True)

    # Blockchain Metadata
    chain_id: Mapped[int] = mapped_column(Integer, nullable=False, default=31337)
    contract_address: Mapped[str] = mapped_column(String(42), nullable=False)
    transaction_hash: Mapped[str] = mapped_column(String(66), nullable=False, unique=True, index=True)
    block_number: Mapped[int] = mapped_column(Integer, nullable=False)
    signer_address: Mapped[str] = mapped_column(String(42), nullable=False)
    registration_status: Mapped[str] = mapped_column(String(20), nullable=False, default="confirmed")

    # Snapshot of protected canonical fields at registration time
    snapshot_data: Mapped[str] = mapped_column(Text, nullable=False)

    registered_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    __table_args__ = (
        UniqueConstraint("report_id", "report_version", name="uq_report_version"),
    )

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "report_id": self.report_id,
            "report_type": self.report_type,
            "report_version": self.report_version,
            "canonical_version": self.canonical_version,
            "hash_algorithm": self.hash_algorithm,
            "content_hash": self.content_hash,
            "report_id_hash": self.report_id_hash,
            "chain_id": self.chain_id,
            "contract_address": self.contract_address,
            "transaction_hash": self.transaction_hash,
            "block_number": self.block_number,
            "signer_address": self.signer_address,
            "registration_status": self.registration_status,
            "registered_at": self.registered_at.isoformat(),
        }
