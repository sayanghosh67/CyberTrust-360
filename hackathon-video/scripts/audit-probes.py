import os,pathlib,json,asyncio,socket,threading,copy,sqlite3
from unittest.mock import patch
from http.server import HTTPServer,BaseHTTPRequestHandler
ROOT=pathlib.Path(__file__).resolve().parents[2]
os.environ.update(POSTGRES_PORT='1',SQLITE_DB_PATH=str(ROOT/'hackathon-video/runtime/probes.db'),DEBUG='False',BLOCKCHAIN_RPC_URL='http://127.0.0.1:18545',GEMINI_API_KEY='',OPENAI_API_KEY='',URLHAUS_ENABLED='False',TLDEXTRACT_CACHE=str(ROOT/'hackathon-video/runtime/tld-cache'))
from backend.app.main import app
from fastapi.testclient import TestClient
from backend.app.utils.security import is_ip_blocked,normalize_and_validate_target,is_target_host_blocked
from backend.app.services.headers_checker import inspect_headers
from backend.app.services.canonical_hasher import canonicalize_to_json,generate_report_fingerprint
from backend.app.core.database import get_sessionmaker
from backend.app.core.config import settings
from backend.app.models.scam import ScamAnalysisRecord
from backend.app.models.scan import ScanRecord
from backend.app.services.risk_engine import evaluate_risk
from backend.app.services.url_analyzer import analyze_url
from backend.app.schemas.scan import DNSAnalysis,SSLAnalysis,HeadersAnalysis
out={}; c=TestClient(app,raise_server_exceptions=False)
out['ipv6_blocking']={x:is_ip_blocked(x) for x in ['127.0.0.1','::1','::ffff:127.0.0.1','::','ff02::1']}
class Handler(BaseHTTPRequestHandler):
 def do_GET(self):
  out['rebinding_received_path']=self.path; self.send_response(200);self.end_headers();self.wfile.write(b'isolated audit server')
 def log_message(self,*args):pass
server=HTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start(); real=socket.getaddrinfo; count=0

def rebind(host,port,*a,**kw):
 global count
 if host in ('audit-rebind.example.com',b'audit-rebind.example.com'):
  count+=1
  return real('93.184.216.34' if count==1 else '127.0.0.1',port,*a,**kw)
 return real(host,port,*a,**kw)
with patch('socket.getaddrinfo',side_effect=rebind):
 out['rebinding_http_result']=asyncio.run(inspect_headers(f'http://audit-rebind.example.com:{server.server_port}/audit-only','audit-rebind.example.com')).model_dump()
out['rebinding_dns_calls']=count;server.shutdown()
with patch('socket.getaddrinfo',return_value=real('93.184.216.34',443)):
 out['normalization']=normalize_and_validate_target('https://example.com:8443/path?token=demo')
out['canonicalization']={ 'negative_zero':canonicalize_to_json({'n':-0.0}), 'integer_float':canonicalize_to_json({'n':1.0}), 'nonfinite':canonicalize_to_json({'n':float('nan')}), 'unicode_key_order':canonicalize_to_json({'\U0001f600':1,'\ue000':2})}
out['empty_dashboard']=c.get('/api/v1/dashboard/metrics').json()
out['empty_indicators']=c.get('/api/v1/intelligence/indicators').json()
out['invalid_port_http_status']=c.post('/api/v1/scans',json={'url':'https://example.com:bad'}).status_code
msg='SYNTHETIC DEMO. Dear SBI User, your account will be blocked within 24 hours. Update KYC immediately at https://example.com/kyc and share your OTP with officer.'
r=c.post('/api/v1/scam/analyze',json={'message':msg});out['scam_report']=r.json();sid=r.json()['id']
with get_sessionmaker()() as db:
 rec=db.get(ScamAnalysisRecord,sid); before=generate_report_fingerprint(rec,'scam_report'); data=json.loads(rec.report_data);data['tactics'][0]['explanation']='CONTROLLED CHANGED EVIDENCE';rec.report_data=json.dumps(data);after=generate_report_fingerprint(rec,'scam_report');out['scam_tactics_tamper_hash_unchanged']=before[2]==after[2];db.rollback()
 sample=ScanRecord(id='audit-scan',url='https://example.com/',registered_domain='example.com',risk_classification='Low Risk',risk_score=0,confidence='Medium',summary='audit',report_data=json.dumps({'dns_analysis':{'status':'resolved'},'ssl_analysis':{'valid':True},'headers_analysis':{'hsts_present':True},'indicators':[{'name':'before'}],'threat_intel':[]}));before=generate_report_fingerprint(sample,'url_scan');sample.report_data=json.dumps({'dns_analysis':{'status':'failed'},'ssl_analysis':{'valid':False},'headers_analysis':{'hsts_present':False},'indicators':[{'name':'after'}],'threat_intel':[{'status':'malicious'}]});after=generate_report_fingerprint(sample,'url_scan');out['url_evidence_tamper_hash_unchanged']=before[2]==after[2]
 from backend.app.services.blockchain_service import register_report_on_chain,verify_report_integrity
 reg=register_report_on_chain(sid,db);out['live_registration']=reg.model_dump();out['live_verification']=verify_report_integrity(sid,db).model_dump()
 with patch.object(settings,'BLOCKCHAIN_RPC_URL','http://127.0.0.1:1'):
  out['offline_verification']=verify_report_integrity(sid,db).model_dump()
out['unavailable_checks_risk']=evaluate_risk(analyze_url('https://example.com'),DNSAnalysis(status='unavailable'),SSLAnalysis(error_message='timeout'),HeadersAnalysis(error_message='timeout'),[],[])[:4]
# Read original database without changing it, aggregate only; never export transcript values.
conn=sqlite3.connect(f'file:{ROOT}/cybertrust.db?mode=ro',uri=True)
out['original_database_counts']={t:conn.execute(f'SELECT COUNT(*) FROM {t}').fetchone()[0] for t in ['scan_records','scam_analysis_records','blockchain_registration_records']}
out['original_database_test_patterns']={'test_scan_domains':conn.execute("SELECT COUNT(*) FROM scan_records WHERE hostname LIKE 'attest-%' OR hostname LIKE 'shared-phish-%'").fetchone()[0], 'fallback_analyses':conn.execute("SELECT COUNT(*) FROM scam_analysis_records WHERE analysis_source='rule_based_fallback'").fetchone()[0]};conn.close()
(ROOT/'hackathon-video/reports/audit-probes.json').write_text(json.dumps(out,indent=2,default=str));print(json.dumps({k:v for k,v in out.items() if k in ['ipv6_blocking','rebinding_received_path','rebinding_dns_calls','canonicalization','empty_dashboard','scam_tactics_tamper_hash_unchanged','url_evidence_tamper_hash_unchanged','unavailable_checks_risk','original_database_counts','original_database_test_patterns']},indent=2))
