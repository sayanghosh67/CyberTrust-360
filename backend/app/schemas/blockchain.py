from typing import Optional, List
from pydantic import BaseModel, Field

BLOCKCHAIN_DISCLAIMER = (
    "Blockchain verification confirms that the current report matches the cryptographic fingerprint "
    "recorded on-chain at registration time. It does not independently prove that the original threat classification is correct."
)


class BlockchainStatusResponse(BaseModel):
    connected: bool
    network_name: str = Field(..., description="EVM network identifier")
    chain_id: int
    latest_block: int
    contract_address: str
    signer_address: str
    environment: str = Field(default="local_hardhat")
    total_registered_reports: int = 0
    disclaimer: str = Field(default=BLOCKCHAIN_DISCLAIMER)


class BlockchainRegistrationResponse(BaseModel):
    registration_id: str
    report_id: str
    report_type: str
    report_version: int = 1
    canonical_version: str = "v1"
    hash_algorithm: str = "sha256"
    content_hash: str
    report_id_hash: str
    chain_id: int
    contract_address: str
    transaction_hash: str
    block_number: int
    signer_address: str
    registered_at: str
    registration_status: str
    disclaimer: str = Field(default=BLOCKCHAIN_DISCLAIMER)


class BlockchainVerificationResponse(BaseModel):
    report_id: str
    report_type: str
    verification_status: str  # "VERIFIED" | "MISMATCH" | "NOT_REGISTERED" | "PENDING" | "VERIFICATION_UNAVAILABLE" | "ERROR"
    status_label: str  # e.g., "VERIFIED — REPORT UNCHANGED"
    is_match: bool
    computed_content_hash: str
    recorded_content_hash: Optional[str] = None
    report_id_hash: str
    transaction_hash: Optional[str] = None
    block_number: Optional[int] = None
    contract_address: Optional[str] = None
    chain_id: Optional[int] = None
    registered_at: Optional[str] = None
    verified_at: str
    tamper_detected: bool = False
    explanation: str
    disclaimer: str = Field(default=BLOCKCHAIN_DISCLAIMER)


class BlockchainRegistrationSummary(BaseModel):
    id: str
    report_id: str
    report_type: str
    report_version: int
    content_hash: str
    chain_id: int
    contract_address: str
    transaction_hash: str
    block_number: int
    signer_address: str
    registration_status: str
    registered_at: str


class BlockchainRegistrationListResponse(BaseModel):
    registrations: List[BlockchainRegistrationSummary]
    total_count: int
