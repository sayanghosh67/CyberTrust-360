import re
from typing import List, Tuple, Dict, Any
from backend.app.schemas.scam import ScamTactic, ExtractedIndicator

# Targeted Regex Rules for Indian & Global Threat Patterns
KYC_PATTERNS = [
    r'\b(?:pan\s*(?:card)?|kyc|aadhaar)\b.*?\b(?:updat(?:e|ed|ing)?|expir(?:e|ed|ing)?|link(?:ed)?|block(?:ed)?|suspend(?:ed)?|deactivat(?:ed|e|ion)?|pend(?:ing)?|verify|verif(?:ied|ication)?)\b',
    r'\b(?:account|yono|netbanking|sim)\b.*?\b(?:block(?:ed)?|suspend(?:ed)?|deactivat(?:ed|e|ion)?|hold|freeze|frozen|closed?)\b',
    r'\b(?:khata|account)\b.*?\b(?:band\s*(?:ho\s*jayega)?|rok\s*diya|turant\s*update)\b',
    r'\b(?:update\s*your\s*pan|complete\s*(?:your\s*)?kyc)\b',
]

UPI_FRAUD_PATTERNS = [
    r'\b(?:enter|share|type|put)\s+(?:(?:your|the)\s+)?(?:upi\s*)?pin\b.*?\b(?:receive|credit|claim|get|refund|cashback|bonus|amount|paise)\b',
    r'\b(?:upi\s*pin|pin)\b.*?\b(?:paise\s*(?:lene|paane|pane)|refund\s*pane)\b',
    r'\b(?:scan\s*(?:this\s*)?(?:qr|qr\s*code))\b.*?\b(?:receive|credit|claim|get|refund|cashback|bonus|prize|amount|paise)\b',
    r'\b(?:approve|accept)\s*(?:collect\s*request|mandate)\b.*?\b(?:receive|get|credit)\b',
]

ELECTRICITY_PATTERNS = [
    r'\b(?:electricity|power|bijli)\b.*?\b(?:disconnect(?:ed)?|cut\s*off|terminate|kat\s*jayegi)\b',
    r'\b(?:bill\s*unpaid|bill\s*pending|payment\s*update)\b.*?\b(?:officer|contact|call\s*on)\b',
    r'\b(?:tonight\s*at\s*9:30|today\s*at\s*9:30|aaj\s*raat)\b',
]

JOB_SCAM_PATTERNS = [
    r'\b(?:earn|kamaye)\s*(?:₹|rs\.?|inr)?\s*[\d,]+\s*(?:-|to)?\s*[\d,]*\s*(?:daily|per\s*day|pratidin|monthly)\b',
    r'\b(?:part\s*time|work\s*from\s*home|wfh)\b.*?\b(?:telegram|youtube\s*like|task|daily\s*payout|review)\b',
    r'\b(?:like\s*youtube\s*videos?|subscribe\s*channels?)\b.*?\b(?:earn|get\s*paid|money)\b',
]

DELIVERY_PATTERNS = [
    r'\b(?:india\s*post|bluedart|dtdc|courier|parcel|package|shipment)\b.*?\b(?:cannot\s*be\s*delivered|incomplete\s*address|held\s*at\s*warehouse|pay\s*fee|update\s*address)\b',
    r'\b(?:pay|charge)\s*(?:₹|rs\.?)\s*[1-9]\d{0,2}\b.*?\b(?:re-?delivery|delivery\s*fee|address\s*update)\b',
]

URGENCY_PATTERNS = [
    r'\b(?:immediate|urgently|within\s*24\s*hours|within\s*2\s*hours|today\s*itself|final\s*warning|last\s*chance)\b',
    r'\b(?:turant|aaj\s*hi|jaldi|antim\s*chetavani)\b',
    r'\b(?:legal\s*action|police\s*complaint|fir|arrest\s*warrant|cbi|digital\s*arrest)\b',
]

OTP_HARVEST_PATTERNS = [
    r'\b(?:share|tell|send|enter)\s*(?:this|the|your)?\s*otp\b.*?\b(?:officer|executive|manager|cancel|prevent)\b',
    r'\b(?:otp|one\s*time\s*password)\b.*?\b(?:batao|share\s*karein|bhejo)\b',
]

LOTTERY_PATTERNS = [
    r'\b(?:congratulations|congrats|mubarak)\b.*?\b(?:won|winner|lottery|lucky\s*draw|cash\s*(?:prize|refund|reward)|reward|crorepati|kbc)\b',
    r'\b(?:claim|receive)\s*(?:your\s*)?(?:prize|reward|gift\s*card|free\s*iphone)\b',
]

REMOTE_APP_PATTERNS = [
    r'\b(?:install|download)\b.*?\b(?:anydesk|teamviewer|rustdesk|quicksupport|screen\s*share)\b',
]

# Legitimate defensive phrases (reduces false positives for genuine alerts)
LEGITIMATE_DEFENSIVE_PHRASES = [
    "do not share this otp with anyone",
    "never share your otp, pin, or password",
    "sbi never asks for your confidential information",
    "hdfc bank will never ask for your netbanking password",
    "if this was not you, please report to",
    "for any queries call official customer care",
    "never share otp with bank employees or anyone else",
]


def detect_hinglish(text: str) -> bool:
    """Detects whether text uses common Hindi-English colloquial words."""
    hinglish_markers = [
        "aapka", "karein", "turant", "khata", "band", "jayega", "paise", "pane", "raat",
        "bijli", "chetavani", "batao", "bhejo", "sampark", "hoga", "shuru", "mubarak"
    ]
    t = text.lower()
    return any(re.search(r'\b' + m + r'\b', t) for m in hinglish_markers)


def analyze_scam_rules(
    message: str,
    extracted_indicators: List[ExtractedIndicator],
) -> Dict[str, Any]:
    """
    Deterministic Scam Intelligence Engine.
    Evaluates multi-vector tactics with deep Indian digital payment & cyber threat context.
    Avoids declaring safe messages malicious solely for mentioning banking terms.
    """
    text = message.strip()
    text_lower = text.lower()
    tactics: List[ScamTactic] = []
    accumulated_score = 0

    urls = [ind.value for ind in extracted_indicators if ind.type == "url"]
    phones = [ind.value for ind in extracted_indicators if ind.type == "phone"]
    brands = [ind.value for ind in extracted_indicators if ind.type == "brand"]
    upi_ids = [ind.value for ind in extracted_indicators if ind.type == "upi_id"]
    is_hinglish = detect_hinglish(text)
    detected_language = "Hinglish" if is_hinglish else "English"

    # Check for legitimate defensive phrases
    has_defensive_phrases = any(dp in text_lower for dp in LEGITIMATE_DEFENSIVE_PHRASES)

    # 1. Bank KYC & Account Block Fraud Check
    for pat in KYC_PATTERNS:
        match = re.search(pat, text_lower)
        if match:
            # If accompanied by an unverified URL or unofficial phone number
            is_critical = len(urls) > 0 or len(phones) > 0
            severity = "critical" if is_critical else "high"
            accumulated_score += 45 if is_critical else 30
            tactics.append(
                ScamTactic(
                    id="tactic_bank_kyc",
                    category="impersonation",
                    severity=severity,
                    name="Fake Bank KYC / Account Block Coercion",
                    evidence=match.group(0),
                    explanation="Coercive alert claiming account deactivation or pending KYC, prompting user to click unverified links or call unauthorized numbers."
                )
            )
            break

    # 2. UPI PIN / Collect Request Trap Check
    for pat in UPI_FRAUD_PATTERNS:
        match = re.search(pat, text_lower)
        if match:
            accumulated_score += 50
            tactics.append(
                ScamTactic(
                    id="tactic_upi_fraud",
                    category="financial_fraud",
                    severity="critical",
                    name="UPI PIN / Collect Request Inversion Fraud",
                    evidence=match.group(0),
                    explanation="Fraudulent claim that entering a UPI PIN or approving a collect request is required to receive money. UPI PIN is exclusively used to debit money, never to credit."
                )
            )
            break

    # 3. Electricity / Utility Disconnection Scare
    for pat in ELECTRICITY_PATTERNS:
        match = re.search(pat, text_lower)
        if match:
            accumulated_score += 45
            tactics.append(
                ScamTactic(
                    id="tactic_utility_threat",
                    category="urgency_threat",
                    severity="high",
                    name="Imminent Utility Disconnection Scare",
                    evidence=match.group(0),
                    explanation="Common electricity scam claiming power disconnection tonight unless an unauthorized number is contacted immediately."
                )
            )
            break

    # 4. Fake Job / Part-Time Telegram Task Scams
    for pat in JOB_SCAM_PATTERNS:
        match = re.search(pat, text_lower)
        if match:
            accumulated_score += 50
            tactics.append(
                ScamTactic(
                    id="tactic_job_fraud",
                    category="job_scam",
                    severity="high",
                    name="Part-Time Daily Task / Job Offer Scam",
                    evidence=match.group(0),
                    explanation="Unrealistic compensation for trivial online actions (liking YouTube videos, product ratings), typically funneling victims into Telegram prepaid deposit traps."
                )
            )
            break

    # 5. Postal / Delivery Package Fee Phishing
    for pat in DELIVERY_PATTERNS:
        match = re.search(pat, text_lower)
        if match:
            accumulated_score += 40
            tactics.append(
                ScamTactic(
                    id="tactic_delivery_fee",
                    category="financial_fraud",
                    severity="high",
                    name="Delivery Rescheduling / Micro-Payment Phishing",
                    evidence=match.group(0),
                    explanation="Impersonates logistics or India Post claiming an address error and demanding a nominal re-delivery fee to harvest credit/debit card credentials."
                )
            )
            break

    # 6. OTP Harvesting Coercion
    for pat in OTP_HARVEST_PATTERNS:
        match = re.search(pat, text_lower)
        if match:
            accumulated_score += 45
            tactics.append(
                ScamTactic(
                    id="tactic_otp_harvest",
                    category="credential_harvesting",
                    severity="critical",
                    name="Direct OTP Solicitation",
                    evidence=match.group(0),
                    explanation="Explicitly asks the recipient to share or enter a One Time Password (OTP). Legitimate financial institutions never solicit OTPs."
                )
            )
            break

    # 7. Fake Lotteries & Unsolicited Rewards
    for pat in LOTTERY_PATTERNS:
        match = re.search(pat, text_lower)
        if match:
            accumulated_score += 35
            tactics.append(
                ScamTactic(
                    id="tactic_lottery_reward",
                    category="fake_reward",
                    severity="high",
                    name="Unsolicited Lottery / Cash Reward Bait",
                    evidence=match.group(0),
                    explanation="Lures victims with fraudulent prize claims to extract advance registration fees or banking credentials."
                )
            )
            break

    # 8. Remote Screen-Sharing Tool Solicitation
    for pat in REMOTE_APP_PATTERNS:
        match = re.search(pat, text_lower)
        if match:
            accumulated_score += 50
            tactics.append(
                ScamTactic(
                    id="tactic_remote_app",
                    category="credential_harvesting",
                    severity="critical",
                    name="Remote Desktop Access Solicitation (AnyDesk/TeamViewer)",
                    evidence=match.group(0),
                    explanation="Coerces user to download remote desktop utilities that grant threat actors complete unauthorized control over the device and banking apps."
                )
            )
            break

    # 9. Artificial Urgency / Pressure Tactics
    for pat in URGENCY_PATTERNS:
        match = re.search(pat, text_lower)
        if match and not any(t.category == "urgency_threat" for t in tactics):
            accumulated_score += 20
            tactics.append(
                ScamTactic(
                    id="tactic_urgency_pressure",
                    category="urgency_threat",
                    severity="medium",
                    name="Artificial Urgency & Coercive Pressure",
                    evidence=match.group(0),
                    explanation="Creates psychological panic using aggressive deadlines or threatened legal action to bypass critical thinking."
                )
            )
            break

    # 10. Suspicious / Shortened Links Penalty
    suspicious_url_domains = [
        "bit.ly", "tinyurl.com", "t.co", "is.gd", "ngrok", "xyz", "top", "online", "apk"
    ]
    has_suspicious_url = any(any(s in u.lower() for s in suspicious_url_domains) for u in urls)
    if has_suspicious_url:
        accumulated_score += 25
        tactics.append(
            ScamTactic(
                id="tactic_suspicious_link",
                category="credential_harvesting",
                severity="high",
                name="Masked or Suspicious Hyperlink",
                evidence=", ".join(urls[:2]),
                explanation="Message utilizes shortened or high-risk domain extensions to obscure destination infrastructure and bypass SMS spam filters."
            )
        )

    # Contextual Moderation: If message has defensive phrases and NO malicious tactics
    if has_defensive_phrases and len(tactics) == 0:
        accumulated_score = 0
    elif has_defensive_phrases and len(tactics) > 0:
        # Scam message mimicking defensive advice (spoofing trick)
        accumulated_score = min(100, accumulated_score + 5)

    # Cap risk score between 0 and 100
    risk_score = min(100, max(0, accumulated_score))

    # Determine Classification
    if risk_score >= 80:
        classification = "High Risk"  # Note: Reserved "Confirmed Malicious" strictly for authoritative feed confirmation
        confidence = "High"
    elif risk_score >= 45:
        classification = "High Risk"
        confidence = "High" if len(tactics) >= 2 else "Medium"
    elif risk_score >= 20:
        classification = "Suspicious"
        confidence = "Medium"
    else:
        classification = "Low Risk"
        confidence = "High" if has_defensive_phrases else "Medium"

    # Identify Primary Scam Archetype
    if any(t.id == "tactic_bank_kyc" for t in tactics):
        archetype = "Bank KYC / Account Suspension Deception"
    elif any(t.id == "tactic_upi_fraud" for t in tactics):
        archetype = "UPI Payment / Collect Request Trap"
    elif any(t.id == "tactic_utility_threat" for t in tactics):
        archetype = "Utility Disconnection Threat (Bijli Scam)"
    elif any(t.id == "tactic_job_fraud" for t in tactics):
        archetype = "Fake Job & Telegram Task Scheme"
    elif any(t.id == "tactic_delivery_fee" for t in tactics):
        archetype = "Courier / Postal Rescheduling Phish"
    elif any(t.id == "tactic_otp_harvest" for t in tactics):
        archetype = "Direct OTP / Credential Siphon"
    elif any(t.id == "tactic_remote_app" for t in tactics):
        archetype = "Remote Screen Access Exploitation"
    elif any(t.id == "tactic_lottery_reward" for t in tactics):
        archetype = "Lottery / Reward Advance-Fee Fraud"
    elif risk_score >= 20:
        archetype = "Suspicious Social Engineering Anomaly"
    else:
        archetype = "Benign Communication / Standard Alert"

    # Construct Executive Summary
    if classification == "High Risk":
        summary = (
            f"High-confidence scam indicators identified. Message exhibits {len(tactics)} core deceptive tactic(s) "
            f"characteristic of '{archetype}'. High risk of financial loss or credential compromise."
        )
    elif classification == "Suspicious":
        summary = (
            f"Suspicious communication patterns observed ({len(tactics)} tactic flagged). "
            f"Message requires caution and independent verification before taking any requested action."
        )
    else:
        summary = (
            "No aggressive scam tactics, urgent threats, or fraudulent payment requests detected in message. "
            "Appears consistent with standard transactional communications."
        )

    # Tailored Defensive Recommendations
    recommended_actions: List[str] = []
    if classification == "High Risk":
        recommended_actions.append("Do NOT click any links, open attachments, or call numbers listed in the message.")
        recommended_actions.append("NEVER share OTPs, PINs, passwords, or install screen-sharing software (AnyDesk, TeamViewer).")
        recommended_actions.append("If this claims to be your bank, verify only through the official banking app or branch.")
        recommended_actions.append("Report suspected cyber fraud immediately via India's National Helpline 1930 or cybercrime.gov.in (prompt reporting is recommended to request holds, though recovery cannot be guaranteed).")
    elif classification == "Suspicious":
        recommended_actions.append("Do not reply directly to this message or send money via UPI.")
        recommended_actions.append("Cross-check the sender's claim through verified public customer service channels.")
    else:
        recommended_actions.append("Maintain routine vigilance. Never share PINs or OTPs even with trusted contacts.")

    limitations = [
        "Rule-based deterministic analysis: Evaluation is based on heuristic lexical and behavioral patterns.",
        "Absence of detected scam signatures does not guarantee the message is 100% genuine.",
        "Always verify financial requests directly with your institution before transferring funds."
    ]

    return {
        "risk_score": risk_score,
        "risk_classification": classification,
        "confidence": confidence,
        "summary": summary,
        "scam_archetype": archetype,
        "detected_language": detected_language,
        "tactics": tactics,
        "recommended_actions": recommended_actions,
        "limitations": limitations,
    }
