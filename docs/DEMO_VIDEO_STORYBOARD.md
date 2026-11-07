# CyberTrust 360 — Demonstration Video Storyboard & Recording Checklist

> **Team**: TECHNIX PRO  
> **Project**: CyberTrust 360  
> **Target Video Duration**: 4 Minutes 00 Seconds  
> **Resolution**: 1080p (1920x1080) at 60fps  
> **Audio**: Clear voiceover narration with subtle background synth drone  

---

## 1. Recording Pre-Flight Checklist

Before recording:
- [ ] Run `./start_demo.sh` to ensure all 5 services are online (Hardhat on 8545, FastAPI on 8000, Vite on 5173).
- [ ] Open Chrome / Chromium at `http://localhost:5173`.
- [ ] Set browser zoom to 100% and maximize window to full 1080p.
- [ ] Ensure terminal is open in a split screen or secondary monitor to show automated tests (`pytest` and `hardhat test`).
- [ ] Check audio input levels to ensure no distortion or clipping.
- [ ] Keep browser bookmark bar and personal extensions hidden.

---

## 2. Minute-by-Minute Shot List & Narration Script

### Scene 1: Introduction & 360° Telemetry Dashboard (0:00 - 0:35)
- **Visual**: Full-screen view of CyberTrust 360 header and the `PlatformDashboardOverview` card grid.
- **On-Screen Action**: Smooth scroll past the hero down to the 5 telemetry counter cards (`URL Scans: 73`, `Scam DNA: 196`, `High Risk: 111`, `Correlations: 74`, `On-Chain: 9`). Hover over the 4 module navigation cards.
- **Narration**:  
  *"Welcome to CyberTrust 360, built by Team TECHNIX PRO. Modern web threats are faster and more deceptive than ever—from lookalike domains to urgent UPI scams and fake KYC blocks. CyberTrust 360 is an integrated cybersecurity intelligence platform combining multi-vector infrastructure inspection, AI linguistic scam sequencing, threat relationship graphs, and blockchain attestation. Here on our live telemetry dashboard, you can see real-time database metrics reflecting our active persistence ledger."*

### Scene 2: URL & Domain Threat Investigation Engine (0:35 - 1:25)
- **Visual**: Zoom in on the URL Scanner `#investigate`.
- **On-Screen Action**: Click the preset `https://paypa1-account-login-update.com` and click **Analyze Domain**. The loading spinner displays, and the report auto-scrolls into view. Hover over the 0–100 risk score (High Risk / 88), DNS records, TLS expiration (4 days remaining), and missing HSTS header.
- **Narration**:  
  *"Let's begin with our URL Investigation Engine. We submit a suspicious domain mimicking PayPal. Our backend concurrently probes DNS infrastructure, TLS certificate lifespan, and security headers while strictly enforcing SSRF guardrails against private subnets and loopback addresses. The engine returns an explainable risk score of 88 out of 100 with granular evidence: typosquatting detection, critical missing headers, and an imminent certificate expiration. All findings are persisted in our database with complete audit trails."*

### Scene 3: AI Scam DNA & 'What Should I Do Now?' Guidance (1:25 - 2:20)
- **Visual**: Smooth scroll to `#scam-dna` (Scam DNA Analyzer).
- **On-Screen Action**: Select preset `Electricity Bill Disconnection (Hinglish)`. Click **Sequence Scam DNA**. Review the extracted phone number and manipulation tactics. Scroll down to the **What Should I Do Now?** interactive matrix and click **Made UPI payment**.
- **Narration**:  
  *"Attackers don't just rely on malicious websites; they exploit human emotion through deceptive messages. In our Scam DNA Analyzer, we paste an urgent electricity cutoff threat. Our linguistic engine extracts the burner phone number, flags high urgency pressure, and classifies the scam archetype with 100% honest disclosure of our deterministic rule fallback. Below, our 'What Should I Do Now?' incident protocol guides victims through Golden Hour steps, advising immediate calls to India's National Cyber Crime Helpline 1930 and bank fraud cells without falsely guaranteeing fund recovery."*

### Scene 4: Threat Relationship Intelligence Graph (2:20 - 3:05)
- **Visual**: Jump to `#relationship-graph` (Threat Relationship Graph).
- **On-Screen Action**: Click on the banking phishing hub node. Notice the cyan halo and the automatic dimming of unrelated nodes. Click on a solid green connecting edge to open the **Relationship Evidence Drawer**. Highlight the verified shared indicator matching the domain.
- **Narration**:  
  *"Cyber threats rarely operate in isolation. Our Threat Relationship Graph, powered by React Flow, clusters real database records to reveal attacker infrastructure. Clicking any entity highlights its 1-hop neighborhood while dimming background records. Solid green edges denote verified shared technical indicators—such as identical domains or UPI payment handles—while dashed amber edges denote inferred playbooks. The forensic evidence panel displays exact technical quotes, while our embedded attribution guardrail makes clear that shared infrastructure does not prove identical criminal identity."*

### Scene 5: Blockchain Threat Report Integrity & Tamper Detection (3:05 - 3:45)
- **Visual**: Jump to `#blockchain-trust` (Blockchain Trust Center).
- **On-Screen Action**: Show the EVM network status bar (Connected, Block #7, Chain ID 31337). Click **Verify Report Integrity** on an existing report to show the green `VERIFIED — REPORT UNCHANGED` banner with matching hashes. Then click **Simulate Tamper (Scenario B)** and observe the instant red `MISMATCH — REPORT MODIFIED` security alert.
- **Narration**:  
  *"Finally, how do we prove that threat intelligence hasn't been altered? Our Blockchain Trust Center anchors reports to a Solidity smart contract on our local EVM node using zero-PII canonical SHA-256 hashing. When we verify a report, the on-chain hash matches. But when we test Hackathon Scenario B by simulating an unauthorized in-memory score change, our smart contract immediately detects the discrepancy, triggering an instant security alert showing the exact hash diff."*

### Scene 6: Closing Summary & Engineering Verification (3:45 - 4:00)
- **Visual**: Switch to terminal showing 58 passing tests (`pytest` and `npx hardhat test`). End on the CyberTrust 360 logo and team credits.
- **Narration**:  
  *"CyberTrust 360 is built with rigorous engineering: 58 automated tests passing, production-built frontend, and one-command local startup. Developed by Team TECHNIX PRO. Your Digital World, Protected from Every Angle. Thank you!"*
