"""Short-lived, signed visitor identities. No administrator secret reaches the browser."""
import hashlib
import hmac
import secrets
import time
from backend.app.core.config import settings

# Persist a random >=32-character VISITOR_SESSION_SECRET across workers/restarts in hosting.
_process_secret = secrets.token_urlsafe(48)

def _key():
    return (settings.VISITOR_SESSION_SECRET or _process_secret).encode()

def issue_visitor():
    identifier=secrets.token_hex(16)
    expires=int(time.time())+86400
    payload=f'visitor.{identifier}.{expires}'
    signature=hmac.new(_key(),payload.encode(),hashlib.sha256).hexdigest()
    return f'{payload}.{signature}',expires

def verify_visitor(token):
    try:
        prefix,identifier,expiry,signature=token.split('.')
        if prefix!='visitor' or len(identifier)!=32 or any(c not in '0123456789abcdef' for c in identifier):return None
        if not int(time.time()) < int(expiry) <= int(time.time())+86400:return None
        expected=hmac.new(_key(),f'{prefix}.{identifier}.{expiry}'.encode(),hashlib.sha256).hexdigest()
        if not hmac.compare_digest(signature,expected):return None
        return {'id':'visitor:'+identifier,'role':'analyst'}
    except (ValueError,TypeError):return None
