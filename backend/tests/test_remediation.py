import copy
import json
from types import SimpleNamespace
from unittest.mock import Mock
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.core.config import settings
from backend.app.services import canonical_hasher as hashes, blockchain_service as chain, llm_analyzer
from backend.app.services.risk_engine import evaluate_risk
from backend.app.schemas.scan import URLAnalysis,DNSAnalysis,SSLAnalysis,HeadersAnalysis
from backend.app.core.database import get_active_engine
from backend.app.services.relationship_engine import build_threat_graph,get_top_recurring_indicators
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session
from backend.app.models import ScanRecord

@pytest.mark.parametrize('kind,key',[("url_scan",k) for k in ['dns_analysis','ssl_analysis','headers_analysis','threat_intel','indicators','recommended_actions','failed_checks']]+[("scam_report",k) for k in ['tactics','extracted_indicators','recommended_actions','analysis_source','summary','limitations']])
def test_every_report_section_is_hashed(kind,key):
    record=SimpleNamespace(id='test-id',report_data=json.dumps({key:{'value':'original'}}),risk_score=12)
    before=hashes.generate_report_fingerprint(record,kind)[2]
    record.report_data=json.dumps({key:{'value':'mutated'}})
    assert hashes.generate_report_fingerprint(record,kind)[2]!=before

def test_json_order_is_stable_but_values_and_list_order_are_preserved():
    assert hashes.canonicalize_to_json({'z':1,'a':2})==hashes.canonicalize_to_json({'a':2,'z':1})
    assert hashes.canonicalize_to_json({'a':[1,2]})!=hashes.canonicalize_to_json({'a':[2,1]})
    with pytest.raises(ValueError): hashes.canonicalize_to_json({'x':float('nan')})
    with pytest.raises(ValueError): hashes.generate_report_fingerprint(SimpleNamespace(id='x',report_data='bad'),'url_scan')

def test_legacy_hash_remains_versioned():
    record=SimpleNamespace(id='x',report_data='{}')
    assert json.loads(hashes.generate_report_fingerprint(record,'url_scan','v1')[0])['canonical_version']=='v1'
    assert hashes.generate_report_fingerprint(record,'url_scan','v1')[2]!=hashes.generate_report_fingerprint(record,'url_scan')[2]

@pytest.mark.parametrize('chain_id,code,expected',[(1,b'code','0x00'),(31337,b'','0x00'),(31337,b'wrong','0x00')])
def test_wrong_chain_or_contract_rejected(monkeypatch,chain_id,code,expected):
    w3=Mock();w3.eth.chain_id=chain_id;w3.eth.get_code.return_value=code
    monkeypatch.setattr(chain.Web3,'HTTPProvider',lambda *a,**k:None)
    constructor=Mock(return_value=w3);constructor.to_checksum_address=lambda x:x;constructor.to_hex=lambda x:'0x11';constructor.keccak=lambda x:b'xx'
    monkeypatch.setattr(chain,'Web3',constructor)
    monkeypatch.setattr(chain,'_load_metadata',lambda:{'runtimeBytecodeHash':expected})
    monkeypatch.setattr(chain,'_load_contract_metadata',lambda:('0x'+'1'*40,[]))
    assert chain.get_web3_client()==(None,None)

def test_incomplete_checks_never_low_risk():
    url=URLAnalysis(original_url='https://example.com',canonical_url='https://example.com/',hostname='example.com',registered_domain='example.com',subdomain='',tld='com',scheme='https')
    for dns,ssl,headers in [(DNSAnalysis(status='unavailable'),SSLAnalysis(),HeadersAnalysis()),(DNSAnalysis(status='resolved'),SSLAnalysis(valid=False),HeadersAnalysis(status_code=200)),(DNSAnalysis(status='resolved'),SSLAnalysis(valid=True,https_available=True),HeadersAnalysis())]:
        result=evaluate_risk(url,dns,ssl,headers,[],[])
        assert result[0]=='Inconclusive'
        assert 'valid certificates' not in result[3]

@pytest.mark.asyncio
async def test_provider_none_never_calls_llm(monkeypatch):
    monkeypatch.setattr(settings,'LLM_PROVIDER','none');monkeypatch.setattr(settings,'GEMINI_API_KEY','fake');monkeypatch.setattr(settings,'OPENAI_API_KEY','fake')
    async def fail(*a):raise AssertionError('disabled provider called')
    monkeypatch.setattr(llm_analyzer,'_call_gemini_api',fail);monkeypatch.setattr(llm_analyzer,'_call_openai_api',fail)
    result=await llm_analyzer.analyze_message_with_ai('Your account is blocked, share OTP now',[])
    assert result['analysis_source']=='rule_based_fallback'

@pytest.mark.asyncio
async def test_provider_selection(monkeypatch):
    monkeypatch.setattr(settings,'LLM_PROVIDER','openai');monkeypatch.setattr(settings,'GEMINI_API_KEY','fake');monkeypatch.setattr(settings,'OPENAI_API_KEY','fake')
    async def chosen(*a):return {'risk_score':80,'recommended_actions':[]}
    async def wrong(*a):raise AssertionError('wrong provider')
    monkeypatch.setattr(llm_analyzer,'_call_gemini_api',wrong);monkeypatch.setattr(llm_analyzer,'_call_openai_api',chosen)
    assert (await llm_analyzer.analyze_message_with_ai('Share your OTP now',[]))['analysis_source']=='ai_llm'

def test_empty_owned_graph_and_metrics_exclude_demo():
    with Session(get_active_engine()) as db:
        db.info['principal']={'id':'empty-user-remediation','role':'analyst'}
        graph=build_threat_graph(db)
        assert graph.nodes==[] and graph.edges==[]
        assert get_top_recurring_indicators(db).total_count==0
        assert len(build_threat_graph(db,include_demo=True).nodes)>0

def test_persistence_failure_is_visible(monkeypatch):
    client=TestClient(app)
    def broken(self):raise RuntimeError('SECRET DATABASE INFO')
    monkeypatch.setattr(Session,'commit',broken)
    response=client.post('/api/v1/scam/analyze',json={'message':'Urgent fake KYC, share your OTP immediately'})
    assert response.status_code==503 and 'SECRET' not in response.text

def test_dashboard_failure_is_not_zero_metrics(monkeypatch):
    def broken(*a,**k):raise RuntimeError('secret')
    monkeypatch.setattr(Session,'query',broken)
    response=TestClient(app).get('/api/v1/dashboard/metrics')
    assert response.status_code==503 and 'secret' not in response.text

def test_migration_preserves_legacy_records(tmp_path):
    from alembic import command
    from alembic.config import Config
    engine=create_engine('sqlite:///'+str(tmp_path/'legacy.db'))
    with engine.begin() as conn:
        conn.execute(text('CREATE TABLE scan_records (id VARCHAR PRIMARY KEY, report_data TEXT, url TEXT, hostname TEXT, registered_domain TEXT, ip_address TEXT, risk_classification TEXT, risk_score INTEGER, confidence TEXT, summary TEXT, created_at DATETIME)'))
        conn.execute(text("INSERT INTO scan_records (id,report_data) VALUES ('legacy','unchanged')"))
        cfg=Config('backend/alembic.ini');cfg.attributes['connection']=conn
        command.upgrade(cfg,'head')
        assert conn.execute(text("SELECT report_data FROM scan_records WHERE id='legacy'")).scalar()=='unchanged'
        assert conn.execute(text('SELECT owner_id FROM scan_records')).scalar() is None
        assert conn.execute(text('SELECT version_num FROM alembic_version')).scalar()=='ct360_002'

def test_startup_readiness_requires_database_status():
    from scripts.start_demo import healthy
    assert healthy({'status':'healthy','database':{'status':'connected'}})
    assert not healthy({'status':'healthy','database':{'status':'disconnected'}})
    assert not healthy({'status':'degraded','database':{'status':'connected'}})

def test_degraded_health_returns_503(monkeypatch):
    from backend.app.api import health
    monkeypatch.setattr(health,'check_database_connection',lambda:{'status':'disconnected','message':'Database unavailable'})
    response=TestClient(app).get('/api/health')
    assert response.status_code==503 and response.json()['status']=='degraded'

def test_preview_redacts_long_numeric_secrets():
    response=TestClient(app).post('/api/v1/scam/analyze',json={'message':'Your OTP is 123456. Never share it with anyone.'})
    assert response.status_code==201
    assert '123456' not in response.json()['message_preview']

@pytest.mark.asyncio
async def test_unimplemented_provider_does_not_claim_active():
    from backend.app.services.threat_intel import _check_virustotal
    verdict=await _check_virustotal('https://example.com')
    assert verdict.status=='unavailable'
    assert 'not implemented' in verdict.details

def test_nonlocal_rpc_configuration_fails_closed(monkeypatch):
    monkeypatch.setattr(settings,'BLOCKCHAIN_RPC_URL','https://rpc.example.com')
    assert chain.get_web3_client()==(None,None)
