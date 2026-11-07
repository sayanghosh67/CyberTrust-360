from typing import Generator
import logging
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from backend.app.core.config import settings
from backend.app.models.base import Base

logger = logging.getLogger(__name__)

# Primary PostgreSQL Engine
primary_engine = create_engine(
    settings.sync_database_url,
    pool_pre_ping=True,
    echo=False,
    connect_args={"connect_timeout": settings.DATABASE_CONNECT_TIMEOUT},
)

# Secondary SQLite Engine (Local resilient fallback if PostgreSQL is offline)
sqlite_url = f"sqlite:///{settings.SQLITE_DB_PATH}"
sqlite_engine = create_engine(
    sqlite_url,
    connect_args={"check_same_thread": False},
    echo=False,
)

# Determine active engine based on connectivity test
_active_engine = None
_active_sessionmaker = None


def get_active_engine():
    global _active_engine, _active_sessionmaker
    if _active_engine is not None:
        return _active_engine

    try:
        with primary_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info("Connected to PostgreSQL primary database.")
        _active_engine = primary_engine
        _active_sessionmaker = sessionmaker(autocommit=False, autoflush=False, bind=primary_engine)
    except Exception as e:
        if settings.USE_SQLITE_FALLBACK:
            logger.warning(f"PostgreSQL unavailable ({e}). Falling back to local SQLite database.")
            _active_engine = sqlite_engine
            _active_sessionmaker = sessionmaker(autocommit=False, autoflush=False, bind=sqlite_engine)
        else:
            _active_engine = primary_engine
            _active_sessionmaker = sessionmaker(autocommit=False, autoflush=False, bind=primary_engine)

    # Initialize tables
    try:
        Base.metadata.create_all(bind=_active_engine)
    except Exception as err:
        logger.error(f"Error creating database tables: {err}")

    return _active_engine


def get_sessionmaker():
    global _active_sessionmaker
    if _active_sessionmaker is None:
        get_active_engine()
    return _active_sessionmaker


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency providing active database session with automatic lifecycle management."""
    sm = get_sessionmaker()
    db = sm()
    try:
        yield db
    finally:
        db.close()


def check_database_connection() -> dict:
    """Safely probe database connectivity for health checks."""
    try:
        with primary_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {
            "status": "connected",
            "message": "PostgreSQL is reachable and active",
            "dialect": "postgresql",
        }
    except Exception as e:
        if settings.USE_SQLITE_FALLBACK:
            return {
                "status": "connected",
                "message": "SQLite active (PostgreSQL offline, fallback active)",
                "dialect": "sqlite",
            }
        return {
            "status": "disconnected",
            "message": f"Database unavailable: {type(e).__name__}",
            "dialect": "postgresql",
        }
