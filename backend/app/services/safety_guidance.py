from typing import Dict, Any
from backend.app.schemas.scam import SafetyGuidanceResponse

REPORTING_CHANNELS = [
    {
        "name": "National Cyber Crime Reporting Portal (India)",
        "contact": "Toll-Free Helpline: 1930",
        "url": "https://cybercrime.gov.in",
        "description": "Crucial for financial fraud. Immediate reporting via 1930 alerts authorities and partner banks to attempt freezing suspect beneficiary accounts; early reporting is vital, though fund recovery cannot be guaranteed.",
    },
    {
        "name": "Sanchar Saathi (Chakshu Portal - DoT)",
        "contact": "Report Fraud Communication",
        "url": "https://sancharsaathi.gov.in",
        "description": "Report suspected fraudulent SMS, calls, or WhatsApp messages for telecom number deactivation.",
    },
    {
        "name": "Your Bank / Payment App Fraud Cell",
        "contact": "In-App 24/7 Helpline",
        "url": "",
        "description": "Call the verified official number printed on the back of your debit/credit card or within the genuine banking app.",
    },
    {
        "name": "National Consumer Helpline",
        "contact": "1915",
        "url": "https://consumerhelpline.gov.in",
        "description": "For e-commerce delivery and fake merchant refund disputes.",
    },
]


def generate_safety_guidance(action_taken: str, scam_type: str = "") -> SafetyGuidanceResponse:
    """
    Generates situation-specific incident response guidance based on what action the victim took.
    Never requests sensitive credentials, passwords, OTPs, or private keys.
    """
    if action_taken == "made_upi_payment":
        return SafetyGuidanceResponse(
            action_taken=action_taken,
            action_title="I made a UPI payment / Transferred Money",
            severity_level="critical",
            urgent_warning=(
                "ACT IMMEDIATELY (GOLDEN HOUR): Dial 1930 as soon as possible. Rapid reporting gives authorities and banks "
                "the best window to attempt placing a hold or lien on suspect beneficiary accounts, though fund recovery cannot be guaranteed once money is withdrawn or moved across accounts."
            ),
            immediate_steps=[
                "Dial 1930 immediately to report the transaction ID, UPI reference number (UTR), and recipient UPI handle to the National Cyber Financial Fraud helpline (early reporting is critical, though full recovery depends on whether funds remain unwithdrawn).",
                "Call your bank's fraud reporting helpline immediately (printed on the back of your debit card) and request a transaction dispute and lien on the beneficiary account.",
                "Take screenshots of the payment confirmation screen, recipient UPI ID/account number, and the conversation thread as forensic evidence.",
                "Register an official complaint on the National Cyber Crime Reporting Portal (https://cybercrime.gov.in) under 'Financial Fraud'.",
                "Visit your local cyber police station to file an FIR with your complaint acknowledgement number if loss exceeds local thresholds.",
            ],
            reporting_channels=REPORTING_CHANNELS,
            preventative_measures=[
                "Remember: Entering your UPI PIN ALWAYS debits money from your account. You NEVER need to enter a UPI PIN to receive money.",
                "Block the fraudster's number on WhatsApp and Truecaller.",
                "Never send a test amount of ₹1 or ₹5 to unlock refunds.",
            ],
        )

    elif action_taken == "shared_otp":
        return SafetyGuidanceResponse(
            action_taken=action_taken,
            action_title="I shared an OTP (One-Time Password)",
            severity_level="critical",
            urgent_warning=(
                "IMMEDIATE ACTION REQUIRED: The threat actor may be attempting an unauthorized fund transfer, SIM swap, "
                "or netbanking login using your shared OTP right now."
            ),
            immediate_steps=[
                "Immediately call your bank customer care or use your banking app to FREEZE your debit card, credit card, and netbanking access.",
                "If your mobile network signal disappears suddenly, immediately contact your telecom operator from another phone—it may be an active SIM-swap attack.",
                "Immediately change your netbanking login password and transaction password from a secure device.",
                "Check your bank account statement online for any unauthorized debits. If funds were transferred, dial 1930 immediately to request an urgent freeze attempt (recovery cannot be guaranteed).",
                "Report the incident on https://cybercrime.gov.in.",
            ],
            reporting_channels=REPORTING_CHANNELS,
            preventative_measures=[
                "No bank, payment gateway, police, or electricity board will EVER ask for your OTP.",
                "Set transaction limits on your debit/credit cards and UPI apps to limit potential exposure.",
            ],
        )

    elif action_taken == "entered_password":
        return SafetyGuidanceResponse(
            action_taken=action_taken,
            action_title="I entered my Password or Netbanking PIN",
            severity_level="high",
            urgent_warning="Your account credentials have been exposed to an untrusted portal. Change your passwords immediately.",
            immediate_steps=[
                "From a different, clean device or browser, IMMEDIATELY log in to the genuine service and change your password.",
                "Enable Two-Factor Authentication (2FA) / Multi-Factor Authentication using an authenticator app (Google/Microsoft Authenticator) rather than SMS where possible.",
                "If you reused this password on any other email, banking, or social media accounts, change those passwords immediately.",
                "In your account security settings, select 'Log out of all devices / sessions' to invalidate any unauthorized active sessions.",
                "Review recent login activity and alert your bank's IT security if netbanking was compromised.",
            ],
            reporting_channels=REPORTING_CHANNELS,
            preventative_measures=[
                "Never enter passwords on links received via SMS, WhatsApp, or unsolicited emails.",
                "Use a password manager to generate unique, complex passwords for every platform.",
            ],
        )

    elif action_taken == "clicked_link":
        return SafetyGuidanceResponse(
            action_taken=action_taken,
            action_title="I clicked the link (but did not enter passwords or pay)",
            severity_level="medium",
            urgent_warning="Close the web page immediately. Do not install any downloaded files (.apk, .exe, .dmg).",
            immediate_steps=[
                "Close the browser tab immediately and clear your browser cache and cookies for the last 24 hours.",
                "Check your browser downloads folder: if any file (especially an '.apk' or installer) was downloaded, DO NOT OPEN IT. Delete it immediately.",
                "If on an Android device, verify in Settings > Apps that no unknown app (or AnyDesk/TeamViewer/RustDesk) was sideloaded.",
                "Run a malware scan using a trusted mobile/desktop antivirus (e.g. Google Play Protect, Malwarebytes).",
                "Paste the clicked URL into the CyberTrust 360 URL Forensic Scanner on this platform to analyze its infrastructure and threat indicators.",
            ],
            reporting_channels=[REPORTING_CHANNELS[1]],
            preventative_measures=[
                "Always inspect the domain name in the address bar before interacting with any web page.",
                "Keep your mobile operating system and browser updated to the latest security patch.",
            ],
        )

    else:  # received_only
        return SafetyGuidanceResponse(
            action_taken="received_only",
            action_title="I only received the message (took no action)",
            severity_level="low",
            urgent_warning=None,
            immediate_steps=[
                "You are safe! Because you did not click links, share OTPs, or transfer money, no compromise has occurred.",
                "Report the message as spam/phishing within WhatsApp or your SMS messaging app.",
                "Report the sender number on the Department of Telecommunications' Chakshu portal (https://sancharsaathi.gov.in) to help authorities block the fraudster.",
                "Block and delete the sender number.",
            ],
            reporting_channels=[REPORTING_CHANNELS[1]],
            preventative_measures=[
                "Share this warning with friends, family, and colleagues who may receive similar messages.",
                "Remember: Banks will never threaten account deactivation via SMS with urgent external links.",
            ],
        )

