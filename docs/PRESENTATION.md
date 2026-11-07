> Remediation update: use `start_demo.sh` for a localhost-only authenticated demo. Current behavior and verification results are in `CODEX_POST_REMEDIATION_REPORT.md`. Older screenshots, the original PPTX and the original video are historical captures.

# CyberTrust 360 — Presentation Materials & Pitch Scripts

> **Team**: TECHNIX PRO  
> **Tagline**: Your Digital World. Protected from Every Angle.  
> **PowerPoint File**: [`docs/CyberTrust360_PitchDeck.pptx`](file:///Users/sayanghosh/Desktop/HACKMATRIX/docs/CyberTrust360_PitchDeck.pptx)  

---

## 1. 10-Slide Pitch Deck Content Outline

### Slide 1: Title & Team
- **Title**: CyberTrust 360
- **Subtitle**: Your Digital World. Protected from Every Angle.
- **Project Scope**: AI-Powered Web Threat Detection & Digital Trust Intelligence Platform
- **Team TECHNIX PRO**:
  - **Sayan Ghosh** — Lead Full-Stack & Systems Architecture Engineer
  - **Sayani Ghosal** — AI/ML & Scam Intelligence Research Engineer
  - **Hritushree Mitra** — Threat Correlation & Graph Frontend Engineer
  - **Swastika Paul** — Cybersecurity, Security Hardening & Quality Assurance Engineer

### Slide 2: The Problem — Pervasive Web Threats & Deceptive Scams
- **Deceptive Web Infrastructure**: Phishing campaigns register typosquatting domains and leverage valid SSL certificates to mimic authentic services.
- **Linguistic & Financial Coercion**: Citizens face deceptive SMS, WhatsApp, and Telegram fraud (fake UPI PIN refund scams, electricity cutoff threats, fake KYC blocks).
- **Audit Fragility**: Existing tools provide opaque verdicts, isolated reports, and easily alterable evidence logs.

### Slide 3: Our Solution — CyberTrust 360
- **Unified Defense Platform**: Combines non-invasive infrastructure inspection, linguistic scam DNA sequencing, multi-hop threat graph correlation, and decentralized blockchain verification.
- **Core Pillars**:
  1. *URL Investigation Engine*: DNS, TLS, security headers, and threat feeds.
  2. *AI Scam DNA Intelligence*: Pattern recognition, prompt injection defenses, and situational guidance.
  3. *Threat Relationship Intelligence*: Interactive React Flow graph uncovering shared burner infrastructure.
  4. *Blockchain Trust Center*: Immutable on-chain fingerprint attestation with tamper detection.

### Slide 4: How the Platform Works — End-to-End Pipeline
- **Step 1**: Target URL or message submitted via responsive dashboard.
- **Step 2**: Backend executes concurrent asynchronous inspection across DNS, TLS, HTTP headers, and threat feeds.
- **Step 3**: Linguistic engine sequences manipulation tactics and extracts indicators.
- **Step 4**: Structured findings persisted in PostgreSQL / SQLite ledger.
- **Step 5**: Correlation engine links shared indicators into graph clusters.
- **Step 6**: CyberTrust v2 canonical hash calculated and registered to Solidity smart contract on EVM.
- **Step 7**: Instant on-chain integrity verification detects modifications.

### Slide 5: Module 01 — URL & Website Investigation Engine
- **Inspection Vectors**: Detects IP hostnames, embedded `@` delimiters, excessive subdomain depth, brand lookalikes, DNS record health, TLS validity/lifespan, and HTTP security headers (HSTS, CSP).
- **Defensive SSRF Guardrails**: Strict blocking of private RFC 1918 subnets, loopback, cloud metadata (169.254.169.254), and per-hop redirect validation.
- **Explainable 0–100 Risk Scoring**: Granular evidence items with confidence ratings and defensive actions.

### Slide 6: Module 02 — AI Scam DNA Intelligence & Incident Guidance
- **Indian Cyber Fraud Specialization**: Heuristics for fake bank KYC blocks, UPI PIN fraud, utility disconnection extortion, and fake job scams.
- **Prompt Injection Defense**: Untrusted text isolation with XML delimiters.
- **Honest Dual Engine**: Transparent source labeling (`ai_llm` vs `rule_based_fallback`).
- **Incident Guidance ("What Should I Do Now?")**: 5 situational workflows with Golden Hour protocols, recommending immediate reporting to National Cyber Crime Helpline **1930** and **cybercrime.gov.in** without falsely guaranteeing fund recovery.

### Slide 7: Module 03 — Threat Relationship Intelligence & Graph
- **Interactive React Flow Graph**: 7 node categories with force-directed anti-overlap layout.
- **Verified vs Inferred Links**: Solid green edges for verified shared indicators (identical domain, phone, UPI VPA); dashed amber edges for inferred tactical playbooks.
- **Evidence Inspection Drawer**: Deep forensic quotes, correlation count, and cross-module jump links.
- **Attribution Guardrail**: Strict disclaimer stating shared indicators indicate infrastructure reuse, not proof of identical criminal identity.

### Slide 8: Module 04 — Blockchain Threat Report Integrity
- **Solidity Smart Contract (`CyberTrustReportRegistry.sol`)**: Solidity 0.8.24 registry deployed to local Hardhat EVM (Chain ID 31337).
- **Zero-PII Storage**: Commits only 32-byte reportIdHash, contentHash, reportType, and version.
- **CyberTrust v2 Canonical Serialization**: Deterministic SHA-256 fingerprinting.
- **Live Demonstrations**:
  - *Scenario A*: Verified unchanged report with block height and transaction hash.
  - *Scenario B*: Tamper detection simulating modified risk score and raising cryptographic security alert.

### Slide 9: Architecture, Rigor & Security Hardening
- **Security Hardening**: Strict SSRF prevention, per-hop redirect validation, untrusted-input instructions and validated model outputs; not a sandbox, redacted operational logs, and PostgreSQL with explicit local SQLite fallback.
- **Automated Testing Suite**: Regression coverage includes network safety, access controls, report mutations and real local EVM transactions; see the post-remediation report for current results.
- **One-Command Startup**: Fully validated via `./start_demo.sh`.

### Slide 10: Real-World Impact, Roadmap & Team
- **Impact**: Provides transparent cyber intelligence to everyday users and security analysts.
- **Future Scope**: Public testnet anchoring (Polygon/Base), browser extension real-time web shield, and automated telecom fraud reporting (Chakshu / Sanchar Saathi).
- **Team TECHNIX PRO**: Sayan Ghosh, Sayani Ghosal, Hritushree Mitra, Swastika Paul.

---

## 2. Concise 2-Minute Hackathon Pitch Script

> **[0:00 - 0:25] Hook & Problem**  
> *"Judges, digital threats today move faster than human instinct. Everyday citizens and enterprises are targeted by lookalike phishing domains with valid SSL certificates, fake UPI refund requests, and urgent electricity cutoff extortion. Traditional tools give cryptic, binary verdicts or static blacklists that attackers bypass in minutes. Worse, victims don't know what to do in the critical 'Golden Hour' after an attack, and digital evidence logs can easily be tampered with or disputed."*

> **[0:25 - 0:55] Solution & Architecture**  
> *"That is why Team TECHNIX PRO built CyberTrust 360: Your Digital World, Protected from Every Angle.  
> CyberTrust 360 is an end-to-end cyber intelligence platform that unifies four powerful layers:  
> First, our URL Investigation Engine conducts non-invasive, multi-vector analysis across DNS, TLS certificate lifespan, and security headers, protected by strict SSRF guardrails.  
> Second, our AI Scam DNA Engine sequences linguistic manipulation, extracts phone numbers and UPI VPAs, and delivers situation-specific incident guidance directing victims to India's National Cyber Crime Helpline 1930."*

> **[0:55 - 1:30] Threat Graph & Blockchain**  
> *"Third, our Threat Relationship Graph visualizes multi-hop campaign clusters using React Flow, clearly distinguishing verified shared technical indicators from inferred playbooks so analysts can spot distributed attacker networks.  
> And fourth, our Blockchain Trust Center anchors reports to an EVM Solidity smart contract using CyberTrust v2 deterministic hashing. If any party attempts to alter a threat score after the fact, our smart contract immediately detects the cryptographic mismatch and sounds a security alert."*

> **[1:30 - 2:00] Validation & Closing**  
> *"We built this platform with engineering rigor: the verified regression suite passing across Hardhat and pytest, zero TypeScript errors, and supervised local startup with explicit database configuration.
> CyberTrust 360 turns fear and confusion into explainable, tamper-proof digital trust. Thank you!"*

---

## 3. Comprehensive 5-Minute Demonstration Script

### [0:00 - 0:30] Introduction & Platform Overview
- **Action**: Open browser at `http://localhost:5173`. Point to the header, system status indicator, and the **360° Threat Intelligence Dashboard**.
- **Spoken**:  
  *"Hello judges. Welcome to CyberTrust 360, built by Team TECHNIX PRO. Notice our real-time telemetry: 73 URL scans, 196 sequenced scam messages, and verified on-chain attestations. Our system is fully operational with live health monitoring and automatic database persistence."*

### [0:30 - 1:30] Workflow 1: Deep URL Investigation
- **Action**: Enter preset `https://paypa1-account-login-update.com` or `https://wikipedia.org` in the URL scanner and click **Analyze Domain**.
- **Spoken**:  
  *"Let's investigate a suspicious link. Our backend immediately executes asynchronous inspection across DNS records, TLS certificate lifespan, and security headers while enforcing strict SSRF defenses against private IP subnets and internal networks.  
  Notice the transparent 0–100 risk score with granular technical findings: typosquatting against PayPal, short TLS lifespan, missing HSTS, and redirect chain verification. Every finding is plain-English, explainable, and persisted in our database."*

### [1:30 - 2:30] Workflow 2: AI Scam DNA & Incident Response
- **Action**: Scroll to **Scam DNA Analyzer**. Click the preset **Electricity Bill Cutoff (Hinglish)** or **UPI PIN Refund Scam**. Click **Sequence Scam DNA**.
- **Spoken**:  
  *"Attackers don't just use links; they use linguistic manipulation. We paste a suspicious message alleging power disconnection tonight unless a burner number is called.  
  Our Scam DNA engine extracts the phone number, identifies high urgency pressure, and classifies the deceptive tactic with honest attribution to our deterministic rule engine.  
  Below, our 'What Should I Do Now?' matrix guides victims through 5 critical situations. If the victim made a UPI payment, we advise calling the National Cyber Crime Helpline 1930 immediately during the Golden Hour to attempt an account lien, while honestly disclosing that fund recovery cannot be guaranteed."*

### [2:30 - 3:30] Workflow 3: Threat Relationship Intelligence Graph
- **Action**: Click **Explore in Threat Graph** or navigate to `#relationship-graph`. Click on a hub node (e.g. `sbi-kyc-update-portal.xyz`) and select a connecting edge.
- **Spoken**:  
  *"Threats are rarely isolated. Our Threat Relationship Graph correlates records across the database.  
  Notice how clicking a node illuminates its 1-hop neighborhood while dimming unrelated entities. Solid green edges represent verified shared indicators—exact matching domains or UPI VPAs—while dashed amber edges represent inferred playbooks.  
  Our evidence side panel provides exact technical quotes and enforces our ethical disclaimer: shared infrastructure indicates technical reuse, not proof of shared attacker identity."*

### [3:30 - 4:30] Workflow 4: Blockchain Trust Center & Tamper Detection
- **Action**: Click **Verify on Blockchain** or jump to `#blockchain-trust`. Show the confirmed block number (#7) and contract address. Click **Simulate Tamper (Scenario B)**.
- **Spoken**:  
  *"Finally, how do we guarantee threat intelligence cannot be tampered with? Our Blockchain Trust Center anchors reports to `CyberTrustReportRegistry.sol` on our local EVM node using zero-PII canonical SHA-256 hashing.  
  When we verify an authentic report, the on-chain hash matches, confirming integrity.  
  Now, let's execute Hackathon Scenario B: we click 'Simulate Tamper' to alter the report's risk score in memory. Instantly, our smart contract catches the mismatch and triggers a red security alert showing the exact hash discrepancy."*

### [4:30 - 5:00] Closing & Verification Proof
- **Action**: Show terminal with the verified regression suite passing (`CI=true npx hardhat test` + `pytest`).
- **Spoken**:  
  *"CyberTrust 360 bridges AI deception detection, cybersecurity infrastructure inspection, and Web3 cryptographic integrity. The current regression results are recorded in the remediation report, the frontend is production built, and one-command local startup is verified. Thank you, and we welcome your questions!"*


Current corrected presentation: [CyberTrust360_PitchDeck_Remediated.pptx](CyberTrust360_PitchDeck_Remediated.pptx). The original deck remains historical.
