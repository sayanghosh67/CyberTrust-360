# PROJECT CONTEXT: CyberTrust 360

> **Team / Developer Branding**: TECHNIX PRO  
> **Project Title**: CyberTrust 360 — AI-Powered Web Threat Detection & Digital Trust Intelligence Platform  
> **Hackathon Timeline**: 48-Hour Rapid MVP  
> **Current Milestone**: Phase 5 — Blockchain Threat Report Integrity & Decentralized Verification (Completed & Verified)  
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
| `GET` | `/api/v1/blockchain/status` | EVM connection status, block height, chain ID, registry address. |
| `POST` | `/api/v1/blockchain/register/{report_id}` | Calculate SHA-256 canonical digest and commit attestation on-chain. |
| `GET` | `/api/v1/blockchain/verify/{report_id}` | Compare live report digest against immutable on-chain record. |
| `POST` | `/api/v1/blockchain/demo/tamper/{report_id}` | Controlled in-memory modification testing cryptographic tamper detection. |
| `GET` | `/api/v1/blockchain/registrations` | Paginated history of confirmed on-chain threat attestations. |
| `GET` | `/api/v1/blockchain/registrations/{report_id}` | Fetch specific on-chain attestation record and transaction hash. |
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
│   │   ├── test_scam_analyzer.py    # 13 Scam DNA, Indian fraud & LLM tests
│   │   └── test_intelligence_graph.py # 9 relationship intelligence & correlation tests
│   └── requirements.txt
│
└── frontend/
    ├── src/
    │   ├── types/
    │   │   ├── health.ts     # Health state types
    │   │   ├── scan.ts       # Full scan & indicator TypeScript types
    │   │   ├── scam.ts       # Scam DNA & safety guidance TypeScript types
    │   │   └── intelligence.ts# Graph nodes, edges & recurring indicators types
    │   ├── services/
    │   │   ├── api.ts        # Base HTTP fetch client
    │   │   ├── scanService.ts# Typed scan investigation client
    │   │   ├── scamService.ts# Typed scam analysis client
    │   │   └── intelligenceService.ts# Typed intelligence graph API client
    │   ├── components/
    │   │   ├── Header.tsx            # Header with live pulse status & phase navigation
    │   │   ├── ThreatSearchHero.tsx  # Active investigation input & progress ticker
    │   │   ├── InvestigationReport.tsx# Multi-tab forensic report & risk meter
    │   │   ├── RecentScansList.tsx   # Recent database scan history list
    │   │   ├── ScamDnaAnalyzer.tsx   # Scam DNA input workbench & presets
    │   │   ├── ScamDnaReport.tsx     # Scam tactics quote box & extracted indicators
    │   │   ├── WhatShouldIDoNow.tsx  # 5-situation interactive incident guidance card
    │   │   ├── CyberGraphNode.tsx    # Custom React Flow cyber styled node with glow rings
    │   │   ├── GraphDetailPanel.tsx  # Forensic drawer with readable topology & evidence
    │   │   ├── ThreatRelationshipGraph.tsx # Anti-overlap clustered canvas with auto-center
    │   │   └── Footer.tsx            # Technix Pro branding
    │   └── pages/
    │       └── LandingPage.tsx       # Core application dashboard view
    └── package.json
```

---

## 8. Phase 4 Readability & Verification Highlights

1. **Anti-Overlap Clustering Layout**:
   - Computes connected components across threat entities and hub nodes (recurring domains/brands).
   - Arranges nodes in concentric shells with dynamic radii and packs clusters cleanly across a 2D grid.
   - Enforces a 15-pass iterative collision relaxation algorithm guaranteeing $dx \ge 280\text{px}$ and $dy \ge 120\text{px}$ so nodes never overlap.
2. **Manageable Initial View (Focused vs Full Dataset)**:
   - Initial load defaults to a focused view displaying the top 28 key correlated entities across primary threat clusters.
   - Displays a dynamic banner: `"Showing 28 key correlated entities across top clusters (N unselected background records hidden for readability)."` with a 1-click toggle to view the entire dataset.
   - In-drawer cluster expansion: Clicking `"Expand Hidden Cluster Connections"` immediately expands that hub's hidden neighbors in place.
3. **Dynamic Node & Edge Highlighting / Dimming**:
   - Selected node: Scaled up (`scale-105`), glowing with cyan halo (`ring-4 ring-cyan-400`), opacity 1.0, zIndex 50.
   - 1-hop connected neighbors: Glowing cyan ring (`ring-2 ring-cyan-400/80`), opacity 1.0, zIndex 20.
   - Unrelated nodes: Dimmed to 15% opacity with 80% grayscale filter (`opacity: 0.15, filter: grayscale(80%)`), zIndex 1.
   - Connected edges: Animated, 3.5px line width, vibrant stroke, zIndex 30.
   - Unrelated edges: Dimmed to 0.08 opacity, thin 1px slate line, zIndex 0.
4. **Relationship Forensic Evidence Drawer**:
   - Displays human-readable source and target names and entity type badges (e.g., `SCAM REPORT: Bank KYC / Account Suspension...` -> `DOMAIN: sbi-kyc-update-portal.xyz`) with 1-click `[Inspect]` jump buttons.
   - Distinguishes `VERIFIED_SHARED_INDICATOR` (direct technical indicator match) from `POSSIBLE RELATIONSHIP (INFERRED)` (heuristic tactic/brand match).
   - Shows exact technical evidence quotes with correlation provenance report count.
   - Prominently displays the non-attribution legal disclaimer: shared indicators indicate infrastructure reuse, not shared criminal identity.
5. **Live Ingestion & Separation of Demo Mode**:
   - Synthetic Demo Clusters default to OFF (`includeDemo = false`).
   - Live URL scans and Scam DNA reports submitted via Phase 2 and Phase 3 immediately appear in the graph in real-time.
   - Toggling Demo Clusters displays an explicit cyan `[DEMO MODE]` banner with `[DEMO]`-prefixed nodes and edges.

---

## 9. Phase 5 Implementation Details (Blockchain Report Integrity & Decentralized Verification)

1. **Smart Contract (`blockchain/contracts/CyberTrustReportRegistry.sol`)**:
   - Solidity 0.8.24 registry compiled and tested with Hardhat.
   - Core functions: `registerReport(...)`, `verifyReport(...)` (state-modifying audit trail), `verifyReportView(...)` (gas-free off-chain query), `getReportRecord(...)`, `getVersionHistory(...)`.
   - Access Control: Multi-registrar role management (`authorizedRegistrars`) controlled by owner.
   - Immutable Versioning: Strictly increasing version sequence for audit updates with archival history.
   - Zero PII: Stores exclusively `bytes32 reportIdHash`, `bytes32 contentHash`, `string reportType`, `uint256 version`, `uint256 registeredAt`, `address registrar`.
   - Local EVM Deployment: Contract deployed at `0x5FbDB2315678afecb367f032d93F642f64180aa3` (Chain ID 31337).

2. **Deterministic Canonical Fingerprinting (`backend/app/services/canonical_hasher.py`)**:
   - RFC 8785-compliant deterministic canonical JSON serializer with recursive key sorting and UTF-8 encoding.
   - Protected fields include: target URL / message summary, domain, threat verdicts, risk score, classification, extracted indicators, and tactics. Volatile UI and timestamp fields are excluded to ensure deterministic hash reproducibility.
   - Generates standard `0x`-prefixed 32-byte SHA-256 digests (`compute_sha256_hex`).

3. **Backend Service & API Layer (`backend/app/services/blockchain_service.py`, `backend/app/api/blockchain.py`)**:
   - Web3.py client communicating with local Hardhat EVM node (`http://127.0.0.1:8545`).
   - Off-chain database audit sync in `blockchain_registration_records` table.
   - Provides on-demand verification (`GET /api/v1/blockchain/verify/{report_id}`) returning matching verification status, block height, transaction hash, and timestamp.
   - Demonstration Scenario B: Controlled in-memory modification (`POST /api/v1/blockchain/demo/tamper/{report_id}`) demonstrating cryptographic mismatch detection.

4. **Frontend "Blockchain Trust" Center (`frontend/src/components/BlockchainTrustCenter.tsx`)**:
   - Dynamic EVM Network State Ticker: Live connection status, block height, contract address with copy action, total attestations.
   - Report Integrity Verification Workbench: Input UUID, quick select chips for recent reports, Verify Integrity and Register On-Chain buttons.
   - Controlled Scenario B "Simulate Tamper" button for live hackathon demonstration.
   - On-Chain Forensic Evidence Drawer: Visual comparison of computed hash vs on-chain hash, block number, tx hash, and timestamp.
   - Recent Attestation Audit Table: Paginated list of recent on-chain registrations with 1-click verify actions.
   - Cross-Module Integration: Deep links from URL scanner and Scam DNA analyzer reports directly into the Blockchain Trust Center.
   - Attestation Scope Disclaimer: Prominently states that blockchain verification confirms cryptographic hash integrity relative to registration time, not external factual accuracy.

---

## 10. Development & Testing Commands

```bash
# 1. Activate backend virtual environment
source backend/.venv/bin/activate

# 2. Run local Hardhat node & run contract tests
cd blockchain
CI=true npx hardhat test                # 13/13 passing
CI=true npx hardhat node                # Starts local EVM on port 8545

# 3. Deploy smart contract to local node
npx hardhat run scripts/deploy.ts --network localhost

# 4. Run automated backend test suite (44 tests across all phases)
PYTHONPATH=. backend/.venv/bin/pytest backend/tests -v

# 5. Total automated tests passing: 57 (44 backend + 13 smart contract)

# 6. Start backend server (port 8000)
uvicorn backend.app.main:app --reload --port 8000

# 7. Start frontend server (port 5173)
cd frontend && npm run dev

# 8. Build frontend production bundle
cd frontend && npm run build
```

---

## 11. Project Milestones Summary

- **Phase 1**: Project Foundation (Completed & Verified)
- **Phase 2**: Core URL & Website Investigation Engine (Completed & Verified)
- **Phase 3**: AI Scam DNA Intelligence & Incident Guidance Protocol (Completed & Verified)
- **Phase 4**: Threat Relationship Intelligence & Interactive Scam Relationship Map (Completed & Verified)
- **Phase 5**: Blockchain Threat Report Integrity & Decentralized Verification (Completed & Verified)
