import pytest
import json
from fastapi.testclient import TestClient
from sqlalchemy import select
from backend.app.main import app
from backend.app.core.config import settings
from backend.app.core.database import get_sessionmaker
from backend.app.models.scan import ScanRecord

ADMIN='test-admin-token-for-local-tests-only-360'
ALICE='alice-test-token-with-32-characters-long'
BOB='bob-test-token-with-at-least-32-characters'
VIEWER='viewer-test-token-with-32-characters-long'
def client(token=None):
    return TestClient(app,headers={'Authorization':f'Bearer {token}'} if token else {})

def test_anonymous_and_wrong_token_rejected():
    assert client().get('/api/v1/scans').status_code==401
    assert client('wrong').get('/api/v1/dashboard/metrics').status_code==401
    assert client().get('/api/health').status_code==200

def test_missing_auth_configuration_fails_closed(monkeypatch):
    monkeypatch.setattr(settings,'API_AUTH_TOKENS',{})
    assert client().get('/api/v1/scans').status_code==503

def test_roles_and_owner_scoping(monkeypatch):
    monkeypatch.setattr(settings,'API_AUTH_TOKENS',{ADMIN:{'id':'test-admin','role':'admin'},ALICE:{'id':'alice','role':'analyst'},BOB:{'id':'bob','role':'registrar'},VIEWER:{'id':'alice','role':'reader'}})
    a=client(ALICE);b=client(BOB);v=client(VIEWER)
    result=a.post('/api/v1/scam/analyze',json={'message':'Synthetic harmless message for isolation testing.'})
    assert result.status_code==201
    rid=result.json()['id']
    assert a.get('/api/v1/scam/analyses/'+rid).status_code==200
    assert v.get('/api/v1/scam/analyses/'+rid).status_code==200
    assert b.get('/api/v1/scam/analyses/'+rid).status_code==404
    assert all(x['id']!=rid for x in b.get('/api/v1/scam/analyses').json())
    assert b.post('/api/v1/blockchain/register/'+rid).status_code==404
    assert a.post('/api/v1/blockchain/register/'+rid).status_code==403
    assert v.post('/api/v1/scam/analyze',json={'message':'Not permitted'}).status_code==403
    assert b.get('/api/v1/dashboard/metrics').json()['total_scam_analyses']==0
    graph=b.get('/api/v1/intelligence/graph').json()
    assert not any(rid in n['id'] for n in graph['nodes'])

def test_legacy_records_admin_only(monkeypatch):
    monkeypatch.setattr(settings,'API_AUTH_TOKENS',{ADMIN:{'id':'test-admin','role':'admin'},BOB:{'id':'bob','role':'reader'}})
    with get_sessionmaker()() as db:
        r=ScanRecord(id='legacy-owner-test',url='https://example.com/',hostname='example.com',registered_domain='example.com',risk_score=0,risk_classification='Low Risk',confidence='Low',report_data='{}');db.add(r);db.commit()
    assert not any(r['id']=='legacy-owner-test' for r in client(BOB).get('/api/v1/scans').json())
    assert any(r['id']=='legacy-owner-test' for r in client(ADMIN).get('/api/v1/scans').json())

def test_rate_limit_enforced(monkeypatch):
    monkeypatch.setattr(settings,'API_RATE_LIMIT',2)
    token='unique-rate-test-token-at-least-32-chars'
    monkeypatch.setattr(settings,'API_AUTH_TOKENS',{token:{'id':'rate-test-unique','role':'reader'}})
    c=client(token)
    assert c.get('/api/v1/access/me').status_code==200
    assert c.get('/api/v1/access/me').status_code==200
    response=c.get('/api/v1/access/me');assert response.status_code==429;assert response.headers['retry-after']=='60'

def test_payload_limit_and_validation_redaction():
    c=client(ADMIN)
    assert c.post('/api/v1/scam/analyze',content=b'x'*65537).status_code==413
    sentinel='SENSITIVE_SENTINEL_12345'
    res=c.post('/api/v1/scam/analyze',json={'message':{'secret':sentinel}})
    assert res.status_code==422 and sentinel not in res.text

@pytest.mark.asyncio
async def test_concurrency_limit_rejects_excess_requests():
    import asyncio
    from backend.app.core.access import AccessMiddleware
    release=asyncio.Event()
    async def slow(scope,receive,send):
        await release.wait()
        await send({'type':'http.response.start','status':200,'headers':[]})
        await send({'type':'http.response.body','body':b'ok'})
    middleware=AccessMiddleware(slow)
    async def request():
        replies=[]
        async def send(message):replies.append(message)
        async def receive():return {'type':'http.request','body':b''}
        await middleware({'type':'http','method':'GET','path':'/api/v1/scans','headers':[(b'authorization',b'Bearer test-admin-token-for-local-tests-only-360')],'client':('127.0.0.1',1)},receive,send)
        return replies[0]['status']
    pending=[asyncio.create_task(request()) for _ in range(8)]
    await asyncio.sleep(0)
    assert await request()==429
    release.set()
    assert await asyncio.gather(*pending)==[200]*8
    assert middleware.active==0
