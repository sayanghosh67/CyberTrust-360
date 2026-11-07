import os
import json
import logging
from datetime import datetime, timezone
from typing import Optional, Tuple, Dict, Any, List

from sqlalchemy.orm import Session
from sqlalchemy import select, desc
from web3 import Web3
from eth_account import Account
from urllib.parse import urlsplit

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

def _load_metadata():
    with open(os.path.join(os.path.dirname(__file__), "../blockchain/contract_abi.json"), encoding="utf-8") as f:
        return json.load(f)


def _load_contract_metadata():
    data = _load_metadata()
    return settings.BLOCKCHAIN_CONTRACT_ADDRESS or data.get("contractAddress"), data.get("abi")


def get_web3_client():
    """Fail closed on wrong chain, missing/wrong runtime bytecode or invalid registry."""
    rpc = urlsplit(settings.BLOCKCHAIN_RPC_URL)
    if not settings.BLOCKCHAIN_ENABLED or rpc.scheme not in {"http", "https"} or rpc.hostname not in {"127.0.0.1", "::1", "localhost"} or rpc.username or rpc.password:
        return None, None
    try:
        w3 = Web3(Web3.HTTPProvider(settings.BLOCKCHAIN_RPC_URL, request_kwargs={"timeout": settings.BLOCKCHAIN_TIMEOUT}))
        if not w3.is_connected() or w3.eth.chain_id != 31337 or settings.BLOCKCHAIN_CHAIN_ID != 31337:
            return None, None
        address, abi = _load_contract_metadata()
        expected = _load_metadata().get("runtimeBytecodeHash")
        code = w3.eth.get_code(Web3.to_checksum_address(address))
        if not expected or not code or Web3.to_hex(Web3.keccak(code)).lower() != expected.lower():
            return None, None
        contract = w3.eth.contract(address=Web3.to_checksum_address(address), abi=abi)
        contract.functions.getTotalReportsCount().call()
        return w3, contract
    except Exception:
        logger.warning("Blockchain identity or connectivity validation failed")
        return None, None


def _checked_receipt(w3, contract, tx_hash, report_id_hash, content_hash, version):
    receipt = w3.eth.get_transaction_receipt(tx_hash)
    if receipt.status != 1 or receipt.to.lower() != contract.address.lower():
        raise ConnectionError("Registration receipt is invalid")
    if w3.eth.get_block(receipt.blockNumber).hash != receipt.blockHash:
        raise ConnectionError("Registration block is no longer canonical")
    events = contract.events.ReportRegistered().process_receipt(receipt)
    if not any(Web3.to_hex(e["args"]["reportIdHash"]) == report_id_hash and
               Web3.to_hex(e["args"]["contentHash"]) == content_hash and
               e["args"]["version"] == version for e in events):
        raise ConnectionError("Registration event does not match the report")
    return receipt


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
        logger.error("Operation failed; sensitive details suppressed")
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


import threading
import fcntl
import tempfile
from functools import wraps
from contextlib import contextmanager

_registration_lock = threading.Lock()

@contextmanager
def _signing_lock():
    # One host's worker processes share the nonce lock. Distributed signers require a queue.
    with _registration_lock:
        path = os.path.join(tempfile.gettempdir(), "cybertrust-registration.lock")
        fd = os.open(path, os.O_CREAT | os.O_RDWR | getattr(os, "O_NOFOLLOW", 0), 0o600)
        with os.fdopen(fd, "w") as handle:
            fcntl.flock(handle, fcntl.LOCK_EX)
            try:
                yield
            finally:
                fcntl.flock(handle, fcntl.LOCK_UN)


def register_report_on_chain(report_id: str, db: Session) -> BlockchainRegistrationResponse:
    with _signing_lock():
        return _register_locked(report_id, db)


def _register_locked(report_id, db):
    record, report_type = find_report_record(report_id, db)
    if record is None:
        raise ValueError("Report not found")
    canonical, rid, digest = generate_report_fingerprint(record, report_type)
    old = db.execute(select(BlockchainRegistrationRecord).where(BlockchainRegistrationRecord.report_id == report_id).order_by(desc(BlockchainRegistrationRecord.report_version))).scalars().first()
    w3, contract = get_web3_client()
    if w3 is None or contract is None:
        raise ConnectionError("Blockchain identity validation or connectivity failed")
    onchain = contract.functions.getReportRecord(bytes.fromhex(rid[2:])).call()
    same = onchain[5] and Web3.to_hex(onchain[0]) == digest and onchain[1] == report_type
    if same and old and old.content_hash == digest and old.report_version == onchain[2] and old.chain_id == w3.eth.chain_id and old.contract_address.lower() == contract.address.lower():
        _checked_receipt(w3, contract, old.transaction_hash, rid, digest, old.report_version)
        return get_registration_by_report_id(report_id, db)
    # Reconcile a mined transaction whose database commit failed, without a duplicate write.
    if same and (old is None or old.report_version < onchain[2]):
        events = contract.events.ReportRegistered().get_logs(from_block=0, to_block="latest", argument_filters={"reportIdHash": bytes.fromhex(rid[2:])})
        event = next((e for e in reversed(events) if e["args"]["version"] == onchain[2] and Web3.to_hex(e["args"]["contentHash"]) == digest), None)
        if event is None:
            raise ConnectionError("Registration reconciliation evidence unavailable")
        version, tx_hash, signer = onchain[2], event["transactionHash"], onchain[4]
    else:
        if not settings.BLOCKCHAIN_SIGNER_PRIVATE_KEY:
            raise ConnectionError("A local registrar signing key must be configured")
        account = Account.from_key(settings.BLOCKCHAIN_SIGNER_PRIVATE_KEY)
        if not (contract.functions.owner().call().lower() == account.address.lower() or contract.functions.authorizedRegistrars(account.address).call()):
            raise ConnectionError("Configured signer is not an authorized registrar")
        version = max(onchain[2], old.report_version if old else 0) + 1
        tx = contract.functions.registerReport(bytes.fromhex(rid[2:]), bytes.fromhex(digest[2:]), report_type, version).build_transaction({"from": account.address, "nonce": w3.eth.get_transaction_count(account.address, "pending"), "chainId": 31337, "gasPrice": w3.eth.gas_price})
        tx["gas"] = int(w3.eth.estimate_gas(tx) * 1.2)
        signed = w3.eth.account.sign_transaction(tx, settings.BLOCKCHAIN_SIGNER_PRIVATE_KEY)
        tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
        w3.eth.wait_for_transaction_receipt(tx_hash, timeout=12)
        signer = account.address
    receipt = _checked_receipt(w3, contract, tx_hash, rid, digest, version)
    registration = BlockchainRegistrationRecord(report_id=report_id, owner_id=record.owner_id, report_type=report_type, report_version=version, canonical_version=CANONICAL_VERSION, hash_algorithm=HASH_ALGORITHM, content_hash=digest, report_id_hash=rid, chain_id=31337, contract_address=contract.address, transaction_hash=Web3.to_hex(tx_hash), block_number=receipt.blockNumber, signer_address=signer, registration_status="confirmed", snapshot_data=canonical, registered_at=datetime.now(timezone.utc))
    try:
        db.add(registration)
        db.commit()
    except Exception:
        db.rollback()
        raise ConnectionError("Transaction mined; registration storage failed. Retry to reconcile.") from None
    return get_registration_by_report_id(report_id, db)


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
        canonical_json, report_id_hash, computed_content_hash = generate_report_fingerprint(report_record, report_type, reg_record.canonical_version if reg_record else CANONICAL_VERSION)

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
        if reg_record.chain_id != w3.eth.chain_id or reg_record.contract_address.lower() != contract.address.lower():
            raise ConnectionError("Stored registration belongs to another chain or contract")
        bytes32_report_id = bytes.fromhex(report_id_hash[2:])
        bytes32_computed_hash = bytes.fromhex(computed_content_hash[2:])

        # Call verifyReportView on smart contract
        is_match, registered_timestamp, registered_by, recorded_hash_bytes, version = (
            contract.functions.verifyReportView(bytes32_report_id, bytes32_computed_hash).call()
        )

        recorded_hash_hex = f"0x{recorded_hash_bytes.hex()}"
        if registered_timestamp == 0:
            return BlockchainVerificationResponse(report_id=report_id, report_type=report_type, verification_status="NOT_REGISTERED", status_label="NOT REGISTERED — CHAIN RECORD ABSENT", is_match=False, computed_content_hash=computed_content_hash, recorded_content_hash=None, report_id_hash=report_id_hash, verified_at=now_iso, tamper_detected=False, explanation="The local chain has no registration; it may have been reset.", disclaimer=BLOCKCHAIN_DISCLAIMER)
        _checked_receipt(w3, contract, reg_record.transaction_hash, report_id_hash, reg_record.content_hash, reg_record.report_version)
        if version != reg_record.report_version or recorded_hash_hex != reg_record.content_hash:
            raise ConnectionError("Registry and database require reconciliation")


        if is_match:
            return BlockchainVerificationResponse(
                report_id=report_id,
                report_type=report_type,
                verification_status="VERIFIED",
                status_label="VERIFIED — REPORT UNCHANGED" if reg_record.canonical_version == CANONICAL_VERSION else "VERIFIED — LEGACY PARTIAL FINGERPRINT",
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
                explanation="The complete saved report matches its local EVM fingerprint." if reg_record.canonical_version == CANONICAL_VERSION else "Legacy v1 protects only selected fields. Re-register to protect the complete analysis.",
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
        logger.error("On-chain verification evidence unavailable")
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
            explanation="Verification evidence is unavailable or inconsistent; retry or reconcile the registration.",
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
        protected["stored_fields"]["risk_score"] = 5
        protected["stored_fields"]["risk_classification"] = "Safe"
        protected["stored_fields"]["summary"] = "[TAMPERED SIMULATION] Threat suppressed by unauthorized modification."
    else:
        protected = extract_scam_report_protected_fields(report_record)
        # Tamper: Artificially suppress risk score
        protected["stored_fields"]["risk_score"] = 0
        protected["stored_fields"]["risk_classification"] = "Safe"
        protected["stored_fields"]["summary"] = "[TAMPERED SIMULATION] Malicious scam indicators scrubbed."

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

