# Public website and cinematic interface

The website now opens directly. There is no access-token page and no operator key in the frontend bundle. Visitors receive a short-lived signed session automatically; each can investigate URLs, analyze messages and see only their own persisted reports. The existing operator API tokens remain available for administrative integrations. Creating fresh visitor sessions does not bypass the per-IP request limit.

## Run locally

```sh
./start_demo.sh
```

The supervised launcher explicitly enables guest registration for the **localhost Hardhat demonstration only**. Public sessions are analysts by default; they cannot invoke backend blockchain signing. This local signing exception also checks development mode, the client's loopback address, local RPC and chain 31337. Do not enable `LOCAL_DEMO_GUEST_SIGNING` on a public server.

## Publish the source / host the application

GitHub stores source code. GitHub Pages can serve the frontend, but it cannot execute FastAPI, persist the database or run the blockchain service. Those require a separately hosted backend. No repository upload or deployment was performed.

For a separately hosted API, build the frontend with its HTTPS address:

```sh
VITE_API_BASE_URL=https://your-api.example npm run build --prefix frontend
```

For GitHub Pages under a repository subpath, also set the base path:

```sh
VITE_BASE_PATH=/your-repository/ VITE_API_BASE_URL=https://your-api.example npm run build --prefix frontend
```

Serve the generated `frontend/dist/`. For hosting the frontend and API behind the same origin, omit `VITE_API_BASE_URL`; production uses same-origin `/api` requests. Configure backend CORS to the exact website origin. Use HTTPS for the site and API.

Set these **server-side** settings:

- `VISITOR_SESSIONS_ENABLED=True`
- `VISITOR_SESSION_SECRET`: a private random value of at least 32 characters, shared by the backend's workers and retained across restarts. Generate one locally with Python's `secrets.token_urlsafe(48)`; never commit it or put it in a `VITE_` variable.
- `LOCAL_DEMO_GUEST_SIGNING=False`
- `ENVIRONMENT=production`, `DEBUG=False`
- A real `DATABASE_URL`, unique database credentials and `USE_SQLITE_FALLBACK=False`.
- `BACKEND_CORS_ORIGINS`: JSON array containing the exact frontend origin(s).

Sessions last 24 hours and are scoped to the browser tab. Clearing browser storage or losing the session means old guest reports cannot be retrieved by that visitor; records are not deleted. Operators retain administrative access. This is a visitor workflow, not a registered-account recovery system.

Public blockchain signing is intentionally not enabled. Existing Solidity verification is a local EVM demonstration; deploy a reviewed public-chain integration before advertising that capability publicly. Resolve the remaining dependency and operational deployment blockers in `CODEX_POST_REMEDIATION_REPORT.md` before public release.

## Visual behavior

- One-time opening brand animation per browser tab.
- Floating, individually framed glass navigation with active-section highlighting.
- Section reveals using IntersectionObserver; normal browser scrolling is preserved.
- Glass highlights track the pointer; round shield cursor expands over controls.
- Touch input receives a circular tap ripple, without hiding the native text cursor.
- Reduced-motion preference skips the opening and animated transitions.
- Footer includes the current year, TECHNIX PRO and “All rights reserved.”

No animation packages or other dependencies were installed for this update. Original video assets and database records were not rewritten.

## URL classification accuracy update

Ordinary apex/www, HTTPS-upgrade and same-site redirects do not add threat points. Cross-domain redirects are informational by themselves; public-suffix boundaries include private hosting suffixes so separate tenants remain distinguishable. HTTPS downgrades, blocked network destinations and deceptive destination URL patterns remain warnings. URL query strings containing `@` are not treated as credentials, and a brand appearing inside its own domain is not automatically called impersonation. These are explainable heuristics, not a guarantee of website safety. Re-scan old reports to use the updated rules; stored evidence and registered hashes are preserved.
