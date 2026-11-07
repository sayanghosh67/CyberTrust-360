"""Explicit API principals, per-process quotas and payload limits.

Use one worker for the built-in limiter; a public multi-worker deployment also needs
an ingress/global limiter. Public visitors receive signed, scoped identities; no
operator secret is bundled in the frontend.
"""
import asyncio
import hashlib
import hmac
import time
from collections import OrderedDict, deque
from starlette.requests import Request
from starlette.responses import JSONResponse
from backend.app.core.config import settings
from backend.app.core.visitor import issue_visitor, verify_visitor
from urllib.parse import urlsplit

class AccessMiddleware:
    def __init__(self, app):
        self.app = app
        self.buckets = OrderedDict()
        self.active = 0

    def allowed(self, key, limit):
        now = time.monotonic()
        bucket = self.buckets.setdefault(key, deque())
        self.buckets.move_to_end(key)
        while bucket and bucket[0] <= now - 60:
            bucket.popleft()
        if len(self.buckets) > 10000:
            self.buckets.popitem(last=False)
        if len(bucket) >= limit:
            return False
        bucket.append(now)
        return True

    async def __call__(self, scope, receive, send):
        if scope['type'] != 'http':
            return await self.app(scope, receive, send)
        path = scope['path']
        if path in {'/', '/health', '/api/health'} or scope['method'] == 'OPTIONS':
            return await self.app(scope, receive, send)
        request = Request(scope, receive)
        async def reject(code, message):
            await JSONResponse({'detail': message, 'error_code': f'HTTP_{code}'}, status_code=code,
                               headers={'Retry-After':'60'} if code==429 else {})(scope, receive, send)
        ip = scope.get('client', ('unknown', 0))[0]
        if not self.allowed('ip:'+ip, settings.API_IP_RATE_LIMIT):
            return await reject(429, 'Request rate limit exceeded.')
        if path == '/api/v1/access/session' and scope['method'] == 'POST':
            if not settings.VISITOR_SESSIONS_ENABLED:
                return await reject(503, 'Public sessions are disabled.')
            origin = request.headers.get('origin')
            if origin and origin not in settings.BACKEND_CORS_ORIGINS:
                return await reject(403, 'This website origin is not allowed.')
            if not self.allowed('session:'+ip, 12):
                return await reject(429, 'Too many new sessions. Please wait a minute.')
            visitor_token, expires = issue_visitor()
            return await JSONResponse({'access_token': visitor_token, 'expires_at': expires}, headers={'Cache-Control':'no-store'})(scope, receive, send)
        if not settings.API_AUTH_TOKENS and not settings.VISITOR_SESSIONS_ENABLED:
            return await reject(503, 'API access is not configured.')
        header = request.headers.get('authorization', '')
        token = header[7:] if header.startswith('Bearer ') else ''
        principal = None
        for configured, identity in settings.API_AUTH_TOKENS.items():
            if hmac.compare_digest(token.encode(), configured.encode()):
                principal = dict(identity)
        if principal is None and settings.VISITOR_SESSIONS_ENABLED:
            principal = verify_visitor(token)
            # Explicit opt-in for the loopback-only demonstration, never a public default.
            rpc = urlsplit(settings.BLOCKCHAIN_RPC_URL)
            if principal and settings.LOCAL_DEMO_GUEST_SIGNING and settings.ENVIRONMENT == 'development' and ip in {'127.0.0.1', '::1'} and rpc.hostname in {'127.0.0.1', '::1'} and settings.BLOCKCHAIN_CHAIN_ID == 31337:
                principal['role'] = 'registrar'
        if principal is None:
            return await reject(401, 'A valid API access token is required.')
        if not self.allowed('user:'+principal['id'], settings.API_RATE_LIMIT):
            return await reject(429, 'Request rate limit exceeded.')
        role = principal['role']
        if scope['method'] not in {'GET','HEAD'}:
            signing = '/blockchain/register/' in path
            allowed = {'admin','registrar'} if signing else {'admin','analyst','registrar'}
            if role not in allowed:
                return await reject(403, 'This access role cannot perform that action.')
        scope.setdefault('state', {})['principal'] = principal
        if scope['method'] in {'POST','PUT','PATCH'}:
            body = bytearray()
            try:
                async with asyncio.timeout(5):
                    async for chunk in request.stream():
                        if len(body)+len(chunk) > settings.API_MAX_BODY_BYTES:
                            return await reject(413, 'Request body is too large.')
                        body.extend(chunk)
            except TimeoutError:
                return await reject(408, 'Request body deadline exceeded.')
            original_receive = receive
            sent = False
            async def bounded_receive():
                nonlocal sent
                if not sent:
                    sent = True
                    return {'type':'http.request','body':bytes(body),'more_body':False}
                return await original_receive()
            receive = bounded_receive
        if self.active >= 8:
            return await reject(429, 'Concurrent request limit exceeded.')
        self.active += 1
        try:
            return await self.app(scope, receive, send)
        finally:
            self.active -= 1
