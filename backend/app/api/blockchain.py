import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.schemas.blockchain import (
    BlockchainStatusResponse,
    BlockchainRegistrationResponse,
    BlockchainVerificationResponse,
    BlockchainRegistrationListResponse,
)
from backend.app.services.blockchain_service import (
    get_blockchain_network_status,
    register_report_on_chain,
    verify_report_integrity,
    list_blockchain_registrations,
    get_registration_by_report_id,
    demonstrate_tamper_detection,
)

logger = logging.getLogger("cybertrust.blockchain_api")

router = APIRouter(prefix="/v1/blockchain", tags=["Blockchain Threat Report Integrity"])


@router.get(
    "/status",
    response_model=BlockchainStatusResponse,
    status_code=status.HTTP_200_OK,
    summary="EVM Blockchain Network Status",
    description="Returns live connection state, chain ID, block height, contract address, and signer address.",
)
def get_status() -> BlockchainStatusResponse:
    return get_blockchain_network_status()


@router.post(
    "/register/{report_id}",
    response_model=BlockchainRegistrationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register Report Fingerprint On-Chain",
    description=(
        "Computes deterministic canonical SHA-256 fingerprint of the report and commits it to the "
        "deployed CyberTrustReportRegistry smart contract. Returns immutable transaction receipt."
    ),
)
def register_report(
    report_id: str,
    db: Session = Depends(get_db),
) -> BlockchainRegistrationResponse:
    try:
        return register_report_on_chain(report_id=report_id, db=db)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ConnectionError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Blockchain network unavailable: {str(e)}",
        )
    except Exception as e:
        logger.error(f"Error registering report on blockchain: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Blockchain registration failed: {str(e)}",
        )


@router.get(
    "/verify/{report_id}",
    response_model=BlockchainVerificationResponse,
    status_code=status.HTTP_200_OK,
    summary="Verify Report Integrity Against Blockchain",
    description=(
        "Recomputes current report fingerprint and compares it directly with the on-chain recorded digest. "
        "Returns VERIFIED if unchanged, MISMATCH if tampered, or NOT_REGISTERED."
    ),
)
def verify_report(
    report_id: str,
    db: Session = Depends(get_db),
) -> BlockchainVerificationResponse:
    try:
        return verify_report_integrity(report_id=report_id, db=db)
    except Exception as e:
        logger.error(f"Error verifying report against blockchain: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Verification query failed: {str(e)}",
        )


@router.post(
    "/demo/tamper/{report_id}",
    response_model=BlockchainVerificationResponse,
    status_code=status.HTTP_200_OK,
    summary="Controlled Hackathon Demonstration — Tamper Detection",
    description=(
        "Demonstrates Scenario B for hackathon judges. Simulates an unauthorized alteration of a registered "
        "report's protected fields in-memory and executes the verification against the smart contract. "
        "Demonstrates tamper detection without corrupting database records."
    ),
)
def demo_tamper_detection(
    report_id: str,
    db: Session = Depends(get_db),
) -> BlockchainVerificationResponse:
    try:
        return demonstrate_tamper_detection(report_id=report_id, db=db)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        logger.error(f"Error executing tamper demonstration: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Tamper demonstration failed: {str(e)}",
        )


@router.get(
    "/registrations",
    response_model=BlockchainRegistrationListResponse,
    status_code=status.HTTP_200_OK,
    summary="List Registered Reports",
    description="Returns list of previously registered reports with transaction hashes and block numbers.",
)
def list_registrations(
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
) -> BlockchainRegistrationListResponse:
    items = list_blockchain_registrations(db=db, limit=limit)
    return BlockchainRegistrationListResponse(
        registrations=items,
        total_count=len(items),
    )


@router.get(
    "/registrations/{report_id}",
    response_model=BlockchainRegistrationResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Report Registration Record",
    description="Retrieves existing blockchain registration metadata for a specific report ID.",
)
def get_registration(
    report_id: str,
    db: Session = Depends(get_db),
) -> BlockchainRegistrationResponse:
    record = get_registration_by_report_id(report_id=report_id, db=db)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No blockchain registration found for report '{report_id}'.",
        )
    return record

