from typing import Generator
import logging
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from backend.app.core.config import settings

logger = logging.getLogger(__name__)

# SQLAlchemy Engine
# pool_pre_ping checks the connection validity before handing it out
engine = create_engine(
    settings.sync_database_url,
    pool_pre_ping=True,
    echo=settings.DEBUG,
    connect_args={"connect_timeout": settings.DATABASE_CONNECT_TIMEOUT},
)

# Session local factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    """Dependency that provides a database session and safely closes it."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def check_database_connection() -> dict:
    """Safely probe the PostgreSQL database connection for health checks."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {
            "status": "connected",
            "message": "Database is reachable and responding to queries",
        }
    except Exception as e:
        logger.warning(f"Database connection probe failed: {e}")
        return {
            "status": "disconnected",
            "message": f"Database unavailable: {type(e).__name__}",
        }
