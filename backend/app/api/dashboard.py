import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, or_

from backend.app.core.database import get_db
from backend.app.models.scan import ScanRecord
from backend.app.models.scam import ScamAnalysisRecord
from backend.app.models.blockchain import BlockchainRegistrationRecord
from backend.app.services.relationship_engine import get_top_recurring_indicators
from backend.app.schemas.dashboard import DashboardMetricsResponse

logger = logging.getLogger("cybertrust.dashboard_api")

router = APIRouter(prefix="/v1/dashboard", tags=["Dashboard Intelligence"])


@router.get(
    "/metrics",
    response_model=DashboardMetricsResponse,
    status_code=status.HTTP_200_OK,
    summary="Platform Intelligence Dashboard Metrics",
    description="Returns aggregate real database counts across URL scans, Scam DNA analyses, high-risk reports, indicators, and blockchain attestations.",
)
def get_dashboard_metrics(db: Session = Depends(get_db)):
    try:
        total_urls = db.query(func.count(ScanRecord.id)).scalar() or 0
        total_scams = db.query(func.count(ScamAnalysisRecord.id)).scalar() or 0

        high_risk_urls = (
            db.query(func.count(ScanRecord.id))
            .filter(
                or_(
                    ScanRecord.risk_classification.in_(["High Risk", "Confirmed Malicious"]),
                    ScanRecord.risk_score >= 70,
                )
            )
            .scalar()
            or 0
        )

        high_risk_scams = (
            db.query(func.count(ScamAnalysisRecord.id))
            .filter(
                or_(
                    ScamAnalysisRecord.risk_classification.in_(["High Risk", "Critical Risk"]),
                    ScamAnalysisRecord.risk_score >= 70,
                )
            )
            .scalar()
            or 0
        )

        high_risk_total = high_risk_urls + high_risk_scams

        # Tracked indicators from relationship engine
        indicators_resp = get_top_recurring_indicators(db=db, limit=100)
        total_indicators = indicators_resp.total_count

        # Blockchain registered count
        blockchain_count = (
            db.query(func.count(func.distinct(BlockchainRegistrationRecord.report_id)))
            .filter(BlockchainRegistrationRecord.registration_status == "confirmed")
            .scalar()
            or 0
        )

        return DashboardMetricsResponse(
            total_url_investigations=total_urls,
            total_scam_analyses=total_scams,
            high_risk_reports=high_risk_total,
            related_threat_indicators=total_indicators,
            blockchain_registered_reports=blockchain_count,
            timestamp=datetime.now(timezone.utc),
        )
    except Exception:
        logger.error("Dashboard database query failed")
        raise HTTPException(status_code=503, detail="Dashboard data is unavailable") from None

