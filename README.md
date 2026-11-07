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

## Phase 3 Highlights: AI Scam DNA & Deception Intelligence Engine

In Phase 3, CyberTrust 360 introduces specialized linguistic and behavioral deception sequencing:
- **Scam DNA Message Analyzer**: Analyze suspicious SMS, WhatsApp forwards, phishing emails, job offers, and payment requests for manipulation patterns.
- **Indian Digital Threat Detection**: Tailored heuristic rules and indicators for:
  - **Fake Bank KYC Updates**: SBI/HDFC/ICICI account block and PAN card deactivation coercion.
  - **UPI Refund & PIN Fraud**: Inversion scams where fraudsters trick victims into entering UPI PINs to "claim refunds" or "receive prize money".
  - **Utility & Bijli Disconnection**: Urgent threats in English and Hinglish alleging electricity power cut-offs tonight due to unpaid bills.
  - **Fake Part-Time Job Scams**: YouTube video liking, Google Maps rating, and Telegram task scams offering unrealistic daily earnings.
  - **Postal & Parcel Delivery Traps**: Fake India Post/courier notifications demanding re-delivery fees for incomplete addresses.
  - **OTP Harvesting**: Urgent pressure coercing victims into sharing one-time authorization codes.
- **Prompt Injection Defense**: Untrusted message delimiters (`<untrusted_user_message>`), strict system framing, and instruction isolation to prevent adversarial override.
- **Dual AI & Rule-Based Intelligence Engine**: Configurable support for Gemini and OpenAI LLM models, paired with a deterministic heuristic fallback engine with 100% honest attribution.
- **Cross-Module Threat Investigation**: 1-click CTA on extracted URLs and domains in Scam DNA reports that seamlessly pre-populates and runs Phase 2's deep URL threat scanner.
- **"What Should I Do Now?" Incident Response**: 5-situation interactive decision support matrix (Received only, Clicked link, Entered password, Shared OTP, Made UPI payment) featuring Golden Hour response guidance and India's **National Cyber Crime Helpline 1930** and **cybercrime.gov.in**.

---

## Phase 4 Highlights: Threat Relationship Intelligence & Scam Relationship Map

In Phase 4, CyberTrust 360 introduces interactive multi-hop graph intelligence:
- **Interactive Relationship Graph**: Powered by React Flow (`@xyflow/react`), rendering 7 entity node types (`scam_report`, `url_scan`, `domain`, `url`, `brand`, `tactic`, `indicator`).
- **Verified vs. Possible Relationship Distinction**:
  - **VERIFIED_SHARED_INDICATOR** (Solid Green): Direct technical matches across reports (shared domain, identical URL, shared phone, shared UPI VPA).
  - **POSSIBLE_RELATIONSHIP** (Dashed Amber): Heuristic links inferred from shared deceptive playbooks, brand impersonation, or linguistic patterns.
- **Attribution Guardrail**: Strict limitations disclaimer on every edge: *"A shared technical indicator indicates common infrastructure, not proof of identical attacker identity or coordinated criminal campaigns without external attribution."*
- **Forensic Inspection Side Panel**: Clicking any node or connection displays deep forensic evidence, source report IDs, confidence ratings, and 1-click cross-module investigation triggers.
- **Cross-Module Navigation**:
  - URL Scanner → Threat Graph (`Explore in Threat Graph`)
  - Scam DNA Analyzer → Threat Graph (`View Threat Graph`)
  - Threat Graph → Deep URL Scanner (`Investigate Target in URL Scanner`)
- **Synthetic Demonstration Clusters**: Built-in toggle providing an explicitly labeled demonstration dataset showing cross-cluster pivots between banking phishing and utility bill extortion networks.

---

## Phase 5 Highlights: Blockchain Threat Report Integrity & Decentralized Verification

In Phase 5, CyberTrust 360 integrates an immutable EVM-based decentralized trust layer:
- **Solidity Smart Contract (`CyberTrustReportRegistry.sol`)**:
  - Deployed on a local EVM network (Chain ID: 31337).
  - Securely anchors report fingerprint digests (`bytes32`) and metadata on-chain.
  - Role-based registrar authorization and strictly increasing version audit history.
  - Zero PII: only cryptographic hashes, submission timestamp, and registrar address are committed to the public ledger.
- **Cryptographic RFC 8785 Canonical Fingerprinting**:
  - Deterministic serialization sorting keys alphabetically to guarantee identical SHA-256 hashes for unchanged reports.
  - Extracts immutable security findings and verdicts while excluding ephemeral UI rendering state.
- **Controlled Hackathon Demonstration Scenarios**:
  - **Scenario A (Verified Unchanged)**: Verify a registered report against the blockchain, displaying on-chain transaction hash and confirmed block number.
  - **Scenario B (Tamper Detection)**: 1-click simulation altering a risk score in memory, immediately triggering a `MISMATCH — REPORT MODIFIED` security alert and hash diff.
  - **Scenario C (Unregistered Check)**: Clean handling of uncommitted reports with a 1-click "Register On-Chain" action.
  - **Scenario D (Historical Ledger)**: Paginated audit trail of all previous on-chain attestations with instant verification jump buttons.
- **Attestation Scope Guardrail**:
  - Clear, permanent ethical disclaimer: *"Blockchain verification confirms that the current report matches the fingerprint recorded on-chain. It does not independently prove that the original threat classification is correct."*

---

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite 8, Tailwind CSS v4, Lucide Icons, React Flow
- **Backend**: Python 3.11+, FastAPI, Pydantic v2, Web3.py, dnspython, tldextract, httpx, Uvicorn
- **Blockchain**: Solidity 0.8.24, Hardhat, Ethers.js, Local EVM Node (Chain ID 31337)
- **Database**: PostgreSQL 16 (Alpine), SQLAlchemy 2.1 ORM, Alembic migrations, SQLite fallback
- **Security**: Strict SSRF guardrails, canonical hashing, role-based smart contract access

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

### 5. Blockchain Local EVM & Smart Contract (Phase 5)

```bash
# 1. Navigate to blockchain directory
cd blockchain

# 2. Run smart contract unit tests (13 tests)
CI=true npx hardhat test

# 3. Start local EVM node (port 8545, chainId 31337)
CI=true npx hardhat node

# 4. Deploy CyberTrustReportRegistry contract to local node
npx hardhat run scripts/deploy.ts --network localhost
```

---

### 6. PostgreSQL via Docker Compose (Optional)

```bash
# Start PostgreSQL service in background
docker compose up -d

# Verify container status
docker compose ps
```
*(If Docker is not running, the application automatically persists scans to local SQLite `./cybertrust.db` with zero downtime).*

---

### 7. Running Automated Tests

```bash
# Run backend test suite (44 tests covering URL Engine, Scam DNA, Threat Relationship Graph, and Blockchain)
PYTHONPATH=. backend/.venv/bin/pytest backend/tests -v

# Run smart contract tests (13 tests)
cd blockchain && CI=true npx hardhat test

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
| `POST` | `/api/v1/scam/analyze` | AI Scam DNA sequencing for SMS, WhatsApp, emails, and job offers. |
| `GET` | `/api/v1/scam/analyses` | List recent Scam DNA analysis records and classifications. |
| `GET` | `/api/v1/scam/analyses/{analysis_id}` | Retrieve specific Scam DNA forensic report by UUID. |
| `POST` | `/api/v1/scam/guidance` | Action-specific incident response guidance (5 situational states). |
| `GET` | `/api/v1/blockchain/status` | EVM connection status, block height, chain ID, registry address. |
| `POST` | `/api/v1/blockchain/register/{report_id}` | Calculate SHA-256 canonical digest and commit attestation on-chain. |
| `GET` | `/api/v1/blockchain/verify/{report_id}` | Compare live report digest against immutable on-chain record. |
| `POST` | `/api/v1/blockchain/demo/tamper/{report_id}` | Controlled in-memory modification testing cryptographic tamper detection. |
| `GET` | `/api/v1/blockchain/registrations` | Paginated history of confirmed on-chain threat attestations. |
| `GET` | `/api/v1/intelligence/graph` | Interactive threat relationship graph with verified vs inferred edges. |
| `GET` | `/api/v1/intelligence/relationships/{report_id}` | 1-hop and 2-hop connected reports and shared indicators for a report. |
| `GET` | `/api/v1/intelligence/indicators` | Aggregated recurring threat indicators (shared domains, phones, UPI). |
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
