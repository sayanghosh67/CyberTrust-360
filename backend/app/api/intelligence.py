import logging
from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.schemas.intelligence import (
    GraphResponse,
    ReportRelationshipsResponse,
    IndicatorsResponse,
)
from backend.app.services.relationship_engine import (
    build_threat_graph,
    get_report_relationships,
    get_top_recurring_indicators,
)

logger = logging.getLogger("cybertrust.intelligence_api")

router = APIRouter(prefix="/v1/intelligence", tags=["Threat Relationship Intelligence"])


@router.get(
    "/graph",
    response_model=GraphResponse,
    status_code=status.HTTP_200_OK,
    summary="Interactive Threat Relationship Graph",
    description=(
        "Returns multi-entity threat relationship graph connecting URL investigations, Scam DNA reports, "
        "domains, brands, and tactics. Clearly distinguishes VERIFIED_SHARED_INDICATOR from POSSIBLE_RELATIONSHIP."
    ),
)
def get_threat_graph(
    filter_type: Optional[str] = Query(
        None,
        description="Filter mode: 'verified_only', 'scam_only', 'url_only', 'high_risk'",
    ),
    search: Optional[str] = Query(
        None,
        description="Search substring to filter nodes by domain, brand, or archetype",
    ),
    limit: int = Query(
        100,
        ge=10,
        le=500,
        description="Maximum number of historical records to aggregate into the graph",
    ),
    include_demo: bool = Query(
        False,
        description="Whether to include explicitly labeled synthetic demonstration clusters",
    ),
    db: Session = Depends(get_db),
) -> GraphResponse:
    return build_threat_graph(
        db=db,
        filter_type=filter_type,
        search_query=search,
        limit=limit,
        include_demo=include_demo,
    )


@router.get(
    "/relationships/{report_id}",
    response_model=ReportRelationshipsResponse,
    status_code=status.HTTP_200_OK,
    summary="Report Relationship Drilldown",
    description="Retrieves cross-module connected reports, shared indicators, and inferred relationships for a given report UUID.",
)
def get_relationships_by_report(
    report_id: str,
    db: Session = Depends(get_db),
) -> ReportRelationshipsResponse:
    return get_report_relationships(report_id=report_id, db=db)


@router.get(
    "/indicators",
    response_model=IndicatorsResponse,
    status_code=status.HTTP_200_OK,
    summary="Recurring Threat Indicators",
    description="Returns top shared indicators (domains, phone numbers, UPI IDs, brands) aggregated across the threat intelligence repository.",
)
def get_recurring_indicators(
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
) -> IndicatorsResponse:
    return get_top_recurring_indicators(db=db, limit=limit)
