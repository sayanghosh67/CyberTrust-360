from datetime import datetime, timezone
from typing import Dict, Any, Literal
from pydantic import BaseModel, Field


class DatabaseHealth(BaseModel):
    status: Literal["connected", "disconnected"]
    message: str


class HealthResponse(BaseModel):
    status: Literal["healthy", "degraded", "unhealthy"] = Field(
        ..., description="Overall platform health status"
    )
    app_name: str = Field(..., description="Application name")
    team: str = Field(..., description="Engineering team / organization")
    version: str = Field(..., description="API version")
    environment: str = Field(..., description="Current running environment")
    timestamp: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="Current server timestamp in UTC"
    )
    database: DatabaseHealth = Field(..., description="PostgreSQL connectivity status")
    services: Dict[str, Any] = Field(
        default_factory=dict,
        description="Subsystem status breakdown"
    )


class ErrorResponse(BaseModel):
    detail: str = Field(..., description="Human-readable error description")
    error_code: str = Field(..., description="Machine-readable error identifier")
    timestamp: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
