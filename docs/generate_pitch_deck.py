import os
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.enum.text import PP_ALIGN
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE

def create_deck():
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)

    # Theme Colors
    BG_COLOR = RGBColor(15, 23, 42)       # Slate 900
    CARD_BG = RGBColor(30, 41, 59)        # Slate 800
    CYAN = RGBColor(6, 182, 212)          # Cyan 500
    EMERALD = RGBColor(16, 185, 129)      # Emerald 500
    AMBER = RGBColor(245, 158, 11)        # Amber 500
    WHITE = RGBColor(255, 255, 255)
    LIGHT_GRAY = RGBColor(148, 163, 184)  # Slate 400

    def set_slide_background(slide):
        background = slide.shapes.add_shape(
            MSO_SHAPE.RECTANGLE, 0, 0, Inches(13.333), Inches(7.5)
        )
        background.fill.solid()
        background.fill.fore_color.rgb = BG_COLOR
        background.line.color.rgb = BG_COLOR
        return background

    def add_header(slide, eyebrow, title):
        tb = slide.shapes.add_textbox(Inches(0.8), Inches(0.5), Inches(11.7), Inches(1.2))
        tf = tb.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0

        p1 = tf.paragraphs[0]
        p1.text = eyebrow.upper()
        p1.font.size = Pt(11)
        p1.font.bold = True
        p1.font.color.rgb = CYAN

        p2 = tf.add_paragraph()
        p2.text = title
        p2.font.size = Pt(28)
        p2.font.bold = True
        p2.font.color.rgb = WHITE
        p2.space_before = Pt(4)

    def add_card(slide, left, top, width, height, title, body_bullets, accent_color=CYAN):
        card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
        card.fill.solid()
        card.fill.fore_color.rgb = CARD_BG
        card.line.color.rgb = accent_color
        card.line.width = Pt(1.5)

        tb = slide.shapes.add_textbox(left + Inches(0.3), top + Inches(0.3), width - Inches(0.6), height - Inches(0.6))
        tf = tb.text_frame
        tf.word_wrap = True

        p = tf.paragraphs[0]
        p.text = title
        p.font.size = Pt(16)
        p.font.bold = True
        p.font.color.rgb = accent_color

        for item in body_bullets:
            p_b = tf.add_paragraph()
            p_b.text = f"• {item}"
            p_b.font.size = Pt(12)
            p_b.font.color.rgb = LIGHT_GRAY
            p_b.space_before = Pt(6)

    blank_layout = prs.slide_layouts[6]

    # -------------------------------------------------------------
    # SLIDE 1: Title & Team
    # -------------------------------------------------------------
    s1 = prs.slides.add_slide(blank_layout)
    set_slide_background(s1)

    tb = s1.shapes.add_textbox(Inches(1.0), Inches(1.8), Inches(11.3), Inches(3.8))
    tf = tb.text_frame
    tf.word_wrap = True

    p = tf.paragraphs[0]
    p.text = "CYBERTRUST 360"
    p.font.size = Pt(48)
    p.font.bold = True
    p.font.color.rgb = WHITE

    p2 = tf.add_paragraph()
    p2.text = "Your Digital World. Protected from Every Angle."
    p2.font.size = Pt(22)
    p2.font.bold = True
    p2.font.color.rgb = CYAN
    p2.space_before = Pt(10)

    p3 = tf.add_paragraph()
    p3.text = "AI-Powered Web Threat Detection & Digital Trust Intelligence Platform\nDeveloped by Team TECHNIX PRO | 48-Hour Hackathon Submission"
    p3.font.size = Pt(14)
    p3.font.color.rgb = LIGHT_GRAY
    p3.space_before = Pt(16)

    # Team Members Box
    add_card(s1, Inches(1.0), Inches(5.0), Inches(11.3), Inches(1.8), "TEAM MEMBERS — TECHNIX PRO", [
        "Sayan Ghosh — Lead Full-Stack & Systems Architecture Engineer",
        "Sayani Ghosal — AI/ML & Scam Intelligence Research Engineer",
        "Hritushree Mitra — Threat Correlation & Graph Frontend Engineer",
        "Swastika Paul — Cybersecurity, Security Hardening & Quality Assurance Engineer"
    ], EMERALD)

    # -------------------------------------------------------------
    # SLIDE 2: The Problem
    # -------------------------------------------------------------
    s2 = prs.slides.add_slide(blank_layout)
    set_slide_background(s2)
    add_header(s2, "Challenge & Motivation", "The Problem: Pervasive Web Threats & Sophisticated Scams")

    add_card(s2, Inches(0.8), Inches(2.0), Inches(3.6), Inches(4.8), "Deceptive Web Infrastructure", [
        "Phishing domains register lookalike names (typosquatting, brand spoofing).",
        "Attackers weaponize valid SSL/TLS certificates to create false trust.",
        "Rapid churn across subdomains and burner servers bypasses traditional static blacklists."
    ], CYAN)

    add_card(s2, Inches(4.8), Inches(2.0), Inches(3.6), Inches(4.8), "Linguistic & Financial Fraud", [
        "Digital coercion targets citizens via SMS, WhatsApp, and Telegram.",
        "Indian payment fraud: Fake UPI refunds, electricity disconnection threats, and fake KYC blocks.",
        "Fraudsters manipulate victims into sharing OTPs and UPI PINs in urgent scenarios."
    ], AMBER)

    add_card(s2, Inches(8.8), Inches(2.0), Inches(3.6), Inches(4.8), "Fragmented Audit & Evidence", [
        "Victims and analysts lack transparent, explainable 0–100 risk scoring.",
        "Scam campaigns operate as coordinated networks sharing burner numbers and domains.",
        "Evidence logs are vulnerable to retroactive tampering and dispute."
    ], EMERALD)

    # -------------------------------------------------------------
    # SLIDE 3: Our Solution
    # -------------------------------------------------------------
    s3 = prs.slides.add_slide(blank_layout)
    set_slide_background(s3)
    add_header(s3, "Unified Intelligence", "Our Solution: CyberTrust 360")

    add_card(s3, Inches(0.8), Inches(2.0), Inches(5.6), Inches(2.3), "1. Deep URL & Domain Investigation", [
        "Multi-vector non-invasive technical inspection of DNS, TLS/SSL lifespan, security headers, and threat feeds with strict SSRF defense."
    ], CYAN)

    add_card(s3, Inches(6.8), Inches(2.0), Inches(5.6), Inches(2.3), "2. AI Scam DNA Sequencing", [
        "Extracts manipulation tactics, urgency pressure, Indian scam archetypes, and threat indicators with prompt injection defenses."
    ], AMBER)

    add_card(s3, Inches(0.8), Inches(4.6), Inches(5.6), Inches(2.3), "3. Interactive Threat Graph", [
        "Multi-hop React Flow visualization linking shared domains, UPI VPAs, and tactics into correlated campaign clusters."
    ], EMERALD)

    add_card(s3, Inches(6.8), Inches(4.6), Inches(5.6), Inches(2.3), "4. Blockchain Integrity Verification", [
        "Immutable SHA-256 canonical report fingerprinting anchored to Solidity smart contract on EVM with tamper detection."
    ], CYAN)

    # -------------------------------------------------------------
    # SLIDE 4: How the Platform Works
    # -------------------------------------------------------------
    s4 = prs.slides.add_slide(blank_layout)
    set_slide_background(s4)
    add_header(s4, "Data Lifecycle", "How the Platform Works: End-to-End Pipeline")

    steps = [
        ("Step 1: Input", "User submits target URL or suspicious scam message text."),
        ("Step 2: Deep Inspection", "FastAPI concurrently probes DNS, TLS, headers, and threat feeds."),
        ("Step 3: AI Sequencing", "LLM or rule engine isolates indicators and manipulation patterns."),
        ("Step 4: Persistence", "Full technical findings stored in PostgreSQL with SQLite fallback."),
        ("Step 5: Threat Correlation", "Graph engine maps shared technical indicators into clusters."),
        ("Step 6: Web3 Fingerprint", "Deterministic RFC 8785 hash committed to Solidity smart contract."),
        ("Step 7: Verification", "On-demand tamper detection verifies immutable proof on EVM.")
    ]

    for idx, (stitle, sdesc) in enumerate(steps):
        top_pos = Inches(1.8 + idx * 0.75)
        tb = s4.shapes.add_textbox(Inches(1.0), top_pos, Inches(11.3), Inches(0.65))
        tf = tb.text_frame
        p = tf.paragraphs[0]
        p.text = f"{stitle}: "
        p.font.size = Pt(13)
        p.font.bold = True
        p.font.color.rgb = CYAN
        
        run = p.add_run()
        run.text = sdesc
        run.font.size = Pt(13)
        run.font.color.rgb = WHITE

    # -------------------------------------------------------------
    # SLIDE 5: URL Investigation Engine
    # -------------------------------------------------------------
    s5 = prs.slides.add_slide(blank_layout)
    set_slide_background(s5)
    add_header(s5, "Module 01", "URL & Website Investigation Engine")

    add_card(s5, Inches(0.8), Inches(2.0), Inches(5.6), Inches(4.8), "Multi-Vector Analysis Capabilities", [
        "URL Analysis: Detects IP-based hosts, embedded @ delimiters, excessive hyphens, brand-in-subdomain spoofing, and typosquatting.",
        "DNS Infrastructure: Queries A, AAAA, MX, TXT, and NS records with dnspython.",
        "SSL/TLS Inspection: Live certificate validity, cipher suite, issuer verification, and expiration lifespan analysis.",
        "HTTP Security Headers: Audits HSTS, CSP, X-Frame-Options, MIME sniffing defenses, and per-hop redirect chains.",
        "Threat Intelligence Feeds: Google Safe Browsing and URLhaus integrations with transparent 'Not configured' labeling when keys are absent."
    ], CYAN)

    add_card(s5, Inches(6.8), Inches(2.0), Inches(5.6), Inches(4.8), "Defensive Guardrails & Risk Scoring", [
        "Strict SSRF Defense: Prohibits loopback (127.0.0.1, ::1), private RFC 1918 ranges, link-local metadata (169.254.169.254), and multicast.",
        "Per-Hop Redirect Validation: Re-verifies every single redirect target host before following.",
        "Explainable 0–100 Scoring: Transparent formulas categorizing targets into Low Risk, Suspicious, High Risk, Confirmed Malicious, or Inconclusive.",
        "Database Persistence: Scan history recorded in PostgreSQL / SQLite with 1-click historical reload."
    ], EMERALD)

    # -------------------------------------------------------------
    # SLIDE 6: Scam DNA Intelligence
    # -------------------------------------------------------------
    s6 = prs.slides.add_slide(blank_layout)
    set_slide_background(s6)
    add_header(s6, "Module 02", "AI Scam DNA Intelligence & Incident Guidance")

    add_card(s6, Inches(0.8), Inches(2.0), Inches(5.6), Inches(4.8), "Linguistic Sequencing & Pattern Recognition", [
        "Indian Cyber Threat Specialization: Heuristic patterns for fake bank KYC blocks, UPI PIN inversion fraud, electricity bill disconnection, and fake job tasks.",
        "Indicator Extraction: Auto-extracts domains, phone numbers, UPI VPAs, and APK references.",
        "Prompt Injection Shield: Strictly wraps untrusted text in XML delimiters with defensive system prompts.",
        "Honest Dual Engine: Seamless fallback between real Gemini/OpenAI models and deterministic rule engine with 100% transparent attribution."
    ], AMBER)

    add_card(s6, Inches(6.8), Inches(2.0), Inches(5.6), Inches(4.8), "Incident Guidance ('What Should I Do Now?')", [
        "5 Situational States: Received message only, Clicked link, Entered credentials, Shared OTP, Made UPI payment.",
        "Golden Hour Action Protocol: Advises immediate dialing of National Cyber Crime Helpline 1930 and bank card freeze.",
        "Non-Attribution & Recovery Boundaries: Honestly informs victims that reporting enables rapid account freeze attempts, without falsely guaranteeing fund recovery.",
        "Cross-Module Workflow: 1-click CTA on extracted URLs directly launches deep URL scanner."
    ], CYAN)

    # -------------------------------------------------------------
    # SLIDE 7: Threat Relationship Intelligence
    # -------------------------------------------------------------
    s7 = prs.slides.add_slide(blank_layout)
    set_slide_background(s7)
    add_header(s7, "Module 03", "Threat Relationship Intelligence & Scam Graph")

    add_card(s7, Inches(0.8), Inches(2.0), Inches(5.6), Inches(4.8), "Interactive React Flow Graph", [
        "Multi-Entity Node Model: 7 node types representing URL scans, Scam reports, domains, URLs, brands, tactics, and indicators.",
        "Anti-Overlap Layout Engine: Force-directed spacing ensures high readability across complex clusters.",
        "Focused Live View: Defaults to top 28 key correlated entities with in-place cluster expansion toggle.",
        "Dynamic Highlighting: Clicking any node highlights direct 1-hop neighbors and dims unrelated nodes by 85%."
    ], EMERALD)

    add_card(s7, Inches(6.8), Inches(2.0), Inches(5.6), Inches(4.8), "Forensic Evidence & Correlation Rules", [
        "Verified vs Inferred Connections: Green solid edges for verified shared indicators (exact domain, phone, UPI match); dashed amber edges for inferred tactical playbooks.",
        "Evidence Side Panel: Deep technical inspection displaying source/target identities, match evidence quotes, and confidence levels.",
        "Attribution Guardrail: Prominent legal disclaimer explaining that shared infrastructure does not prove identical criminal identity.",
        "Demonstration Mode: Clearly labeled synthetic demo toggle separated from live database ingestion."
    ], CYAN)

    # -------------------------------------------------------------
    # SLIDE 8: Blockchain Report Verification
    # -------------------------------------------------------------
    s8 = prs.slides.add_slide(blank_layout)
    set_slide_background(s8)
    add_header(s8, "Module 04", "Blockchain Threat Report Integrity & Trust Center")

    add_card(s8, Inches(0.8), Inches(2.0), Inches(5.6), Inches(4.8), "Solidity Smart Contract Registry", [
        "CyberTrustReportRegistry.sol: Solidity 0.8.24 registry deployed to local Hardhat EVM (Chain ID 31337).",
        "Zero-PII Storage: Commits only 32-byte reportIdHash, contentHash, reportType, version, and registrar address.",
        "Role-Based Access: Authorized registrar access controls with immutable incremental versioning.",
        "Gas-Free View Queries: Fast off-chain verification probes alongside on-chain audit event logging."
    ], CYAN)

    add_card(s8, Inches(6.8), Inches(2.0), Inches(5.6), Inches(4.8), "Canonical Fingerprinting & Tamper Detection", [
        "RFC 8785 Canonical Hashing: Recursively sorted JSON serialization ensures deterministic SHA-256 calculation.",
        "Scenario A (Verified): Matches live report against on-chain hash, returning verified status and block confirmation.",
        "Scenario B (Tamper Detection): Simulates in-memory risk score alteration, immediately detecting mismatch and raising security alert.",
        "Attestation Scope Disclaimer: Confirms record matches on-chain hash at registration; does not prove external factual accuracy."
    ], EMERALD)

    # -------------------------------------------------------------
    # SLIDE 9: Architecture & Security Hardening
    # -------------------------------------------------------------
    s9 = prs.slides.add_slide(blank_layout)
    set_slide_background(s9)
    add_header(s9, "Technical Rigor", "Architecture, Security Hardening & Innovation")

    add_card(s9, Inches(0.8), Inches(2.0), Inches(5.6), Inches(4.8), "Security Hardening Achievements", [
        "SSRF & Rebinding Protection: Strict IP subnet validation across all initial targets and redirect hops.",
        "Prompt Injection Isolation: Defensive delimiters and untrusted text sandboxing.",
        "Zero Exposure: Threat intelligence API keys and signing keys stored safely in .env.",
        "Resilient Data Tier: PostgreSQL 16 with zero-downtime automatic SQLite fallback.",
        "Honest Attribution: Rule fallbacks and simulated demo modes are never disguised as live AI or real criminals."
    ], AMBER)

    add_card(s9, Inches(6.8), Inches(2.0), Inches(5.6), Inches(4.8), "Testing & Verification Metrics", [
        "58 Automated Tests Passing: 13 smart contract unit tests + 45 backend pytest tests (100% pass rate).",
        "Frontend Production Build: Clean TypeScript compilation (0 errors, 245ms build time).",
        "One-Command Startup: ./start_demo.sh verifies backend, blockchain, and frontend in under 3 seconds.",
        "Documented Codebase: Complete ARCHITECTURE.md, PROJECT_CONTEXT.md, and README.md."
    ], CYAN)

    # -------------------------------------------------------------
    # SLIDE 10: Impact, Future Scope & Team
    # -------------------------------------------------------------
    s10 = prs.slides.add_slide(blank_layout)
    set_slide_background(s10)
    add_header(s10, "Summary & Impact", "Real-World Impact, Future Scope & Team")

    add_card(s10, Inches(0.8), Inches(2.0), Inches(5.6), Inches(4.8), "Real-World Impact & Innovation", [
        "Empowers Citizens & Analysts: Demystifies cyber deception with plain-language evidence and Golden Hour guidance.",
        "Bridges AI & Web3: Combines flexible linguistic AI analysis with immutable cryptographic ledger attestation.",
        "Coordinated Defense: Threat graph turns isolated scam reports into actionable campaign intelligence.",
        "Future Roadmap: Public testnet anchoring (Polygon/Base), browser extension for real-time web shield, and automated telecom reporting integrations."
    ], CYAN)

    add_card(s10, Inches(6.8), Inches(2.0), Inches(5.6), Inches(4.8), "Developed by Team TECHNIX PRO", [
        "Sayan Ghosh — Lead Full-Stack & Systems Architecture Engineer",
        "Sayani Ghosal — AI/ML & Scam Intelligence Research Engineer",
        "Hritushree Mitra — Threat Correlation & Graph Frontend Engineer",
        "Swastika Paul — Cybersecurity, Security Hardening & Quality Assurance Engineer",
        "Thank you! Visit http://localhost:5173 to explore CyberTrust 360 live."
    ], EMERALD)

    output_path = os.path.abspath("docs/CyberTrust360_PitchDeck.pptx")
    prs.save(output_path)
    print(f"Presentation saved successfully to {output_path}")

if __name__ == "__main__":
    create_deck()
