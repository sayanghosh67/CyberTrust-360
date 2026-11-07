import re
from typing import List, Set
from urllib.parse import urlparse
import tldextract
from backend.app.schemas.scam import ExtractedIndicator

# Regular Expressions for Forensic Entity Extraction
URL_REGEX = re.compile(
    r'(?:https?://[^\s<>"\',;]+|(?:www\.)[^\s<>"\',;]+|[a-zA-Z0-9.-]+\.(?:com|org|net|in|co\.in|xyz|top|live|club|online|site|link|info|biz|tech|apk|me|vip|work|cc|io|app)/[^\s<>"\',;]*)',
    re.IGNORECASE
)

EMAIL_REGEX = re.compile(
    r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+',
    re.IGNORECASE
)

# Indian Phone numbers & International numbers
PHONE_REGEX = re.compile(
    r'(?:\+?91[\s.-]?)?[6-9]\d{4}[\s.-]?\d{5}|(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}|\b1800[\s.-]?\d{3}[\s.-]?\d{3,4}\b',
    re.IGNORECASE
)

# UPI Virtual Payment Address (VPA) handles
# e.g., name@okhdfcbank, user@paytm, reward@ybl, refund@sbi, handle@upi
UPI_REGEX = re.compile(
    r'\b[a-zA-Z0-9_.-]{2,50}@(okhdfcbank|okaxis|okicici|oksbi|paytm|ybl|ibl|axl|sbi|hdfcbank|icici|axisbank|upi|postbank|kotak|barodampay|federal|aubank|airtel|freecharge)\b',
    re.IGNORECASE
)

# Currency and payment mentions
CURRENCY_REGEX = re.compile(
    r'(?:₹|Rs\.?|INR|\$|USD)\s*[\d,]+(?:\.\d{1,2})?|\b[\d,]+\s*(?:rupees|lakh|crore|rs)\b',
    re.IGNORECASE
)

# Targeted Brands & Entities
KNOWN_BRANDS = [
    # Indian Banks & Financial Institutions
    "State Bank of India", "SBI", "YONO", "HDFC Bank", "HDFC", "ICICI Bank", "ICICI",
    "Punjab National Bank", "PNB", "Axis Bank", "Axis", "Kotak Mahindra", "Kotak",
    "Bank of Baroda", "BOB", "Canara Bank", "Union Bank", "IndusInd Bank", "Yes Bank",
    # Payments & Wallets
    "PhonePe", "Google Pay", "GPay", "Paytm", "BHIM UPI", "BHIM", "CRED", "MobiKwik",
    # Logistics & Postal
    "India Post", "Postal Department", "BlueDart", "DTDC", "Delhivery", "FedEx", "DHL",
    # Utilities & Government Bodies
    "BESCOM", "Mahavitaran", "MSEDCL", "TNEB", "UPPCL", "Electricity Board", "Income Tax Department",
    "e-Challan", "Traffic Police", "TRAI", "DoT", "CBI", "Cyber Crime Cell", "Reserve Bank of India", "RBI",
    # Tech & E-Commerce
    "Amazon", "Flipkart", "Meesho", "Telegram", "WhatsApp", "YouTube", "Netflix", "Facebook", "Instagram",
    # Remote screen-sharing tools commonly abused
    "AnyDesk", "TeamViewer", "RustDesk", "QuickSupport", "AirDroid",
]


def extract_entities(text: str) -> List[ExtractedIndicator]:
    """
    Extracts structured forensic entities (URLs, emails, phones, UPI VPAs, currency, brands)
    from untrusted message text.
    """
    indicators: List[ExtractedIndicator] = []
    seen: Set[str] = set()

    # 1. Extract URLs and Domains
    url_matches = URL_REGEX.findall(text)
    for raw_url in url_matches:
        clean_url = raw_url.rstrip(".,;:!?)'\"")
        if clean_url and clean_url not in seen:
            seen.add(clean_url)
            # Find snippet
            start_idx = max(0, text.find(clean_url) - 20)
            end_idx = min(len(text), text.find(clean_url) + len(clean_url) + 20)
            snippet = text[start_idx:end_idx].strip()

            indicators.append(
                ExtractedIndicator(
                    type="url",
                    value=clean_url,
                    context_snippet=f"...{snippet}..." if snippet != clean_url else clean_url,
                )
            )

    # 2. Extract UPI IDs
    upi_matches = UPI_REGEX.finditer(text)
    for m in upi_matches:
        vpa = m.group(0)
        if vpa not in seen:
            seen.add(vpa)
            indicators.append(
                ExtractedIndicator(
                    type="upi_id",
                    value=vpa,
                    context_snippet=m.group(0),
                )
            )

    # 3. Extract Phone Numbers
    phone_matches = PHONE_REGEX.findall(text)
    for p in phone_matches:
        clean_p = re.sub(r'[\s.-]', '', p)
        # Avoid treating 10-digit account numbers or simple numbers as phone unless matching format
        if len(clean_p) >= 10 and clean_p not in seen:
            seen.add(clean_p)
            indicators.append(
                ExtractedIndicator(
                    type="phone",
                    value=p.strip(),
                    context_snippet=p.strip(),
                )
            )

    # 4. Extract Emails
    email_matches = EMAIL_REGEX.findall(text)
    for email in email_matches:
        if email not in seen:
            seen.add(email)
            indicators.append(
                ExtractedIndicator(
                    type="email",
                    value=email,
                    context_snippet=email,
                )
            )

    # 5. Extract Currency Mentions
    currency_matches = CURRENCY_REGEX.findall(text)
    for amt in currency_matches:
        clean_amt = amt.strip()
        if clean_amt not in seen:
            seen.add(clean_amt)
            indicators.append(
                ExtractedIndicator(
                    type="currency_amount",
                    value=clean_amt,
                    context_snippet=clean_amt,
                )
            )

    # 6. Extract Brands & Impersonated Entities
    text_lower = text.lower()
    for brand in KNOWN_BRANDS:
        pattern = r'\b' + re.escape(brand.lower()) + r'\b'
        if re.search(pattern, text_lower) and brand not in seen:
            seen.add(brand)
            b_type = "suspicious_app" if brand in ["AnyDesk", "TeamViewer", "RustDesk", "QuickSupport"] else "brand"
            indicators.append(
                ExtractedIndicator(
                    type=b_type,
                    value=brand,
                    context_snippet=f"Referenced Brand / Service: {brand}",
                )
            )

    return indicators

