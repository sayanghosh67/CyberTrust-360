import socket
from unittest.mock import Mock
import pytest
from backend.app.utils import security
from backend.app.services import headers_checker as http

PUBLIC = (socket.AF_INET, socket.SOCK_STREAM, 6, '', ('93.184.216.34',443))

@pytest.mark.parametrize('ip',['127.0.0.1','10.0.0.1','169.254.169.254','::1','::','ff02::1','::ffff:127.0.0.1','100.64.0.1','2001:db8::1'])
def test_nonpublic_addresses_blocked(ip):
    assert security.is_ip_blocked(ip)

def test_rebinding_cannot_change_connected_ip(monkeypatch):
    resolver=Mock(side_effect=[[PUBLIC],[(socket.AF_INET,socket.SOCK_STREAM,6,'',('127.0.0.1',443))]])
    monkeypatch.setattr(socket,'getaddrinfo',resolver)
    sock=Mock();sock.getpeername.return_value=('93.184.216.34',443)
    monkeypatch.setattr(socket,'socket',Mock(return_value=sock))
    assert security.connect_public('rebind.example.com',443) is sock
    assert resolver.call_count == 1
    sock.connect.assert_called_once_with(('93.184.216.34',443))

def test_private_peer_rejected(monkeypatch):
    monkeypatch.setattr(socket,'getaddrinfo',lambda *a,**kw:[PUBLIC])
    sock=Mock();sock.getpeername.return_value=('127.0.0.1',443)
    monkeypatch.setattr(socket,'socket',lambda *a:sock)
    with pytest.raises(security.SecurityValidationError):security.connect_public('example.com',443)
    sock.close.assert_called_once()

def test_mixed_dns_answers_fail_closed(monkeypatch):
    monkeypatch.setattr(socket,'getaddrinfo',lambda *a,**kw:[PUBLIC,(socket.AF_INET,socket.SOCK_STREAM,6,'',('10.0.0.1',443))])
    with pytest.raises(security.SecurityValidationError):security.connect_public('example.com',443)

def test_url_preserves_port_query_and_ipv6(monkeypatch):
    monkeypatch.setattr(security,'resolve_public_addresses',lambda *a:[PUBLIC])
    assert security.normalize_and_validate_target('https://example.com:8443/a?b=2#fragment')['canonical_url']=='https://example.com:8443/a?b=2'
    assert security.normalize_and_validate_target('https://[2606:4700::1111]:8443/a')['canonical_url']=='https://[2606:4700::1111]:8443/a'

@pytest.mark.parametrize('url',['ftp://example.com','https://a:b@example.com','https://example.com:bad','https://example.com:99999','https://example.com/\nfoo'])
def test_invalid_targets_are_validation_errors(url):
    with pytest.raises(security.SecurityValidationError):security.normalize_and_validate_target(url)

def test_header_requests_never_read_bodies(monkeypatch):
    conn=Mock();resp=Mock();resp.status=200;resp.getheaders.return_value=[('Content-Length','999999999999')];resp.read.side_effect=AssertionError('must not buffer body');conn.getresponse.return_value=resp
    monkeypatch.setattr(http,'PinnedConnection',lambda *a:conn)
    status,headers=http._request_headers('https://example.com/')
    assert status==200;resp.read.assert_not_called();conn.close.assert_called_once()

def test_header_budget(monkeypatch):
    conn=Mock();conn.getresponse.return_value.getheaders.return_value=[('X-Large','x'*32769)]
    monkeypatch.setattr(http,'PinnedConnection',lambda *a:conn)
    with pytest.raises(ValueError):http._request_headers('https://example.com/')

def test_relative_redirect_resolution(monkeypatch):
    monkeypatch.setattr(socket,'getaddrinfo',lambda *a,**kw:[PUBLIC])
    call=Mock(side_effect=[(302,{'location':'../result?q=1'}),(200,{})]);monkeypatch.setattr(http,'_request_headers',call)
    result=http._inspect('https://example.com/path/start','example.com')
    assert result.redirect_chain[-1]=='https://example.com/result?q=1'
    assert result.status_code==200

def test_redirect_private_destination_never_requested(monkeypatch):
    monkeypatch.setattr(socket,'getaddrinfo',lambda *a,**kw:[PUBLIC])
    call=Mock(return_value=(302,{'location':'http://127.0.0.1/private'}));monkeypatch.setattr(http,'_request_headers',call)
    result=http._inspect('https://example.com/','example.com')
    assert result.suspicious_redirect and result.error_message
    assert call.call_count==1

def test_tls_uses_pinned_connector(monkeypatch):
    from backend.app.services import ssl_checker
    connect=Mock(side_effect=security.SecurityValidationError('blocked'))
    monkeypatch.setattr(ssl_checker,'connect_public',connect)
    result=ssl_checker._sync_inspect_ssl('example.com',443)
    connect.assert_called_once_with('example.com',443,timeout=4.0)
    assert not result.valid

@pytest.mark.parametrize('ip',['64:ff9b::7f00:1','2002:7f00:1::','2001:0:4136:e378:8000:63bf:3fff:fdd2'])
def test_ipv6_transition_bypasses_blocked(ip):
    assert security.is_ip_blocked(ip)

def test_zero_port_rejected():
    with pytest.raises(security.SecurityValidationError):security.normalize_and_validate_target('https://example.com:0')

def test_get_fallback_also_ignores_body(monkeypatch):
    conn=Mock();response=conn.getresponse.return_value;response.status=200;response.getheaders.return_value=[]
    monkeypatch.setattr(http,'PinnedConnection',lambda *a:conn)
    http._request_headers('https://example.com/',method='GET')
    response.read.assert_not_called()

def test_dns_capacity_fails_closed(monkeypatch):
    monkeypatch.setattr(security,'_dns_slots',Mock(acquire=Mock(return_value=False)))
    with pytest.raises(socket.gaierror):security.resolve_public_addresses('example.com',443)

def test_real_loopback_canary_receives_no_rebinding_request(monkeypatch):
    from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
    import threading
    received=[]
    class Handler(BaseHTTPRequestHandler):
        def do_HEAD(self):
            received.append(self.path);self.send_response(200);self.end_headers()
        def log_message(self,*args):pass
    server=ThreadingHTTPServer(('127.0.0.1',0),Handler)
    thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
    port=server.server_address[1]
    resolver=Mock(side_effect=[[(socket.AF_INET,socket.SOCK_STREAM,6,'',('93.184.216.34',port))],[(socket.AF_INET,socket.SOCK_STREAM,6,'',('127.0.0.1',port))]])
    monkeypatch.setattr(socket,'getaddrinfo',resolver)
    try:
        result=http._inspect(f'http://canary.example.com:{port}/private','canary.example.com')
        assert result.error_message and 'blocked' in result.error_message
        assert received==[] and resolver.call_count==2
    finally:
        server.shutdown();server.server_close();thread.join(timeout=2)
