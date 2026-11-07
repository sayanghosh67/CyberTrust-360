import hashlib
import json
import uuid
from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select, desc

from backend.app.core.config import settings
from backend.app.core.database import get_db
from backend.app.models.scam import ScamAnalysisRecord
from backend.app.schemas.scam import (
    ScamAnalyzeRequest,
    ScamAnalysisResponse,
    ScamAnalysisSummaryItem,
    SafetyGuidanceRequest,
    SafetyGuidanceResponse,
)
from backend.app.services.scam_extractor import extract_entities
from backend.app.services.llm_analyzer import analyze_message_with_ai
from backend.app.services.safety_guidance import generate_safety_guidance

router = APIRouter(prefix="/v1/scam", tags=["AI Scam DNA Intelligence"])


@router.post(
    "/analyze",
    response_model=ScamAnalysisResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Analyze Suspicious Text Message for Scam DNA",
    description="Extracts untrusted entities, identifies urgency/pressure tactics, and provides AI or deterministic rule-based threat classification.",
)
async def analyze_scam_message(
    payload: ScamAnalyzeRequest,
    db: Session = Depends(get_db),
) -> ScamAnalysisResponse:
    text = payload.message.strip()

    if len(text) < settings.SCAM_MESSAGE_MIN_LENGTH:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Message is too short. Minimum length is {settings.SCAM_MESSAGE_MIN_LENGTH} characters.",
        )
    if len(text) > settings.SCAM_MESSAGE_MAX_LENGTH:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Message exceeds maximum allowed length of {settings.SCAM_MESSAGE_MAX_LENGTH} characters.",
        )

    # Compute deterministic message hash for indexing and dedup
    msg_hash = hashlib.sha256(text.encode("utf-8")).hexdigest()
    # Sanitize preview: first 120 chars without linebreaks
    preview = " ".join(text[:120].split())
    if len(text) > 120:
        preview += "..."

    # 1. Extract Untrusted Entities (URLs, phones, UPI IDs, brands, currency)
    extracted_indicators = extract_entities(text)

    # 2. Run Scam DNA Intelligence (AI LLM with Rule-Based Fallback)
    analysis_data = await analyze_message_with_ai(text, extracted_indicators)

    analysis_id = str(uuid.uuid4())
    now_str = datetime.now(timezone.utc).isoformat()

    response = ScamAnalysisResponse(
        id=analysis_id,
        message_preview=preview,
        risk_score=analysis_data["risk_score"],
        risk_classification=analysis_data["risk_classification"],
        confidence=analysis_data["confidence"],
        summary=analysis_data["summary"],
        analysis_source=analysis_data["analysis_source"],
        model_used=analysis_data.get("model_used"),
        detected_language=analysis_data.get("detected_language", "en"),
        scam_archetype=analysis_data["scam_archetype"],
        tactics=analysis_data["tactics"],
        extracted_indicators=extracted_indicators,
        recommended_actions=analysis_data.get("recommended_actions", []),
        limitations=analysis_data.get("limitations", []),
        created_at=now_str,
    )

    # 3. Persist Analysis Record into Database via SQLAlchemy
    try:
        record = ScamAnalysisRecord(
            id=analysis_id,
            message_preview=preview,
            message_hash=msg_hash,
            risk_classification=response.risk_classification,
            risk_score=response.risk_score,
            confidence=response.confidence,
            analysis_source=response.analysis_source,
            scam_archetype=response.scam_archetype,
            detected_tactics_count=len(response.tactics),
            detected_language=response.detected_language,
            summary=response.summary,
            report_data=response.model_dump_json(),
        )
        db.add(record)
        db.commit()
    except Exception as db_err:
        db.rollback()
        # Log database error gracefully; do not fail API response delivery
        pass

    return response


@router.get(
    "/analyses",
    response_model=List[ScamAnalysisSummaryItem],
    summary="Retrieve Recent Scam Analysis History",
)
def list_scam_analyses(
    limit: int = 20,
    db: Session = Depends(get_db),
) -> List[ScamAnalysisSummaryItem]:
    try:
        stmt = select(ScamAnalysisRecord).order_by(desc(ScamAnalysisRecord.created_at)).limit(min(limit, 50))
        records = db.scalars(stmt).all()
        return [
            ScamAnalysisSummaryItem(
                id=r.id,
                message_preview=r.message_preview,
                risk_classification=r.risk_classification,
                risk_score=r.risk_score,
                confidence=r.confidence,
                analysis_source=r.analysis_source,
                scam_archetype=r.scam_archetype,
                detected_tactics_count=r.detected_tactics_count,
                summary=r.summary,
                created_at=r.created_at.isoformat(),
            )
            for r in records
        ]
    except Exception:
        return []


@router.get(
    "/analyses/{analysis_id}",
    response_model=ScamAnalysisResponse,
    summary="Retrieve Full Scam DNA Analysis Report",
)
def get_scam_analysis(
    analysis_id: str,
    db: Session = Depends(get_db),
) -> ScamAnalysisResponse:
    stmt = select(ScamAnalysisRecord).where(ScamAnalysisRecord.id == analysis_id)
    record = db.scalars(stmt).first()
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Scam analysis report with ID '{analysis_id}' was not found.",
        )

    try:
        data = json.loads(record.report_data)
        return ScamAnalysisResponse(**data)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to parse report data: {str(exc)}",
        )


@router.post(
    "/guidance",
    response_model=SafetyGuidanceResponse,
    summary="Get Interactive Incident Safety Guidance",
    description="Provides immediate, situation-specific safety guidance and Indian cybercrime reporting channels (1930, cybercrime.gov.in) based on what action occurred.",
)
def get_safety_guidance(payload: SafetyGuidanceRequest) -> SafetyGuidanceResponse:
    return generate_safety_guidance(
        action_taken=payload.action_taken,
        scam_type=payload.scam_type or "",
    )

