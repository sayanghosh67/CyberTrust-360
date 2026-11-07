from fastapi import APIRouter
from backend.app.api.health import router as health_router
from backend.app.api.scans import router as scans_router
from backend.app.api.scam import router as scam_router
from backend.app.api.intelligence import router as intelligence_router
from backend.app.api.blockchain import router as blockchain_router
from backend.app.api.dashboard import router as dashboard_router

api_router = APIRouter()
api_router.include_router(health_router, prefix="", tags=["Health"])
api_router.include_router(scans_router, prefix="", tags=["Scans & Investigation"])
api_router.include_router(scam_router, prefix="", tags=["AI Scam DNA Intelligence"])
api_router.include_router(intelligence_router, prefix="", tags=["Threat Relationship Intelligence"])
api_router.include_router(blockchain_router, prefix="", tags=["Blockchain Threat Report Integrity"])
api_router.include_router(dashboard_router, prefix="", tags=["Dashboard Intelligence"])
