from fastapi import APIRouter
from backend.app.api.health import router as health_router
from backend.app.api.scans import router as scans_router

api_router = APIRouter()
api_router.include_router(health_router, prefix="", tags=["Health"])
api_router.include_router(scans_router, prefix="", tags=["Scans & Investigation"])
