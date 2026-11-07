from typing import Generator
import logging
from pathlib import Path
from fastapi import Request
from sqlalchemy import create_engine, text, event
from sqlalchemy.orm import sessionmaker, Session, with_loader_criteria
from backend.app.core.config import settings

logger = logging.getLogger(__name__)
primary_engine = create_engine(settings.sync_database_url, pool_pre_ping=True, echo=False,
    connect_args={'check_same_thread':False} if settings.sync_database_url.startswith('sqlite:') else {'connect_timeout':settings.DATABASE_CONNECT_TIMEOUT})
sqlite_engine = create_engine(f'sqlite:///{settings.SQLITE_DB_PATH}',connect_args={'check_same_thread':False},echo=False)
_active_engine = None
_active_sessionmaker = None

def get_active_engine():
    global _active_engine, _active_sessionmaker
    if _active_engine is None:
        try:
            with primary_engine.connect() as conn: conn.execute(text('SELECT 1'))
            _active_engine = primary_engine
        except Exception:
            if not settings.USE_SQLITE_FALLBACK:
                raise RuntimeError('Configured database is unavailable.') from None
            logger.warning('Primary database unavailable; using configured SQLite fallback.')
            _active_engine = sqlite_engine
        _active_sessionmaker = sessionmaker(autocommit=False,autoflush=False,bind=_active_engine)
    return _active_engine

def initialize_database():
    """Apply additive versioned migrations. Never drop user tables or rewrite report data."""
    from alembic.config import Config
    from alembic import command
    cfg=Config(str(Path(__file__).resolve().parents[2]/'alembic.ini'))
    with get_active_engine().begin() as conn:
        cfg.attributes['connection']=conn
        command.upgrade(cfg,'head')

def get_sessionmaker():
    if _active_sessionmaker is None: get_active_engine()
    return _active_sessionmaker

def get_db(request: Request) -> Generator[Session,None,None]:
    db=get_sessionmaker()()
    db.info['principal']=getattr(request.state,'principal',None)
    try: yield db
    finally: db.close()

@event.listens_for(Session,'do_orm_execute')
def scope_reads(execute_state):
    principal=execute_state.session.info.get('principal')
    if not principal or principal['role']=='admin' or not execute_state.is_select:
        return
    from backend.app.models import ScanRecord,ScamAnalysisRecord,BlockchainRegistrationRecord
    owner=principal['id']
    for model in (ScanRecord,ScamAnalysisRecord,BlockchainRegistrationRecord):
        execute_state.statement=execute_state.statement.options(with_loader_criteria(model, model.owner_id==owner, include_aliases=True))

@event.listens_for(Session,'before_flush')
def assign_owner(session,context,instances):
    principal=session.info.get('principal')
    if not principal:return
    from backend.app.models import ScanRecord,ScamAnalysisRecord,BlockchainRegistrationRecord
    for record in session.new:
        if isinstance(record,(ScanRecord,ScamAnalysisRecord,BlockchainRegistrationRecord)):
            if record.owner_id is None: record.owner_id=principal['id']
            if principal['role']!='admin' and record.owner_id!=principal['id']:
                raise PermissionError('Report ownership mismatch')

def check_database_connection():
    try:
        engine=get_active_engine()
        with engine.connect() as conn:
            conn.execute(text('SELECT 1'))
            conn.execute(text('SELECT id FROM scan_records LIMIT 1'))
            version=conn.execute(text('SELECT version_num FROM alembic_version')).scalar()
            if version!='ct360_002':raise RuntimeError('Migration required')
        return {'status':'connected','message':f'{engine.dialect.name} database ready','dialect':engine.dialect.name}
    except Exception:
        return {'status':'disconnected','message':'Database unavailable or migrations pending','dialect':'unknown'}
