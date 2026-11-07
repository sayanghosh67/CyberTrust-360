import json
import hashlib
import logging
from typing import Dict, Any, Tuple
from urllib.parse import urlparse
import tldextract

logger = logging.getLogger("cybertrust.canonical_hasher")

CANONICAL_VERSION = "ct360-v2"
HASH_ALGORITHM = "sha256"


def _normalize_string(val: Any) -> str:
    if val is None:
        return ""
    return str(val).strip()


def _normalize_list_of_strings(items: Any) -> list[str]:
    if not isinstance(items, list):
        return []
    cleaned = [_normalize_string(x) for x in items if x is not None]
    return sorted(list(set(cleaned)))


def _sort_recursive(obj: Any) -> Any:
    """Recursively sorts dictionary keys to guarantee deterministic canonical structure."""
    if isinstance(obj, dict):
        return {k: _sort_recursive(v) for k, v in sorted(obj.items())}
    elif isinstance(obj, list):
        return [_sort_recursive(item) for item in obj]
    return obj


def canonicalize_to_json(protected_dict: Dict[str, Any]) -> str:
    """
    Serializes a dictionary into deterministic CyberTrust JSON format (NOT RFC 8785 JCS):
    - Recursively sorted keys
    - Minimal separators without whitespace (',', ':')
    - UTF-8 preserved without unnecessary Unicode escapes
    """
    sorted_obj = _sort_recursive(protected_dict)
    return json.dumps(sorted_obj, sort_keys=True, separators=(",", ":"), ensure_ascii=False, allow_nan=False)


def compute_sha256_hex(data_str: str) -> str:
    """Computes standard 0x-prefixed 32-byte SHA-256 hexadecimal digest."""
    digest = hashlib.sha256(data_str.encode("utf-8")).hexdigest()
    return f"0x{digest}"


def compute_report_id_hash(report_id: str) -> str:
    """
    Produces a privacy-preserving 0x-prefixed bytes32 hash of the report identifier.
    Prevents leaking predictable sequential identifiers on-chain.
    """
    clean_id = _normalize_string(report_id)
    return compute_sha256_hex(clean_id)


# ==============================================================================
# Protected Fields Extractors
# ==============================================================================

def _legacy_url(scan_record: Any) -> Dict[str, Any]:
    """
    Extracts the immutable, non-volatile technical payload of a Phase 2 URL investigation.
    Excludes volatile fields such as UI viewing timestamps, transient database IDs, and connection latencies.
    """
    raw_data = {}
    if hasattr(scan_record, "report_data") and scan_record.report_data:
        try:
            raw_data = json.loads(scan_record.report_data) if isinstance(scan_record.report_data, str) else scan_record.report_data
        except Exception as e:
            logger.warning("Operation failed; sensitive details suppressed")

    # Standardize indicators
    threat_intel = []
    for match in raw_data.get("threat_intelligence", {}).get("feed_matches", []):
        feed_name = match.get("feed") or match.get("source") or "unknown"
        threat_intel.append(_normalize_string(feed_name))
    threat_intel = sorted(list(set(threat_intel)))

    findings = []
    for f in raw_data.get("findings", []):
        f_type = f.get("category") or f.get("type") or "finding"
        f_desc = f.get("description") or f.get("detail") or ""
        findings.append(f"{_normalize_string(f_type)}::{_normalize_string(f_desc)}")
    findings = sorted(list(set(findings)))

    security_headers = []
    for h, v in raw_data.get("security_headers", {}).items():
        if isinstance(v, dict) and v.get("present"):
            security_headers.append(_normalize_string(h).lower())
    security_headers = sorted(list(set(security_headers)))

    return {
        "canonical_version": "v1",
        "report_type": "url_scan",
        "target_url": _normalize_string(getattr(scan_record, "url", raw_data.get("url", ""))),
        "registered_domain": _normalize_string(getattr(scan_record, "registered_domain", raw_data.get("registered_domain", ""))),
        "risk_classification": _normalize_string(getattr(scan_record, "risk_classification", raw_data.get("risk_classification", "Inconclusive"))),
        "risk_score": int(getattr(scan_record, "risk_score", raw_data.get("risk_score", 0))),
        "confidence": _normalize_string(getattr(scan_record, "confidence", raw_data.get("confidence", "Medium"))),
        "summary": _normalize_string(getattr(scan_record, "summary", raw_data.get("summary", ""))),
        "findings": findings,
        "threat_intel_matches": threat_intel,
        "security_headers": security_headers,
        "dns_status": _normalize_string(raw_data.get("dns", {}).get("resolution_status", "resolved")),
    }


def _legacy_scam(scam_record: Any) -> Dict[str, Any]:
    """
    Extracts the immutable, non-volatile threat assessment payload of a Phase 3 Scam DNA analysis.
    Excludes sensitive personal transcripts and volatile timestamps.
    """
    raw_data = {}
    if hasattr(scam_record, "report_data") and scam_record.report_data:
        try:
            raw_data = json.loads(scam_record.report_data) if isinstance(scam_record.report_data, str) else scam_record.report_data
        except Exception as e:
            logger.warning("Operation failed; sensitive details suppressed")

    # Standardize tactics
    tactics = []
    for t in raw_data.get("deceptive_tactics", []):
        t_name = t.get("tactic_name") or t.get("name") or ""
        tactics.append(_normalize_string(t_name))
    tactics = sorted(list(set([t for t in tactics if t])))

    impersonated = _normalize_list_of_strings(raw_data.get("impersonated_entities", []))

    # Standardize extracted indicator tuples (type + value)
    indicators = []
    for ind in raw_data.get("extracted_indicators", []):
        itype = _normalize_string(ind.get("type", "")).lower()
        ival = _normalize_string(ind.get("value", "")).lower()
        if itype and ival:
            indicators.append(f"{itype}::{ival}")
    indicators = sorted(list(set(indicators)))

    return {
        "canonical_version": "v1",
        "report_type": "scam_report",
        "scam_archetype": _normalize_string(getattr(scam_record, "scam_archetype", raw_data.get("scam_archetype", "General Analysis"))),
        "risk_classification": _normalize_string(getattr(scam_record, "risk_classification", raw_data.get("risk_classification", "Inconclusive"))),
        "risk_score": int(getattr(scam_record, "risk_score", raw_data.get("risk_score", 0))),
        "confidence": _normalize_string(getattr(scam_record, "confidence", raw_data.get("confidence", "Medium"))),
        "threat_intent": _normalize_string(raw_data.get("scam_intent", "")),
        "urgency_level": _normalize_string(raw_data.get("urgency_level", "Medium")),
        "deceptive_tactics": tactics,
        "impersonated_entities": impersonated,
        "extracted_indicators": indicators,
        "summary": _normalize_string(getattr(scam_record, "summary", raw_data.get("summary", ""))),
    }


def _full_report(record: Any, report_type: str) -> Dict[str, Any]:
    raw = getattr(record, "report_data", None)
    data = json.loads(raw) if isinstance(raw, str) else raw
    if not isinstance(data, dict):
        raise ValueError("A valid saved report payload is required")
    fields = ("url", "registered_domain", "risk_classification", "risk_score", "confidence", "summary") if report_type == "url_scan" else ("scam_archetype", "risk_classification", "risk_score", "confidence", "summary", "message_preview")
    return {"canonical_version": CANONICAL_VERSION, "report_type": report_type,
            "report_id": str(record.id), "report_data": data,
            "stored_fields": {name: getattr(record, name, None) for name in fields}}


def extract_url_scan_protected_fields(record):
    return _full_report(record, "url_scan")


def extract_scam_report_protected_fields(record):
    return _full_report(record, "scam_report")


def generate_report_fingerprint(report_record: Any, report_type: str, canonical_version=CANONICAL_VERSION) -> Tuple[str, str, str]:
    if not getattr(report_record, "id", None):
        raise ValueError("Report record must possess a non-empty id")
    if report_type not in {"url_scan", "scam_report"}:
        raise ValueError("Unsupported report type")
    if canonical_version == "v1":
        protected = (_legacy_url if report_type == "url_scan" else _legacy_scam)(report_record)
    elif canonical_version == CANONICAL_VERSION:
        protected = _full_report(report_record, report_type)
    else:
        raise ValueError("Unsupported fingerprint version")
    canonical = canonicalize_to_json(protected)
    return canonical, compute_report_id_hash(str(report_record.id)), compute_sha256_hex(canonical)
