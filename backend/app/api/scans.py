import json
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select, desc

from backend.app.core.database import get_db
from backend.app.models.scan import ScanRecord
from backend.app.schemas.scan import (
    ScanCreateRequest,
    ScanResponse,
    ScanSummaryItem,
)
from backend.app.services.investigation_orchestrator import conduct_investigation
from backend.app.utils.security import SecurityValidationError

router = APIRouter(prefix="/v1/scans", tags=["Scans & Investigation"])


@router.post(
    "",
    response_model=ScanResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit URL for Threat Investigation",
    description="Performs non-invasive, multi-vector cybersecurity inspection across URL patterns, DNS records, SSL/TLS, headers, and threat feeds.",
)
async def create_scan(
    payload: ScanCreateRequest,
    db: Session = Depends(get_db),
) -> ScanResponse:
    target_url = payload.url.strip()
    if not target_url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="URL parameter cannot be empty.",
        )

    try:
        report = await conduct_investigation(target_url, db)
        return report
    except SecurityValidationError as sec_err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(sec_err),
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Investigation engine encountered an unhandled error: {str(exc)}",
        )


@router.get(
    "",
    response_model=List[ScanSummaryItem],
    summary="Retrieve Recent Scan History",
    description="Returns the most recent investigation records for dashboard historical review.",
)
def list_scans(
    limit: int = 20,
    db: Session = Depends(get_db),
) -> List[ScanSummaryItem]:
    try:
        stmt = select(ScanRecord).order_by(desc(ScanRecord.created_at)).limit(min(limit, 50))
        results = db.scalars(stmt).all()
        return [
            ScanSummaryItem(
                id=r.id,
                url=r.url,
                hostname=r.hostname,
                registered_domain=r.registered_domain,
                ip_address=r.ip_address,
                risk_classification=r.risk_classification,
                risk_score=r.risk_score,
                confidence=r.confidence,
                summary=r.summary,
                created_at=r.created_at.isoformat(),
            )
            for r in results
        ]
    except Exception:
        return []


@router.get(
    "/{scan_id}",
    response_model=ScanResponse,
    summary="Retrieve Detailed Investigation Report",
    description="Fetches full technical telemetry for an existing scan report by unique ID.",
)
def get_scan(
    scan_id: str,
    db: Session = Depends(get_db),
) -> ScanResponse:
    stmt = select(ScanRecord).where(ScanRecord.id == scan_id)
    record = db.scalars(stmt).first()
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Investigation report with ID '{scan_id}' was not found.",
        )

    try:
        data = json.loads(record.report_data)
        return ScanResponse(**data)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to parse report telemetry: {str(exc)}",
        )
