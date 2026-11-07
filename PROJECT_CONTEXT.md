# PROJECT CONTEXT: CyberTrust 360

> **Team / Developer Branding**: TECHNIX PRO  
> **Project Title**: CyberTrust 360 — AI-Powered Web Threat Detection & Digital Trust Intelligence Platform  
> **Hackathon Timeline**: 48-Hour Rapid MVP  
> **Current Milestone**: Phase 4 — Threat Relationship Intelligence & Scam Relationship Map (Completed)  
> **Source of Truth**: This document serves as the persistent architectural reference for all future AI and engineering sessions.

---

## 1. Project Objective

CyberTrust 360 is an enterprise-grade digital trust and threat intelligence platform designed to counteract sophisticated modern web threats. It evaluates untrusted domains, malicious infrastructure, phishing campaigns, and deceptive web entities through:
1. **Multi-Vector AI Threat Analysis**: Non-invasive heuristic, cryptographic, and structural inspection across domain names, DNS infrastructure, SSL/TLS certificates, and HTTP response headers.
2. **Digital Trust Intelligence**: Transparent 0–100 risk scoring with granular evidence, severity classification, and actionable defensive guidance.
3. **Multi-Source Threat Intelligence**: Configurable integration with Google Safe Browsing, URLhaus (abuse.ch), PhishTank, and VirusTotal.
4. **Threat Relationship Intelligence (Phase 4)**: Multi-hop graph correlation mapping shared malicious domains, burner phone numbers, UPI payment handles, and deceptive playbooks into an interactive React Flow graph.
5. **Immutable Threat Attestation (Phase 5)**: EVM-compatible blockchain verification ensuring audit-grade provenance of threat indicators and scan verdicts.

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
| `POST` | `/api/v1/scam/analyze` | AI Scam DNA sequencing for SMS, WhatsApp, emails, and job offers. |
| `GET` | `/api/v1/scam/analyses` | List recent Scam DNA analysis records and risk classifications. |
| `GET` | `/api/v1/scam/analyses/{analysis_id}` | Retrieve specific Scam DNA forensic report by UUID. |
| `POST` | `/api/v1/scam/guidance` | Action-specific incident response guidance (5 situational states). |
| `GET` | `/api/v1/intelligence/graph` | Multi-entity interactive threat graph with verified vs inferred edges. |
| `GET` | `/api/v1/intelligence/relationships/{report_id}` | 1-hop and 2-hop connected reports and shared indicators for a report. |
| `GET` | `/api/v1/intelligence/indicators` | Aggregated recurring threat indicators (shared domains, phones, UPI). |
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
│   │   │   ├── scan.py       # ScanRecord table model
│   │   │   └── scam.py       # ScamAnalysisRecord table model
│   │   ├── schemas/
│   │   │   ├── health.py     # Health response schemas
│   │   │   ├── scan.py       # ScanCreate, ScanResponse, Indicator schemas
│   │   │   └── scam.py       # ScamAnalyzeRequest, ScamAnalysisResponse schemas
│   │   ├── services/
│   │   │   ├── url_analyzer.py              # URL structure & typosquatting engine
│   │   │   ├── dns_checker.py               # DNS record queries (A, AAAA, MX, NS)
│   │   │   ├── ssl_checker.py               # SSL certificate & cipher inspector
│   │   │   ├── headers_checker.py           # HTTP headers & redirect chain auditor
│   │   │   ├── threat_intel.py              # Threat intelligence aggregator
│   │   │   ├── risk_engine.py               # Modular 0-100 risk scoring
│   │   │   ├── scam_extractor.py            # Regex entity extractor (URLs, UPI, phones, brands)
│   │   │   ├── scam_rules.py                # Deterministic Indian & global scam intelligence
│   │   │   ├── llm_analyzer.py              # Gemini/OpenAI integration with prompt fencing
│   │   │   ├── safety_guidance.py           # Incident response guidance & 1930 portal
│   │   │   └── investigation_orchestrator.py# Concurrent pipeline coordinator
│   │   └── utils/
│   │       └── security.py   # SSRF defense, IP validation, canonicalization
│   ├── tests/
│   │   ├── test_health.py           # Health check & error handling tests
│   │   ├── test_investigation.py    # 14 comprehensive unit & forensic tests
│   │   └── test_scam_analyzer.py    # 13 Scam DNA, Indian fraud & LLM tests
│   └── requirements.txt
│
└── frontend/
    ├── src/
    │   ├── types/
    │   │   ├── health.ts     # Health state types
    │   │   ├── scan.ts       # Full scan & indicator TypeScript types
    │   │   └── scam.ts       # Scam DNA & safety guidance TypeScript types
    │   ├── services/
    │   │   ├── api.ts        # Base HTTP fetch client
    │   │   ├── scanService.ts# Typed scan investigation client
    │   │   └── scamService.ts# Typed scam analysis client
    │   ├── components/
    │   │   ├── Header.tsx            # Header with live pulse status & phase navigation
    │   │   ├── ThreatSearchHero.tsx  # Active investigation input & progress ticker
    │   │   ├── InvestigationReport.tsx# Multi-tab forensic report & risk meter
    │   │   ├── RecentScansList.tsx   # Recent database scan history list
    │   │   ├── ScamDnaAnalyzer.tsx   # Scam DNA input workbench & presets
    │   │   ├── ScamDnaReport.tsx     # Scam tactics quote box & extracted indicators
    │   │   ├── WhatShouldIDoNow.tsx  # 5-situation interactive incident guidance card
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

# 2. Run automated test suite (36 comprehensive tests across URL Engine, Scam DNA, and Threat Relationship Graph)
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

- **Phase 1**: Project Foundation (Completed)
- **Phase 2**: Core URL & Website Investigation Engine (Completed)
- **Phase 3**: AI Scam DNA Intelligence & Incident Guidance Protocol (Completed)
- **Phase 4**: Threat Relationship Intelligence & Interactive Scam Relationship Map (Completed)
- **Phase 5**: Immutable On-Chain Trust Attestation & Smart Contracts (EVM / Hardhat / Solidity — Not Started)
