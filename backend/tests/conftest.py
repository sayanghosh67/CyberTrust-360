import os
os.environ["BLOCKCHAIN_RPC_URL"] = "http://127.0.0.1:18545"
"""All tests use a disposable DB and explicit test principals, never user data."""
import os,json,tempfile
from pathlib import Path
os.environ['VISITOR_SESSIONS_ENABLED']='False'
os.environ['POSTGRES_PORT']='1'
os.environ['DATABASE_URL']=''
os.environ['USE_SQLITE_FALLBACK']='True'
os.environ['SQLITE_DB_PATH']=str(Path(tempfile.mkdtemp(prefix='ct360-pytest-'))/'tests.db')
os.environ['API_AUTH_TOKENS']=json.dumps({'test-admin-token-for-local-tests-only-360':{'id':'test-admin','role':'admin'}})
os.environ['API_RATE_LIMIT']='10000'
os.environ['API_IP_RATE_LIMIT']='20000'
os.environ['GEMINI_API_KEY']=''
os.environ['OPENAI_API_KEY']=''
os.environ['GOOGLE_SAFE_BROWSING_API_KEY']=''
os.environ['VIRUSTOTAL_API_KEY']=''
os.environ['PHISHTANK_API_KEY']=''
os.environ['TLDEXTRACT_CACHE']=str(Path(os.environ['SQLITE_DB_PATH']).parent/'tld-cache')
from eth_account import Account
Account.enable_unaudited_hdwallet_features()
os.environ["BLOCKCHAIN_SIGNER_PRIVATE_KEY"] = Account.from_mnemonic("test test test test test test test test test test test junk").key.hex()
from fastapi.testclient import TestClient
_original_init=TestClient.__init__
def _authenticated_client(self,*args,**kwargs):
    kwargs.setdefault('headers',{'Authorization':'Bearer test-admin-token-for-local-tests-only-360'})
    _original_init(self,*args,**kwargs)
TestClient.__init__=_authenticated_client
from backend.app.core.database import initialize_database
initialize_database()
