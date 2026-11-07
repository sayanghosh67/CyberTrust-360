"""Real local EVM regression tests: no mocked RPC or receipts."""
import json
import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session
from backend.app.main import app
from backend.app.core.database import get_active_engine
from backend.app.core.config import settings
from backend.app.models import ScamAnalysisRecord, BlockchainRegistrationRecord
from backend.app.services.blockchain_service import register_report_on_chain, verify_report_integrity, get_web3_client

def report_id():
    response=TestClient(app).post('/api/v1/scam/analyze',json={'message':'Synthetic test: urgent bank KYC, share your OTP at https://test.invalid/'})
    assert response.status_code==201
    return response.json()['id']

def test_real_receipt_idempotency_and_every_saved_section_tamper():
    rid=report_id()
    with Session(get_active_engine()) as db:
        registration=register_report_on_chain(rid,db)
        assert registration.canonical_version=='ct360-v2'
        assert register_report_on_chain(rid,db).transaction_hash==registration.transaction_hash
        assert verify_report_integrity(rid,db).verification_status=='VERIFIED'
        record=db.get(ScamAnalysisRecord,rid);original=record.report_data
        data=json.loads(original)
        for key in ['tactics','extracted_indicators','recommended_actions','analysis_source','summary','limitations']:
            mutated=dict(data);mutated[key]={'controlled_test':'changed'};record.report_data=json.dumps(mutated);db.commit()
            assert verify_report_integrity(rid,db).verification_status=='MISMATCH',key
            record.report_data=original;db.commit()
        assert verify_report_integrity(rid,db).verification_status=='VERIFIED'

def test_retry_reconciles_mined_transaction_after_database_failure(monkeypatch):
    rid=report_id()
    with Session(get_active_engine()) as db:
        original_commit=db.commit
        def fail():raise RuntimeError('simulated database failure after mining')
        monkeypatch.setattr(db,'commit',fail)
        with pytest.raises(ConnectionError,match='Retry to reconcile'):register_report_on_chain(rid,db)
        monkeypatch.setattr(db,'commit',original_commit)
        w3,contract=get_web3_client();before=w3.eth.block_number
        recovered=register_report_on_chain(rid,db)
        assert recovered.registration_status=='confirmed'
        assert w3.eth.block_number==before
        assert verify_report_integrity(rid,db).verification_status=='VERIFIED'

def test_existing_registration_is_not_success_when_rpc_offline(monkeypatch):
    rid=report_id()
    with Session(get_active_engine()) as db:
        register_report_on_chain(rid,db)
        monkeypatch.setattr(settings,'BLOCKCHAIN_RPC_URL','http://127.0.0.1:1')
        with pytest.raises(ConnectionError):register_report_on_chain(rid,db)
        assert verify_report_integrity(rid,db).verification_status=='VERIFICATION_UNAVAILABLE'

def test_missing_chain_record_is_not_tampering():
    rid=report_id()
    with Session(get_active_engine()) as db:
        original=register_report_on_chain(rid,db)
        new_id=report_id()
        reg=db.execute(select(BlockchainRegistrationRecord).where(BlockchainRegistrationRecord.report_id==rid)).scalar_one()
        # Simulate a stale off-chain record after a chain reset without resetting the chain.
        reg.report_id=new_id;db.commit()
        result=verify_report_integrity(new_id,db)
        assert result.verification_status=='NOT_REGISTERED' and not result.tamper_detected

def test_unregistered_wallet_cannot_sign(monkeypatch):
    from eth_account import Account
    rid=report_id()
    with Session(get_active_engine()) as db:
        monkeypatch.setattr(settings,'BLOCKCHAIN_SIGNER_PRIVATE_KEY',Account.create().key.hex())
        with pytest.raises(ConnectionError,match='authorized registrar'):register_report_on_chain(rid,db)
