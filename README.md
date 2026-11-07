# CyberTrust 360

> **AI-Powered Web Threat Detection & Digital Trust Intelligence Platform**  
> Developed by **TECHNIX PRO** | 48-Hour Hackathon MVP

---

## Overview

CyberTrust 360 is an enterprise intelligence platform engineered to identify malicious web infrastructure, protect users against sophisticated phishing campaigns, analyze SSL/TLS cryptographic integrity, and calculate transparent, explainable trust scores for web domains.

---

## Phase 2 Highlights: Core Web Threat Investigation Engine

In Phase 2, the core threat investigation engine is fully operational:
- **Real-Time URL Analysis**: Detects raw IP hosts, suspicious embedded `@` characters, excessive subdomains, brand-in-subdomain spoofing, and typosquatting against high-value targets (e.g. PayPal, Microsoft, Apple, Google, Binance).
- **DNS & Network Infrastructure**: Resolves A (IPv4), AAAA (IPv6), MX, TXT, and NS records. Identifies resolution failures and decommissioned infrastructure.
- **SSL/TLS Cryptographic Analysis**: Live inspection of certificate validity, remaining lifespan (days to expiry), issuer verification, subject alternative names (SANs), TLS protocol version (TLSv1.3), and negotiated cipher suites.
- **HTTP Security Headers & Redirect Auditing**: Audits HSTS, CSP, X-Frame-Options, X-Content-Type-Options, and Referrer-Policy. Inspects redirect hops with per-hop SSRF validation.
- **Threat Intelligence Aggregation**: Integration-ready multi-feed connector supporting Google Safe Browsing, URLhaus (abuse.ch open intelligence), PhishTank, and VirusTotal.
- **Explainable 0–100 Risk Scoring**: Assigns transparent classifications (*Low Risk*, *Suspicious*, *High Risk*, *Confirmed Malicious*, *Inconclusive*) with granular technical evidence, confidence level, and actionable defensive guidance.
- **Strict SSRF Guardrails**: Blocks private IPv4 (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), loopback (`127.0.0.0/8`), cloud metadata (`169.254.169.254`), carrier-grade NAT, and internal hostnames.
- **Database Persistence**: Automatic storage of investigation reports in PostgreSQL with transparent SQLite fallback when Docker is offline.

---

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite 8, Tailwind CSS v4, Lucide Icons
- **Backend**: Python 3.11+, FastAPI, Pydantic v2, dnspython, tldextract, httpx, Uvicorn
- **Database**: PostgreSQL 16 (Alpine), SQLAlchemy 2.1 ORM, Alembic migrations, SQLite fallback
- **Security**: Comprehensive SSRF guardrails, environment isolation

---

## Quick Start

### 1. Prerequisites
- **Node.js**: v18+ (v20+ recommended)
- **Python**: 3.11+
- **Docker & Docker Compose** (optional for containerized PostgreSQL)

---

### 2. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

To enable optional live threat intelligence feeds, add your API keys in `.env`:
```env
# Optional Threat Intelligence Provider Keys (Phase 2)
GOOGLE_SAFE_BROWSING_API_KEY=your_google_api_key_here
VIRUSTOTAL_API_KEY=your_virustotal_api_key_here
PHISHTANK_API_KEY=your_phishtank_api_key_here
URLHAUS_ENABLED=True
```
*(If a provider key is omitted, the platform transparently displays "Not configured" without inventing fake results).*

---

### 3. Backend Setup & Execution

```bash
# 1. Activate Python 3.11 virtual environment
source backend/.venv/bin/activate

# 2. Install dependencies (if not already installed)
pip install -r backend/requirements.txt

# 3. Start the FastAPI development server
uvicorn backend.app.main:app --reload --port 8000
```
- **API Root**: [http://localhost:8000/](http://localhost:8000/)
- **Health Check**: [http://localhost:8000/api/health](http://localhost:8000/api/health)
- **Interactive Documentation**: [http://localhost:8000/docs](http://localhost:8000/docs)

---

### 4. Frontend Setup & Execution

```bash
# 1. Navigate to frontend directory
cd frontend

# 2. Install dependencies
npm install

# 3. Launch Vite development server
npm run dev
```
- **Web Application**: [http://localhost:5173/](http://localhost:5173/)

---

### 5. PostgreSQL via Docker Compose (Optional)

```bash
# Start PostgreSQL service in background
docker compose up -d

# Verify container status
docker compose ps
```
*(If Docker is not running, the application automatically persists scans to local SQLite `./cybertrust.db` with zero downtime).*

---

### 6. Running Automated Tests

```bash
# Run backend test suite (12 tests covering SSRF, typosquatting, headers, SSL, and risk scoring)
PYTHONPATH=. backend/.venv/bin/pytest backend/tests -v

# Run frontend TypeScript typecheck and production build
cd frontend && npm run build
```

---

## Available API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/v1/scans` | Submit a target URL for comprehensive threat investigation. |
| `GET` | `/api/v1/scans/{scan_id}` | Retrieve full forensic telemetry and indicators by scan ID. |
| `GET` | `/api/v1/scans` | List recent scan history with summary metrics and risk scores. |
| `GET` | `/api/health` | Health telemetry (server status, database connection, uptime). |
| `GET` | `/docs` | Interactive Swagger UI API documentation. |

---

## Testing Targets (Sample Scenarios)

The dashboard provides convenient 1-click test targets:
- `https://example.com` — Benign standard baseline (Low Risk, valid SSL).
- `https://wikipedia.org` — Enterprise baseline (Low Risk, HSTS enabled).
- `https://paypa1-account-login-update.com` — Typosquatting of PayPal brand + hyphenation (High Risk).
- `https://paypal.com.account-update.xyz` — Subdomain brand impersonation trick (High Risk).

---

## Team

**TECHNIX PRO**  
Built for the 48-Hour Hackathon.
