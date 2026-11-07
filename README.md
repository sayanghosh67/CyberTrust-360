> Website update: the token landing page has been removed. Visitors enter directly with automatically scoped private sessions. See [website hosting and motion notes](docs/WEBSITE_HOSTING.md).

> Remediation update: use `start_demo.sh` for a localhost-only authenticated demo. Current behavior and verification results are in `CODEX_POST_REMEDIATION_REPORT.md`. Older screenshots, the original PPTX and the original video are historical captures.

# CyberTrust 360

> **Your Digital World. Protected from Every Angle.**  
> Developed by **TECHNIX PRO** | 48-Hour Hackathon MVP | Final Release v1.0.0  

---

## 1. Overview & Project Identification

- **Project Name**: CyberTrust 360
- **Tagline**: Your Digital World. Protected from Every Angle.
- **Team**: TECHNIX PRO
- **Development Stage**: Phase 6 of 6 — Final Integration, Security Hardening, Deployment & Hackathon Submission

---

## 2. Problem Statement

Modern cyber threats exploit both technical blind spots and human psychology:
1. **Deceptive Web Infrastructure**: Fraudsters register typosquatting domains (e.g. `paypa1-update.com`) and deploy valid TLS certificates to create a false sense of security.
2. **Linguistic & Social Engineering Scams**: Victims in India and worldwide face aggressive coercion via SMS, WhatsApp, and Telegram—including fake bank KYC blocks, UPI PIN inversion scams, electricity bill disconnection threats, and fake job tasks.
3. **Fragmented & Opaque Analysis**: Existing scanners produce cryptic binary verdicts without actionable evidence, leaving victims confused during the critical "Golden Hour".
4. **Audit Fragility**: Traditional threat logs are easily manipulated after an incident, creating legal disputes and forensic uncertainty.

---

## 3. Project Solution

CyberTrust 360 provides an end-to-end cyber defense and trust intelligence matrix that unifies:
- **Non-Invasive Technical URL Inspection**: Concurrently audits DNS, TLS/SSL certificate lifespans, and HTTP security headers with strict SSRF defense.
- **AI Scam DNA Sequencing**: Parses linguistic manipulation, extracts burner phone numbers and UPI VPAs, and guides victims through situational response protocols.
- **Threat Relationship Intelligence**: Clusters database records into an interactive React Flow graph to reveal shared infrastructure across scam campaigns.
- **Blockchain Attestation**: Hashes reports using versioned deterministic JSON serialization (not RFC 8785 JCS) and anchors immutable 32-byte fingerprints on a Solidity smart contract with real-time tamper detection.

---

## 4. Key Innovations

1. **360° Defense Telemetry**: Unifies web infrastructure scanning, AI scam sequencing, threat relationship graphing, and decentralized blockchain attestation into one dashboard.
2. **Golden Hour Incident Guidance**: Provides 5 situational workflows with direct reporting protocols to India's **National Cyber Crime Helpline 1930** and **cybercrime.gov.in**, advising immediate bank holds without falsely promising fund recovery.
3. **Explainable 0–100 Risk Scoring**: Transparent formulas with granular technical evidence, severity classification, and defensive recommendations.
4. **Zero-PII On-Chain Attestation**: Smart contracts commit only `bytes32` hashes—zero personal identifiers, URLs, or messages are exposed on-chain.
5. **Deterministic Tamper Detection (Scenario B)**: Instant cryptographic mismatch detection whenever report data is modified post-registration.

---

## 5. Core Platform Features

- **Module 1 — URL & Website Investigation Engine**:
  - Detects raw IP hosts, embedded `@` delimiters, brand spoofing, and typosquatting.
  - Resolves A, AAAA, MX, TXT, and NS records via dnspython.
  - Live inspection of certificate validity, remaining lifespan (days to expiry), and cipher suites.
  - Audits HSTS, CSP, X-Frame-Options, MIME sniffing defenses, and per-hop redirects.
- **Module 2 — AI Scam DNA Intelligence**:
  - Indian digital fraud patterns: Fake KYC, UPI PIN traps, utility cutoffs, and Telegram job scams.
  - Prompt injection sandboxing using XML delimiters (`<untrusted_user_message>`).
  - Dual AI engine: Seamless fallback between real Gemini/OpenAI models and deterministic heuristic rules with 100% transparent attribution.
- **Module 3 — Threat Relationship Intelligence**:
  - Interactive React Flow graph with 7 entity node types.
  - Solid green edges for verified shared indicators; dashed amber edges for inferred playbooks.
  - Evidence inspection side panel with exact technical quotes and attribution guardrails.
- **Module 4 — Blockchain Threat Report Integrity**:
  - Solidity 0.8.24 registry (`CyberTrustReportRegistry.sol`) on local EVM node (Chain ID 31337).
  - CyberTrust v2 canonical JSON deterministic hashing.
  - Scenario A (Verified Unchanged) and Scenario B (Tamper Detection Mismatch).

---

## 6. Technology Stack

- **Frontend**: React 19, TypeScript (strict mode), Vite 8, Tailwind CSS v4, Lucide React, `@xyflow/react`
- **Backend**: Python 3.11+, FastAPI (v0.162+), Pydantic v2, Web3.py, dnspython, tldextract, httpx, Uvicorn
- **Blockchain**: Solidity 0.8.24, Hardhat, Ethers.js, Local EVM Node (Chain ID 31337)
- **Database**: PostgreSQL 16 Alpine via Docker Compose, SQLAlchemy 2.0 ORM, SQLite 3 automatic fallback
- **Security**: Strict SSRF guardrails, per-hop redirect validation, prompt injection shields, redacted operational logs

---

## 7. Architecture Overview

```
User Input ──► FastAPI Gateway ──► Multi-Vector Threat Inspection ──► Explainable Risk Score
                     │                                                          │
                     ▼                                                          ▼
             Strict SSRF Guard                                        Database Persistence
             (RFC 1918 / Loopback)                                  (PostgreSQL / SQLite)
                                                                                │
                     ┌──────────────────────────────────────────────────────────┘
                     ▼
             Threat Relationship Graph ──► CyberTrust v2 Hashing ──► Solidity Smart Contract (EVM)
             (React Flow Multi-Hop)      (Deterministic SHA-256)   (On-Chain Tamper Detection)
```

For full technical specifications, see [`docs/ARCHITECTURE.md`](file:///Users/sayanghosh/Desktop/HACKMATRIX/docs/ARCHITECTURE.md).

---

## 8. Quick Start & Installation Instructions

### Prerequisites
- **Node.js**: v18+ (Node 20+ recommended)
- **Python**: 3.11+
- **Git**

### 1. Clone & Environment Setup
```bash
cp .env.example .env
```

### 2. One-Command Demonstration Startup (Recommended)
CyberTrust 360 includes a verified one-command script that tests prerequisites, starts the local Hardhat blockchain, deploys the smart contract, launches the backend, and serves the frontend:

```bash
chmod +x start_demo.sh
./start_demo.sh
```

---

## 9. Environment Variables

Configure `.env` using `.env.example` as a template:

```env
# Platform Configuration
PROJECT_NAME="CyberTrust 360"
ENVIRONMENT="development"
DEBUG=False

# Database Configuration (PostgreSQL with automatic SQLite fallback)
POSTGRES_SERVER=localhost
POSTGRES_PORT=5432
POSTGRES_USER=cybertrust
POSTGRES_PASSWORD=replace_with_a_unique_local_password
POSTGRES_DB=cybertrust_db
USE_SQLITE_FALLBACK=True
SQLITE_DB_PATH="./cybertrust.db"

# Optional Threat Intelligence API Keys (Kept secret on backend)
GOOGLE_SAFE_BROWSING_API_KEY=your_key_here
VIRUSTOTAL_API_KEY=your_key_here
PHISHTANK_API_KEY=your_key_here
URLHAUS_ENABLED=True

# Optional AI LLM Provider Configuration
LLM_PROVIDER="gemini" # "gemini" | "openai" | "none"
GEMINI_API_KEY=your_gemini_key_here
OPENAI_API_KEY=your_openai_key_here

# Blockchain EVM Settings (Hardhat Local Node)
BLOCKCHAIN_ENABLED=True
BLOCKCHAIN_RPC_URL="http://127.0.0.1:8545"
BLOCKCHAIN_CHAIN_ID=31337
BLOCKCHAIN_CONTRACT_ADDRESS="0x5FbDB2315678afecb367f032d93F642f64180aa3"
```
*(If external API keys are omitted, the application operates cleanly with deterministic rule-based intelligence without crashing or faking data).*

---

## 10. Manual Local Development Commands

If you prefer running services individually:

```bash
# Terminal 1: Hardhat Blockchain Node
cd blockchain
CI=true npx --no-install hardhat node --hostname 127.0.0.1 --port 8545

# Terminal 2: Smart Contract Deployment
cd blockchain
npx hardhat run scripts/deploy.ts --network localhost

# Terminal 3: FastAPI Backend Server
source backend/.venv/bin/activate
uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000

# Terminal 4: Vite Frontend
cd frontend
npm run dev -- --host 127.0.0.1 --port 5173
```

- **Frontend Application**: [http://localhost:5173](http://localhost:5173)
- **Interactive Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Health Check Probe**: [http://localhost:8000/api/health](http://localhost:8000/api/health)

---

## 11. Automated Testing Suite

Run the current regression suite; see CODEX_POST_REMEDIATION_REPORT.md for actual results:

```bash
# 1. Run Smart Contract Tests (13 tests)
cd blockchain && CI=true npx --no-install hardhat test

# 2. Run Backend Pytest Suite (disposable database; isolated local chain required)
PYTHONPATH=. backend/.venv/bin/pytest backend/tests -v

# 3. Verify Frontend Production Build (0 errors)
npm run build --prefix frontend
```

---

## 12. Screenshots & Visual Artifacts

All screenshots are stored in [`docs/screenshots/`](file:///Users/sayanghosh/Desktop/HACKMATRIX/docs/screenshots/):

1. **Platform Intelligence Matrix**: [`platform_dashboard_overview.png`](file:///Users/sayanghosh/Desktop/HACKMATRIX/docs/screenshots/platform_dashboard_overview.png)
2. **Deep URL Investigation Report**: [`investigation_report.png`](file:///Users/sayanghosh/Desktop/HACKMATRIX/docs/screenshots/investigation_report.png)
3. **AI Scam DNA Analyzer**: [`scam_dna_analyzer.png`](file:///Users/sayanghosh/Desktop/HACKMATRIX/docs/screenshots/scam_dna_analyzer.png)
4. **Golden Hour Incident Guidance**: [`incident_guidance.png`](file:///Users/sayanghosh/Desktop/HACKMATRIX/docs/screenshots/incident_guidance.png)
5. **Interactive Threat Relationship Graph**: [`threat_relationship_graph.png`](file:///Users/sayanghosh/Desktop/HACKMATRIX/docs/screenshots/threat_relationship_graph.png)
6. **Forensic Evidence Drawer**: [`selected_relationship_evidence.png`](file:///Users/sayanghosh/Desktop/HACKMATRIX/docs/screenshots/selected_relationship_evidence.png)
7. **Blockchain Trust Center (Verified)**: [`blockchain_verification_verified.png`](file:///Users/sayanghosh/Desktop/HACKMATRIX/docs/screenshots/blockchain_verification_verified.png)
8. **Blockchain Tamper Detection (Scenario B)**: [`blockchain_tamper_detection.png`](file:///Users/sayanghosh/Desktop/HACKMATRIX/docs/screenshots/blockchain_tamper_detection.png)

---

## 13. 5-Minute Live Demonstration Walkthrough

- **0:00 - 0:30**: Open `http://localhost:5173`. Show system status indicator and real database telemetry (URL scans, sequenced scam messages, and on-chain proofs).
- **0:30 - 1:30**: Run URL investigation on preset `https://paypa1-account-login-update.com`. Review the 0–100 risk score (88/100 High Risk), typosquatting detection, DNS records, and short TLS lifespan.
- **1:30 - 2:30**: Open Scam DNA Analyzer. Paste an electricity cutoff threat message. Review extracted phone number and urgency pressure. Scroll to "What Should I Do Now?" and review Golden Hour 1930 guidance.
- **2:30 - 3:30**: Open Threat Relationship Graph. Click a banking phishing node to highlight 1-hop connections and dim unrelated nodes. Inspect the green verified edge evidence.
- **3:30 - 4:30**: Open Blockchain Trust Center. Verify report integrity on-chain (Scenario A). Click "Simulate Tamper" (Scenario B) to demonstrate instant cryptographic mismatch detection.
- **4:30 - 5:00**: Show terminal with the verified regression suite passing. Conclude with project vision.

---

## 14. Security & Privacy Limitations

1. **SSRF Guardrails**: Prohibits scanning loopback, private subnets (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), cloud metadata (`169.254.169.254`), and internal addresses.
2. **Zero-PII On-Chain**: Reports committed to the blockchain contain only `bytes32` hashes—no personal data, raw text, or URLs are stored on public ledgers.
3. **Attestation Scope Disclaimer**: Blockchain verification strictly proves that a report matches the fingerprint committed at registration time; it does not independently verify the factual completeness of external threat indicators.
4. **Attribution Guardrail**: Shared technical indicators (domains, phone numbers, UPI handles) indicate infrastructure reuse, not definitive proof of shared attacker identity.

---

## 15. Deployment Information

CyberTrust 360 is configured for modular cloud deployment:
- **Frontend**: Deployable to **Vercel** or **Netlify** (`npm run build`, output directory: `frontend/dist`). Set `VITE_API_BASE_URL` to backend URL.
- **Backend**: Deployable to **Render**, **Railway**, or **AWS ECS** via Dockerfile or `uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT`.
- **Database**: Managed **PostgreSQL** instance on Neon, Supabase, or Railway. Local SQLite fallback is active when PostgreSQL is offline.
- **Blockchain**: Local **Hardhat EVM** is optimized for live hackathon demonstration. Smart contract is prepared for public EVM testnets (e.g. Polygon Amoy, Base Sepolia) by updating RPC and private keys in `.env`.

---

## 16. Known Limitations

1. **Non-Intrusive Scanning**: CyberTrust 360 performs strictly non-invasive inspection. It does not execute active penetration testing, vulnerability exploitation, or credential stuffing.
2. **Third-Party API Rate Limits**: When optional threat intelligence keys are omitted, the system falls back to heuristic scoring without fabricating fake external verdicts.
3. **No Guarantee of Fund Recovery**: Incident guidance accurately advises immediate reporting to 1930 and bank helplines to maximize account lien chances, without falsely guaranteeing money recovery.

---

## 17. Presentation & Hackathon Materials

- **PowerPoint Presentation (10 Slides)**: [`docs/CyberTrust360_PitchDeck.pptx`](file:///Users/sayanghosh/Desktop/HACKMATRIX/docs/CyberTrust360_PitchDeck.pptx)
- **Slide Content, Pitch Script & Demo Script**: [`docs/PRESENTATION.md`](file:///Users/sayanghosh/Desktop/HACKMATRIX/docs/PRESENTATION.md)
- **Video Storyboard & Recording Checklist**: [`docs/DEMO_VIDEO_STORYBOARD.md`](file:///Users/sayanghosh/Desktop/HACKMATRIX/docs/DEMO_VIDEO_STORYBOARD.md)
- **Technical Architecture Specification**: [`docs/ARCHITECTURE.md`](file:///Users/sayanghosh/Desktop/HACKMATRIX/docs/ARCHITECTURE.md)

---

## 18. Team TECHNIX PRO & Contributions

- **Sayan Ghosh** — Lead Full-Stack & Systems Architecture Engineer  
  *FastAPI gateway, database integration, Web3 smart contract deployment, canonical hashing engine, and system orchestration.*
- **Sayani Ghosal** — AI/ML & Scam Intelligence Research Engineer  
  *Scam DNA sequencing engine, prompt injection defenses, Indian digital threat pattern engineering, and safety guidance protocols.*
- **Hritushree Mitra** — Threat Correlation & Graph Frontend Engineer  
  *React Flow graph implementation, node/edge highlighting, anti-overlap layout, evidence panels, and UI telemetry.*
- **Swastika Paul** — Cybersecurity, Security Hardening & Quality Assurance Engineer  
  *SSRF guardrails, per-hop redirect validation, automated pytest suite, smart contract unit testing, and security audit.*

---

## 19. License & Disclaimer

Developed by **Team TECHNIX PRO** for hackathon demonstration.  
Licensed under the **MIT License**.  
*CyberTrust 360 is intended for cyber threat defense and educational digital trust awareness.*

## Remediated local demo and access control

`./start_demo.sh` supervises the three local services, applies additive migrations and checks actual database and registry readiness. It installs nothing. Existing dependencies and compiled artifacts must be present. It refuses occupied API/frontend ports and never resets a running chain. Use `--reuse-chain` only for a known local Hardhat node. Stop with Ctrl-C; only its child processes are stopped.

For an isolated demo alongside existing services:

```sh
./start_demo.sh --api-port 18000 --web-port 15173 --chain-port 18545
```

Open the printed URL directly; a private visitor session is created automatically. `.runtime/demo-token.txt` remains a private operator credential, not a website login requirement. The persistent demo database is `.runtime/demo.db`; original `cybertrust.db` records are preserved. Live LLM inference is off by default in this launcher; set `LLM_PROVIDER` and the matching provider key/model explicitly to opt in.

Optional operator access uses `API_AUTH_TOKENS`, a JSON object mapping random tokens (at least 32 characters) to `{"id":"person-id","role":"admin"}`. Roles: admin sees all records; analyst creates and reads their own reports; registrar additionally signs their own reports; reader can only read their own reports. Multiple tokens can share an identity. Pre-migration records have no owner and are visible only to admins until ownership is assigned through a reviewed migration. The frontend automatically keeps a short-lived visitor session in tab storage. Visitor identities can access only their own reports. Root, health and rate-limited visitor-session creation are public; operator and report endpoints retain authorization. Public blockchain signing is disabled by default.

The built-in rate limiter applies per IP and identity, limits payload size and concurrent requests, and assumes one API worker. Distributed deployments need a shared ingress limiter and managed identity/secret storage. Public hosting is not approved by this remediation.

New `ct360-v2` SHA-256 fingerprints cover the entire saved report JSON plus displayed summary columns. This custom deterministic JSON is **not RFC 8785 JCS**. Legacy v1 fingerprints remain verifiable but clearly show partial coverage; explicitly register a new version to protect the complete report. Registrations require chain ID 31337, the expected runtime bytecode, authorized registrar and a confirmed matching receipt. Only hashes/type/version are placed on chain. Hardhat remains a resettable local EVM, not a public decentralized ledger.

Dashboard counts exclude graph fixtures; related indicators describe the latest 100 URL and 100 scam records (up to 200 records), not an unlimited corpus. Blockchain count means distinct reports with saved confirmed registrations; use live verification to check current chain state. Local test inputs remain test data even though their reports are genuinely persisted.

Backend tests create a new temporary database automatically and use localhost:18545. Start a separate Hardhat node and deploy the contract there before running the full suite. Never point these tests at the user's chain or database. Test credentials are explicitly development-only. See the post-remediation report for reproducible commands and results.

Incident guidance references: [NPCI fraud awareness](https://www.npci.org.in/fraud-awareness), [National cybercrime reporting instructions](https://cybercrime.gov.in/uploadmedia/instructions_citizenreportingcyberfrauds.pdf). Prompt reporting to the bank/payment provider, 1930 and cybercrime.gov.in is recommended; recovery is not guaranteed.

Current corrected presentation: [CyberTrust360_PitchDeck_Remediated.pptx](docs/CyberTrust360_PitchDeck_Remediated.pptx). The original deck remains historical.

For backend integration tests, start Hardhat on 127.0.0.1:18545 and run `backend/.venv/bin/python scripts/deploy_test_chain.py` from the repository root. This helper validates the local test registry without writing application ABI metadata.
