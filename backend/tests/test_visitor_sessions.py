import time
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.core.config import settings
from backend.app.core.visitor import issue_visitor, verify_visitor


def visitor(monkeypatch):
    monkeypatch.setattr(settings,'VISITOR_SESSIONS_ENABLED',True)
    client=TestClient(app,headers={})
    response=client.post('/api/v1/access/session')
    assert response.status_code==200
    assert response.headers['cache-control']=='no-store'
    client.headers['Authorization']='Bearer '+response.json()['access_token']
    return client

def test_public_session_works_without_operator_configuration(monkeypatch):
    monkeypatch.setattr(settings,'API_AUTH_TOKENS',{})
    client=visitor(monkeypatch)
    me=client.get('/api/v1/access/me').json()
    assert me['role']=='analyst' and me['id'].startswith('visitor:')
    assert client.get('/api/v1/dashboard/metrics').status_code==200

def test_visitor_reports_are_private_and_signing_remains_restricted(monkeypatch):
    alice=visitor(monkeypatch);bob=visitor(monkeypatch)
    response=alice.post('/api/v1/scam/analyze',json={'message':'Synthetic KYC fraud: share OTP to unblock your bank account now'})
    assert response.status_code==201
    rid=response.json()['id']
    assert alice.get('/api/v1/scam/analyses/'+rid).status_code==200
    assert bob.get('/api/v1/scam/analyses/'+rid).status_code==404
    assert alice.post('/api/v1/blockchain/register/'+rid).status_code==403

def test_tampered_and_expired_visitor_sessions_rejected(monkeypatch):
    token,_=issue_visitor()
    assert verify_visitor(token)
    assert verify_visitor(token[:-1]+('0' if token[-1]!='0' else '1')) is None
    monkeypatch.setattr(time,'time',lambda:2000000000)
    assert verify_visitor(token) is None

def test_untrusted_origin_cannot_create_session(monkeypatch):
    monkeypatch.setattr(settings,'VISITOR_SESSIONS_ENABLED',True)
    client=TestClient(app,headers={})
    assert client.post('/api/v1/access/session',headers={'Origin':'https://attacker.invalid'}).status_code==403

def test_guest_signing_is_not_enabled_for_remote_clients(monkeypatch):
    monkeypatch.setattr(settings,'LOCAL_DEMO_GUEST_SIGNING',True)
    client=visitor(monkeypatch) # TestClient remote address is not loopback.
    assert client.get('/api/v1/access/me').json()['role']=='analyst'

def test_session_creation_limit(monkeypatch):
    from backend.app.core.access import AccessMiddleware
    from starlette.applications import Starlette
    monkeypatch.setattr(settings,'VISITOR_SESSIONS_ENABLED',True)
    isolated=Starlette();isolated.add_middleware(AccessMiddleware)
    client=TestClient(isolated,headers={})
    assert all(client.post('/api/v1/access/session').status_code==200 for _ in range(12))
    assert client.post('/api/v1/access/session').status_code==429
