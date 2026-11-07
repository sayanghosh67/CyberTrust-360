import os
import json
import logging
from datetime import datetime, timezone
from typing import Optional, Tuple, Dict, Any, List

from sqlalchemy.orm import Session
from sqlalchemy import select, desc
from web3 import Web3
from eth_account import Account

from backend.app.core.config import settings
from backend.app.models.scan import ScanRecord
from backend.app.models.scam import ScamAnalysisRecord
from backend.app.models.blockchain import BlockchainRegistrationRecord
from backend.app.schemas.blockchain import (
    BlockchainStatusResponse,
    BlockchainRegistrationResponse,
    BlockchainVerificationResponse,
    BlockchainRegistrationSummary,
    BLOCKCHAIN_DISCLAIMER,
)
from backend.app.services.canonical_hasher import (
    generate_report_fingerprint,
    CANONICAL_VERSION,
    HASH_ALGORITHM,
    compute_sha256_hex,
    compute_report_id_hash,
    extract_url_scan_protected_fields,
    extract_scam_report_protected_fields,
    canonicalize_to_json,
)

logger = logging.getLogger("cybertrust.blockchain_service")

# Cached Contract ABI
_cached_abi: Optional[List[Dict[str, Any]]] = None
_cached_contract_address: Optional[str] = None


def _load_contract_metadata() -> Tuple[Optional[str], Optional[List[Dict[str, Any]]]]:
    global _cached_abi, _cached_contract_address
    if _cached_abi and _cached_contract_address:
        return _cached_contract_address, _cached_abi

    abi_path = os.path.join(os.path.dirname(__file__), "../blockchain/contract_abi.json")
    if os.path.exists(abi_path):
        try:
            with open(abi_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                _cached_contract_address = data.get("contractAddress") or settings.BLOCKCHAIN_CONTRACT_ADDRESS
                _cached_abi = data.get("abi")
                return _cached_contract_address, _cached_abi
        except Exception as e:
            logger.warning(f"Failed to load contract ABI from {abi_path}: {e}")

    return settings.BLOCKCHAIN_CONTRACT_ADDRESS, None


def get_web3_client() -> Tuple[Optional[Web3], Optional[Any]]:
    """Returns initialized Web3 client and contract instance if connected, else (None, None)."""
    if not settings.BLOCKCHAIN_ENABLED:
        return None, None

    try:
        w3 = Web3(Web3.HTTPProvider(settings.BLOCKCHAIN_RPC_URL, request_kwargs={"timeout": settings.BLOCKCHAIN_TIMEOUT}))
        if not w3.is_connected():
            return None, None

        contract_address, abi = _load_contract_metadata()
        if not contract_address or not abi:
            return w3, None

        checksum_address = w3.to_checksum_address(contract_address)
        contract = w3.eth.contract(address=checksum_address, abi=abi)
        return w3, contract
    except Exception as e:
        logger.debug(f"Web3 initialization error: {e}")
        return None, None


# ==============================================================================
# Blockchain Network Status
# ==============================================================================

def get_blockchain_network_status() -> BlockchainStatusResponse:
    contract_address, _ = _load_contract_metadata()
    signer_address = "Not Configured"
    if settings.BLOCKCHAIN_SIGNER_PRIVATE_KEY:
        try:
            account = Account.from_key(settings.BLOCKCHAIN_SIGNER_PRIVATE_KEY)
            signer_address = account.address
        except Exception:
            pass

    w3, contract = get_web3_client()
    if not w3 or not w3.is_connected():
        return BlockchainStatusResponse(
            connected=False,
            network_name="Hardhat Local EVM (Disconnected)",
            chain_id=settings.BLOCKCHAIN_CHAIN_ID,
            latest_block=0,
            contract_address=contract_address or settings.BLOCKCHAIN_CONTRACT_ADDRESS,
            signer_address=signer_address,
            environment="local_hardhat",
            total_registered_reports=0,
            disclaimer=BLOCKCHAIN_DISCLAIMER,
        )

    try:
        latest_block = w3.eth.block_number
        total_reports = 0
        if contract:
            try:
                total_reports = contract.functions.getTotalReportsCount().call()
            except Exception:
                pass

        return BlockchainStatusResponse(
            connected=True,
            network_name="Hardhat Local EVM (Chain ID 31337)",
            chain_id=w3.eth.chain_id,
            latest_block=latest_block,
            contract_address=contract_address or settings.BLOCKCHAIN_CONTRACT_ADDRESS,
            signer_address=signer_address,
            environment="local_hardhat",
            total_registered_reports=total_reports,
            disclaimer=BLOCKCHAIN_DISCLAIMER,
        )
    except Exception as e:
        logger.error(f"Error querying network status: {e}")
        return BlockchainStatusResponse(
            connected=False,
            network_name="Hardhat Local EVM (Error)",
            chain_id=settings.BLOCKCHAIN_CHAIN_ID,
            latest_block=0,
            contract_address=contract_address or settings.BLOCKCHAIN_CONTRACT_ADDRESS,
            signer_address=signer_address,
            environment="local_hardhat",
            total_registered_reports=0,
            disclaimer=BLOCKCHAIN_DISCLAIMER,
        )


# ==============================================================================
# Report Registration
# ==============================================================================

def find_report_record(report_id: str, db: Session) -> Tuple[Optional[Any], Optional[str]]:
    """Locates a report in ScanRecord or ScamAnalysisRecord."""
    # Check ScanRecord first
    scan = db.execute(select(ScanRecord).where(ScanRecord.id == report_id)).scalar_one_or_none()
    if scan:
        return scan, "url_scan"

    # Check ScamAnalysisRecord
    scam = db.execute(select(ScamAnalysisRecord).where(ScamAnalysisRecord.id == report_id)).scalar_one_or_none()
    if scam:
        return scam, "scam_report"

    return None, None


def register_report_on_chain(report_id: str, db: Session) -> BlockchainRegistrationResponse:
    report_record, report_type = find_report_record(report_id, db)
    if not report_record or not report_type:
        raise ValueError(f"Report '{report_id}' not found in investigation repository.")

    # Check if already registered in off-chain database
    existing_reg = db.execute(
        select(BlockchainRegistrationRecord)
        .where(BlockchainRegistrationRecord.report_id == report_id)
        .order_by(desc(BlockchainRegistrationRecord.report_version))
    ).scalars().first()

    canonical_json, report_id_hash, content_hash = generate_report_fingerprint(report_record, report_type)

    if existing_reg and existing_reg.content_hash == content_hash and existing_reg.registration_status == "confirmed":
        logger.info(f"Report {report_id} already registered on blockchain with matching hash.")
        return BlockchainRegistrationResponse(
            registration_id=existing_reg.id,
            report_id=existing_reg.report_id,
            report_type=existing_reg.report_type,
            report_version=existing_reg.report_version,
            canonical_version=existing_reg.canonical_version,
            hash_algorithm=existing_reg.hash_algorithm,
            content_hash=existing_reg.content_hash,
            report_id_hash=existing_reg.report_id_hash,
            chain_id=existing_reg.chain_id,
            contract_address=existing_reg.contract_address,
            transaction_hash=existing_reg.transaction_hash,
            block_number=existing_reg.block_number,
            signer_address=existing_reg.signer_address,
            registered_at=existing_reg.registered_at.isoformat(),
            registration_status=existing_reg.registration_status,
            disclaimer=BLOCKCHAIN_DISCLAIMER,
        )

    # Prepare next version number
    next_version = (existing_reg.report_version + 1) if existing_reg else 1

    # Connect to EVM
    w3, contract = get_web3_client()
    if not w3 or not w3.is_connected() or not contract:
        raise ConnectionError("Blockchain RPC network or smart contract is unavailable.")

    if not settings.BLOCKCHAIN_SIGNER_PRIVATE_KEY:
        raise ValueError("Backend signing private key is not configured.")

    account = Account.from_key(settings.BLOCKCHAIN_SIGNER_PRIVATE_KEY)

    # Convert 0x hex strings to bytes32 for Solidity
    bytes32_report_id = bytes.fromhex(report_id_hash[2:])
    bytes32_content_hash = bytes.fromhex(content_hash[2:])

    # Build transaction
    nonce = w3.eth.get_transaction_count(account.address, "pending")
    gas_price = w3.eth.gas_price

    tx_data = contract.functions.registerReport(
        bytes32_report_id,
        bytes32_content_hash,
        report_type,
        next_version,
    ).build_transaction({
        "from": account.address,
        "nonce": nonce,
        "gasPrice": gas_price,
        "chainId": w3.eth.chain_id,
    })

    # Estimate gas with safe buffer
    try:
        estimated_gas = w3.eth.estimate_gas(tx_data)
        tx_data["gas"] = int(estimated_gas * 1.2)
    except Exception as e:
        logger.warning(f"Gas estimation failed, using fallback: {e}")
        tx_data["gas"] = 200000

    # Sign & Send
    signed_tx = w3.eth.account.sign_transaction(tx_data, private_key=settings.BLOCKCHAIN_SIGNER_PRIVATE_KEY)
    tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)

    # Wait for confirmation receipt
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=12)
    if receipt.status != 1:
        raise RuntimeError(f"Blockchain transaction failed with status {receipt.status}. TxHash: {tx_hash.hex()}")

    contract_address, _ = _load_contract_metadata()

    # Persist registration record
    new_reg = BlockchainRegistrationRecord(
        report_id=report_id,
        report_type=report_type,
        report_version=next_version,
        canonical_version=CANONICAL_VERSION,
        hash_algorithm=HASH_ALGORITHM,
        content_hash=content_hash,
        report_id_hash=report_id_hash,
        chain_id=w3.eth.chain_id,
        contract_address=contract_address or settings.BLOCKCHAIN_CONTRACT_ADDRESS,
        transaction_hash=f"0x{tx_hash.hex()}" if not tx_hash.hex().startswith("0x") else tx_hash.hex(),
        block_number=receipt.blockNumber,
        signer_address=account.address,
        registration_status="confirmed",
        snapshot_data=canonical_json,
        registered_at=datetime.now(timezone.utc),
    )

    db.add(new_reg)
    db.commit()
    db.refresh(new_reg)

    logger.info(f"Report {report_id} registered successfully on blockchain! Block #{receipt.blockNumber}, Tx: {new_reg.transaction_hash}")

    return BlockchainRegistrationResponse(
        registration_id=new_reg.id,
        report_id=new_reg.report_id,
        report_type=new_reg.report_type,
        report_version=new_reg.report_version,
        canonical_version=new_reg.canonical_version,
        hash_algorithm=new_reg.hash_algorithm,
        content_hash=new_reg.content_hash,
        report_id_hash=new_reg.report_id_hash,
        chain_id=new_reg.chain_id,
        contract_address=new_reg.contract_address,
        transaction_hash=new_reg.transaction_hash,
        block_number=new_reg.block_number,
        signer_address=new_reg.signer_address,
        registered_at=new_reg.registered_at.isoformat(),
        registration_status=new_reg.registration_status,
        disclaimer=BLOCKCHAIN_DISCLAIMER,
    )


# ==============================================================================
# Report Verification
# ==============================================================================

def verify_report_integrity(
    report_id: str,
    db: Session,
    tampered_override: Optional[Dict[str, Any]] = None,
) -> BlockchainVerificationResponse:
    now_iso = datetime.now(timezone.utc).isoformat()

    report_record, report_type = find_report_record(report_id, db)
    if not report_record or not report_type:
        report_id_hash = compute_report_id_hash(report_id)
        return BlockchainVerificationResponse(
            report_id=report_id,
            report_type="unknown",
            verification_status="NOT_REGISTERED",
            status_label="NOT REGISTERED — NO RECORD FOUND",
            is_match=False,
            computed_content_hash="",
            recorded_content_hash=None,
            report_id_hash=report_id_hash,
            verified_at=now_iso,
            tamper_detected=False,
            explanation=f"Report '{report_id}' does not exist in the investigation repository.",
            disclaimer=BLOCKCHAIN_DISCLAIMER,
        )

    # 1. Look up off-chain registration record
    reg_record = db.execute(
        select(BlockchainRegistrationRecord)
        .where(BlockchainRegistrationRecord.report_id == report_id)
        .order_by(desc(BlockchainRegistrationRecord.report_version))
    ).scalars().first()

    # Compute current protected fields fingerprint
    if tampered_override:
        # Controlled hackathon demonstration tamper scenario
        canonical_json = canonicalize_to_json(tampered_override)
        computed_content_hash = compute_sha256_hex(canonical_json)
        report_id_hash = compute_report_id_hash(report_id)
    else:
        canonical_json, report_id_hash, computed_content_hash = generate_report_fingerprint(report_record, report_type)

    if not reg_record:
        return BlockchainVerificationResponse(
            report_id=report_id,
            report_type=report_type,
            verification_status="NOT_REGISTERED",
            status_label="NOT REGISTERED — NO ON-CHAIN RECORD",
            is_match=False,
            computed_content_hash=computed_content_hash,
            recorded_content_hash=None,
            report_id_hash=report_id_hash,
            verified_at=now_iso,
            tamper_detected=False,
            explanation="No blockchain registration exists for this report. Register it first to establish cryptographic provenance.",
            disclaimer=BLOCKCHAIN_DISCLAIMER,
        )

    # 2. Query Smart Contract On-Chain
    w3, contract = get_web3_client()
    if not w3 or not w3.is_connected() or not contract:
        return BlockchainVerificationResponse(
            report_id=report_id,
            report_type=report_type,
            verification_status="VERIFICATION_UNAVAILABLE",
            status_label="VERIFICATION UNAVAILABLE — RPC OFFLINE",
            is_match=False,
            computed_content_hash=computed_content_hash,
            recorded_content_hash=reg_record.content_hash,
            report_id_hash=report_id_hash,
            transaction_hash=reg_record.transaction_hash,
            block_number=reg_record.block_number,
            contract_address=reg_record.contract_address,
            chain_id=reg_record.chain_id,
            registered_at=reg_record.registered_at.isoformat(),
            verified_at=now_iso,
            tamper_detected=False,
            explanation="The blockchain network RPC is currently unreachable. Cannot verify on-chain state without live EVM connectivity.",
            disclaimer=BLOCKCHAIN_DISCLAIMER,
        )

    try:
        bytes32_report_id = bytes.fromhex(report_id_hash[2:])
        bytes32_computed_hash = bytes.fromhex(computed_content_hash[2:])

        # Call verifyReportView on smart contract
        is_match, registered_timestamp, registered_by, recorded_hash_bytes, version = (
            contract.functions.verifyReportView(bytes32_report_id, bytes32_computed_hash).call()
        )

        recorded_hash_hex = f"0x{recorded_hash_bytes.hex()}"

        if is_match:
            return BlockchainVerificationResponse(
                report_id=report_id,
                report_type=report_type,
                verification_status="VERIFIED",
                status_label="VERIFIED — REPORT UNCHANGED",
                is_match=True,
                computed_content_hash=computed_content_hash,
                recorded_content_hash=recorded_hash_hex,
                report_id_hash=report_id_hash,
                transaction_hash=reg_record.transaction_hash,
                block_number=reg_record.block_number,
                contract_address=reg_record.contract_address,
                chain_id=reg_record.chain_id,
                registered_at=reg_record.registered_at.isoformat(),
                verified_at=now_iso,
                tamper_detected=False,
                explanation="Cryptographic fingerprint strictly matches the immutable blockchain registry. Zero modifications detected in protected threat indicators, risk scoring, or verdicts.",
                disclaimer=BLOCKCHAIN_DISCLAIMER,
            )
        else:
            return BlockchainVerificationResponse(
                report_id=report_id,
                report_type=report_type,
                verification_status="MISMATCH",
                status_label="MISMATCH — REPORT MODIFIED",
                is_match=False,
                computed_content_hash=computed_content_hash,
                recorded_content_hash=recorded_hash_hex,
                report_id_hash=report_id_hash,
                transaction_hash=reg_record.transaction_hash,
                block_number=reg_record.block_number,
                contract_address=reg_record.contract_address,
                chain_id=reg_record.chain_id,
                registered_at=reg_record.registered_at.isoformat(),
                verified_at=now_iso,
                tamper_detected=True,
                explanation="SECURITY ALERT: Current report content produces a different cryptographic digest than what was committed to the blockchain. Protected threat data has been altered after registration.",
                disclaimer=BLOCKCHAIN_DISCLAIMER,
            )
    except Exception as e:
        logger.error(f"On-chain verification query failed: {e}")
        return BlockchainVerificationResponse(
            report_id=report_id,
            report_type=report_type,
            verification_status="ERROR",
            status_label="ERROR — VERIFICATION FAILED",
            is_match=False,
            computed_content_hash=computed_content_hash,
            recorded_content_hash=reg_record.content_hash,
            report_id_hash=report_id_hash,
            transaction_hash=reg_record.transaction_hash,
            block_number=reg_record.block_number,
            contract_address=reg_record.contract_address,
            chain_id=reg_record.chain_id,
            registered_at=reg_record.registered_at.isoformat(),
            verified_at=now_iso,
            tamper_detected=False,
            explanation=f"Smart contract interaction encountered an error: {str(e)}",
            disclaimer=BLOCKCHAIN_DISCLAIMER,
        )


# ==============================================================================
# Controlled Demonstration Tamper Scenario
# ==============================================================================

def demonstrate_tamper_detection(report_id: str, db: Session) -> BlockchainVerificationResponse:
    """
    Executes Scenario B of the Hackathon demonstration.
    Creates a simulated in-memory altered version of the report (e.g. lowering risk_score to 5
    and altering risk_classification to Safe) and verifies it against the smart contract.
    Never corrupts the persistent database record.
    """
    report_record, report_type = find_report_record(report_id, db)
    if not report_record or not report_type:
        raise ValueError(f"Report '{report_id}' not found.")

    # Extract clean protected fields
    if report_type == "url_scan":
        protected = extract_url_scan_protected_fields(report_record)
        # Tamper: Artificially suppress risk score and flip classification
        protected["risk_score"] = 5
        protected["risk_classification"] = "Safe"
        protected["summary"] = "[TAMPERED SIMULATION] Threat suppressed by unauthorized modification."
    else:
        protected = extract_scam_report_protected_fields(report_record)
        # Tamper: Artificially suppress risk score
        protected["risk_score"] = 0
        protected["risk_classification"] = "Safe"
        protected["summary"] = "[TAMPERED SIMULATION] Malicious scam indicators scrubbed."

    return verify_report_integrity(report_id, db, tampered_override=protected)


# ==============================================================================
# Registration Listings & Lookups
# ==============================================================================

def list_blockchain_registrations(db: Session, limit: int = 50) -> List[BlockchainRegistrationSummary]:
    records = db.execute(
        select(BlockchainRegistrationRecord)
        .order_by(desc(BlockchainRegistrationRecord.registered_at))
        .limit(limit)
    ).scalars().all()

    return [
        BlockchainRegistrationSummary(
            id=r.id,
            report_id=r.report_id,
            report_type=r.report_type,
            report_version=r.report_version,
            content_hash=r.content_hash,
            chain_id=r.chain_id,
            contract_address=r.contract_address,
            transaction_hash=r.transaction_hash,
            block_number=r.block_number,
            signer_address=r.signer_address,
            registration_status=r.registration_status,
            registered_at=r.registered_at.isoformat(),
        )
        for r in records
    ]


def get_registration_by_report_id(report_id: str, db: Session) -> Optional[BlockchainRegistrationResponse]:
    rec = db.execute(
        select(BlockchainRegistrationRecord)
        .where(BlockchainRegistrationRecord.report_id == report_id)
        .order_by(desc(BlockchainRegistrationRecord.report_version))
    ).scalars().first()

    if not rec:
        return None

    return BlockchainRegistrationResponse(
        registration_id=rec.id,
        report_id=rec.report_id,
        report_type=rec.report_type,
        report_version=rec.report_version,
        canonical_version=rec.canonical_version,
        hash_algorithm=rec.hash_algorithm,
        content_hash=rec.content_hash,
        report_id_hash=rec.report_id_hash,
        chain_id=rec.chain_id,
        contract_address=rec.contract_address,
        transaction_hash=rec.transaction_hash,
        block_number=rec.block_number,
        signer_address=rec.signer_address,
        registered_at=rec.registered_at.isoformat(),
        registration_status=rec.registration_status,
        disclaimer=BLOCKCHAIN_DISCLAIMER,
    )
