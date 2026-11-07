import socket
from unittest.mock import Mock
import pytest
from backend.app.services import headers_checker as headers
from backend.app.services.risk_engine import evaluate_risk
from backend.app.services.url_analyzer import analyze_url
from backend.app.schemas.scan import DNSAnalysis,SSLAnalysis,HeadersAnalysis,ThreatIntelSource

PUBLIC=[(socket.AF_INET,socket.SOCK_STREAM,6,'',('93.184.216.34',443))]
def score(url, response, intel=None):
    return evaluate_risk(analyze_url(url),DNSAnalysis(status='resolved'),SSLAnalysis(https_available=True,valid=True),response,intel or [],[])

@pytest.mark.parametrize('start,end',[
 ('https://wikipedia.org/','https://www.wikipedia.org/'),
 ('https://www.example.com/','https://example.com/'),
 ('https://example.co.uk/','https://www.example.co.uk/'),
 ('https://example.com/','https://accounts.example.com/login'),
 ('http://example.com/','https://www.example.com/'),
])
def test_same_site_redirects_are_not_suspicious(monkeypatch,start,end):
    monkeypatch.setattr(socket,'getaddrinfo',lambda *a,**kw:PUBLIC)
    monkeypatch.setattr(headers,'_request_headers',Mock(side_effect=[(301,{'location':end}),(200,{'strict-transport-security':'max-age=31536000'})]))
    result=headers._inspect(start,start.split('/')[2])
    assert result.redirect_count==1 and result.redirect_chain[-1]==end
    assert not result.suspicious_redirect and not result.cross_domain_redirect
    assessment=score(start,result)
    assert assessment[0]=='Low Risk' and assessment[1]==0

@pytest.mark.parametrize('start,end',[
 ('https://example.com/','https://other-example.org/'),
 ('https://alice.github.io/','https://bob.github.io/'),
 ('https://example.co.uk/','https://other.co.uk/'),
 ('https://example.com/','https://example.com.attacker.org/'),
])
def test_external_domain_is_not_automatically_a_threat(start,end):
    external,downgrade,deceptive,notes=headers.assess_redirect(start,end)
    assert external and not downgrade and not deceptive
    result=score(start,HeadersAnalysis(status_code=200,hsts_present=True,cross_domain_redirect=external,redirect_chain=[start,end],redirect_notes=notes))
    assert result[0]=='Low Risk' and result[1]==0
    assert any(i.name=='Cross-Domain Redirect Observed' and i.severity=='info' for i in result[4])

def test_https_downgrade_is_still_a_security_warning(monkeypatch):
    monkeypatch.setattr(socket,'getaddrinfo',lambda *a,**kw:PUBLIC)
    monkeypatch.setattr(headers,'_request_headers',Mock(side_effect=[(302,{'location':'http://www.example.com/'}),(200,{})]))
    result=headers._inspect('https://example.com/','example.com')
    assert result.https_downgrade and result.suspicious_redirect
    assert score('https://example.com/',result)[0]=='Suspicious'

def test_redirect_to_deceptive_brand_pattern_is_flagged():
    external,downgrade,deceptive,notes=headers.assess_redirect('https://example.com/','https://paypa1-account-login-update.com/')
    assert external and deceptive and not downgrade

def test_provider_verdict_not_suppressed_by_www_redirect():
    result=score('https://wikipedia.org/',HeadersAnalysis(status_code=200,hsts_present=True),[ThreatIntelSource(provider='fixture',status='malicious')])
    assert result[0]=='Confirmed Malicious'

def test_failed_checks_are_still_inconclusive():
    result=evaluate_risk(analyze_url('https://wikipedia.org/'),DNSAnalysis(status='resolved'),SSLAnalysis(valid=True),HeadersAnalysis(),[],[])
    assert result[0]=='Inconclusive'

def test_at_sign_in_query_is_not_embedded_credentials():
    result=analyze_url('https://example.com/search?email=person@example.org')
    assert not any("'@'" in pattern for pattern in result.suspicious_patterns)

def test_brand_in_its_own_subdomain_is_not_impersonation():
    result=analyze_url('https://google.accounts.google.com/')
    assert not any('brand name' in pattern for pattern in result.suspicious_patterns)
    assert any('brand name' in pattern for pattern in analyze_url('https://google.accounts.attacker.org/').suspicious_patterns)

def test_public_ip_alone_does_not_make_a_site_suspicious():
    result=score('https://8.8.8.8/',HeadersAnalysis(status_code=200,hsts_present=True))
    assert result[0]=='Low Risk' and result[1]<25
