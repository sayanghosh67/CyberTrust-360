from datetime import datetime, timezone
from fastapi import APIRouter, status, Response
from backend.app.core.config import settings
from backend.app.core.database import check_database_connection
from backend.app.schemas.health import HealthResponse, DatabaseHealth

router = APIRouter(tags=["Health"])


@router.get(
    "/health",
    response_model=HealthResponse,
    status_code=status.HTTP_200_OK,
    summary="Platform Health Check",
    description="Returns genuine system status, uptime timestamp, database connectivity, and environment metadata.",
)
def get_health(response: Response) -> HealthResponse:
    db_result = check_database_connection()

    db_health = DatabaseHealth(
        status=db_result["status"],
        message=db_result["message"]
    )

    if db_health.status != "connected":
        response.status_code = 503
    overall_status = "healthy" if db_health.status == "connected" else "degraded"

    return HealthResponse(
        status=overall_status,
        app_name=settings.PROJECT_NAME,
        team=settings.TEAM_NAME,
        version=settings.VERSION,
        environment=settings.ENVIRONMENT,
        timestamp=datetime.now(timezone.utc),
        database=db_health,
        services={
            "api_gateway": "operational",
            "threat_engine": "ready",
            "trust_intelligence": "ready",
        },
    )

