# PROJECT CONTEXT: CyberTrust 360

> **Team / Developer Branding**: TECHNIX PRO  
> **Project Title**: CyberTrust 360 — AI-Powered Web Threat Detection & Digital Trust Intelligence Platform  
> **Hackathon Timeline**: 48-Hour Rapid MVP  
> **Current Milestone**: Phase 2 — Core URL & Website Investigation Engine (Completed)  
> **Source of Truth**: This document serves as the persistent architectural reference for all future AI and engineering sessions.

---

## 1. Project Objective

CyberTrust 360 is an enterprise-grade digital trust and threat intelligence platform designed to counteract sophisticated modern web threats. It evaluates untrusted domains, malicious infrastructure, phishing campaigns, and deceptive web entities through:
1. **Multi-Vector AI Threat Analysis**: Non-invasive heuristic, cryptographic, and structural inspection across domain names, DNS infrastructure, SSL/TLS certificates, and HTTP response headers.
2. **Digital Trust Intelligence**: Transparent 0–100 risk scoring with granular evidence, severity classification, and actionable defensive guidance.
3. **Multi-Source Threat Intelligence**: Configurable integration with Google Safe Browsing, URLhaus (abuse.ch), PhishTank, and VirusTotal.
4. **Immutable Threat Attestation (Phase 4)**: EVM-compatible blockchain verification ensuring audit-grade provenance of threat indicators and scan verdicts.

---

## 2. System Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Client Dashboard Layer                          │
│               React 19 + TypeScript + Vite + Tailwind CSS              │
│   (Interactive URL Input, Real-time Scanning Ticker, Forensic Report,  │
│      Multi-tab Evidence Explorer, Dynamic Telemetry, History Drawer)   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / REST (CORS Enabled)
┌───────────────────────────────────▼────────────────────────────────────┐
│                         FastAPI Gateway Layer                          │
│                   Python 3.11+ / Pydantic v2 / Uvicorn                 │
│                                                                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │               Core URL Investigation Engine                    │   │
│   │                                                                │   │
│   │  • Input Sanitizer & Strict SSRF Guard (RFC 1918, Loopback)    │   │
│   │  • URL Structural & Typosquatting Analyzer (tldextract/difflib)│   │
│   │  • Asynchronous DNS Resolver (A, AAAA, MX, TXT, NS records)    │   │
│   │  • SSL/TLS Inspector (Certificate Validity, Expiry, Cipher)    │   │
│   │  • HTTP Security Header & Redirect Chain Auditor (HSTS/CSP)    │   │
│   │  • Multi-Feed Threat Intelligence Aggregator (URLhaus, etc.)   │   │
│   │  • Modular Explainable Risk Assessment Engine (0–100 Score)    │   │
│   └────────────────────────────────────────────────────────────────┘   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ SQLAlchemy 2.0 ORM
┌───────────────────────────────────▼────────────────────────────────────┐
│                       Data Persistence Layer                           │
│     • Primary: PostgreSQL 16 Alpine (via Docker Compose)               │
│     • Resilient Fallback: SQLite 3 (Automatic when Docker is offline)  │
│     • Model: ScanRecord (UUID, target, classification, full JSON)      │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Technology Stack

### Frontend
- **Framework**: React 19 (TypeScript, strict mode, `verbatimModuleSyntax`)
- **Bundler & Dev Server**: Vite 8
- **Styling**: Tailwind CSS v4 (`@tailwindcss/vite`)
- **Icons**: Lucide React
- **Services**: Typed REST service (`scanService.ts`, `api.ts`) with `AbortController` timeout protection (20s scan ceiling, 6s health probe)

### Backend
- **Runtime**: Python 3.11+
- **Framework**: FastAPI (v0.162.0+)
- **Validation**: Pydantic v2 & Pydantic-Settings
- **DNS Engine**: `dnspython>=2.6.0`
- **Domain Extraction**: `tldextract>=5.1.0`
- **HTTP Client**: `httpx>=0.28.0` with manual redirect loop control and per-hop SSRF validation
- **Cryptography / SSL**: Python standard library `ssl` and `socket`
- **ORM**: SQLAlchemy 2.1+, Alembic 1.20+
- **Drivers**: `psycopg` (binary v3) & `psycopg2-binary`
- **Testing**: Pytest 9, Pytest-Asyncio, HTTPX TestClient

---

## 4. API Endpoints Specification

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/v1/scans` | Submit target URL for multi-vector threat investigation. |
| `GET` | `/api/v1/scans/{scan_id}` | Retrieve comprehensive technical forensic report by scan UUID. |
| `GET` | `/api/v1/scans` | List recent scan history with summary metrics and risk scores. |
| `GET` | `/api/health` | System health check (API status, DB connectivity, uptime, version). |
| `GET` | `/health` | Direct container / orchestration health check probe. |
| `GET` | `/` | Platform metadata and discovery root. |

---

## 5. Security & SSRF Guardrails

All user-submitted URLs are treated as strictly untrusted:
1. **Network Range Blacklisting**: Blocks private IPv4 (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), loopback (`127.0.0.0/8`, `::1`), link-local / cloud metadata (`169.254.169.254`), carrier-grade NAT, and multicast.
2. **DNS Pre-Validation**: Hostnames are resolved before connection; if any resolved IP belongs to a blocked subnet, the request is immediately aborted with HTTP 400.
3. **Redirect Hop Verification**: Every single hop in a redirect chain is independently validated against SSRF guardrails before following.
4. **Port Restrictions**: Connections restricted to standard web ports (80, 443).
5. **Secret Protection**: Threat intelligence API keys remain exclusively on the backend (`.env`).

---

## 6. Risk Scoring & Classification Model

The risk assessment engine calculates a transparent 0–100 score based on verifiable technical signals:

### Classification Tiers
- **Low Risk (0–24)**: No critical threat flags; valid TLS certificates and standard web records.
  - *Mandatory Disclaimer: "A Low Risk result does not guarantee that a website is safe. Absence of known threats is not proof of safety."*
- **Suspicious (25–49)**: Irregularities detected (e.g., brand-in-subdomain, excessive hyphens, missing HSTS, shortener).
- **High Risk (50–79)**: Significant threat signals (e.g., typosquatting of major brands, expired SSL, hostname mismatch, suspicious off-domain redirect).
- **Confirmed Malicious (80–100)**: Active malware/phishing confirmation from threat intelligence feeds (e.g., URLhaus).
- **Inconclusive**: Target domain fails DNS resolution (NXDOMAIN / unregistered / decommissioned).

---

## 7. Directory Structure

```
HACKMATRIX/
├── .env.example              # Master configuration template with threat intel keys
├── .gitignore                # Security-focused ignore rules
├── docker-compose.yml        # PostgreSQL 16 container definition
├── PROJECT_CONTEXT.md        # Persistent architecture reference (this file)
├── README.md                 # Complete setup, testing, and execution guide
│
├── database/
│   └── init.sql              # Database initialization script
│
├── docs/
│   └── screenshots/          # Captured UI screenshots of working dashboard
│
├── backend/
│   ├── alembic/              # Alembic migration configuration
│   ├── app/
│   │   ├── api/
│   │   │   ├── health.py     # GET /api/health
│   │   │   ├── scans.py      # POST & GET /api/v1/scans
│   │   │   └── router.py     # Central router dispatcher
│   │   ├── core/
│   │   │   ├── config.py     # Pydantic settings & threat intel env keys
│   │   │   └── database.py   # PostgreSQL engine with resilient SQLite fallback
│   │   ├── models/
│   │   │   ├── base.py       # SQLAlchemy DeclarativeBase
│   │   │   └── scan.py       # ScanRecord table model
│   │   ├── schemas/
│   │   │   ├── health.py     # Health response schemas
│   │   │   └── scan.py       # ScanCreate, ScanResponse, Indicator schemas
│   │   ├── services/
│   │   │   ├── url_analyzer.py              # URL structure & typosquatting engine
│   │   │   ├── dns_checker.py               # DNS record queries (A, AAAA, MX, NS)
│   │   │   ├── ssl_checker.py               # SSL certificate & cipher inspector
│   │   │   ├── headers_checker.py           # HTTP headers & redirect chain auditor
│   │   │   ├── threat_intel.py              # Threat intelligence aggregator
│   │   │   ├── risk_engine.py               # Modular 0-100 risk scoring
│   │   │   └── investigation_orchestrator.py# Concurrent pipeline coordinator
│   │   └── utils/
│   │       └── security.py   # SSRF defense, IP validation, canonicalization
│   ├── tests/
│   │   ├── test_health.py    # Health check & error handling tests
│   │   └── test_investigation.py # 12 comprehensive unit & forensic tests
│   └── requirements.txt
│
└── frontend/
    ├── src/
    │   ├── types/
    │   │   ├── health.ts     # Health state types
    │   │   └── scan.ts       # Full scan & indicator TypeScript types
    │   ├── services/
    │   │   ├── api.ts        # Base HTTP fetch client
    │   │   └── scanService.ts# Typed scan investigation client
    │   ├── components/
    │   │   ├── Header.tsx            # Header with live pulse status
    │   │   ├── ThreatSearchHero.tsx  # Active investigation input & progress ticker
    │   │   ├── InvestigationReport.tsx# Multi-tab forensic report & risk meter
    │   │   ├── RecentScansList.tsx   # Recent database scan history list
    │   │   ├── BackendStatusCard.tsx # Infrastructure telemetry
    │   │   ├── FoundationSpecCard.tsx# Architecture & security specifications
    │   │   └── Footer.tsx            # Technix Pro branding
    │   └── pages/
    │       └── LandingPage.tsx       # Core application dashboard view
    └── package.json
```

---

## 8. Development & Testing Commands

```bash
# 1. Activate backend virtual environment
source backend/.venv/bin/activate

# 2. Run automated test suite (12 tests)
PYTHONPATH=. backend/.venv/bin/pytest backend/tests -v

# 3. Start backend server (port 8000)
uvicorn backend.app.main:app --reload --port 8000

# 4. Start frontend server (port 5173)
cd frontend && npm run dev

# 5. Build frontend production bundle
cd frontend && npm run build
```

---

## 9. Next Planned Milestones

- **Phase 3**: AI Scam DNA & Pattern Clustering Engine
- **Phase 4**: Immutable On-Chain Trust Attestation & Smart Contracts
