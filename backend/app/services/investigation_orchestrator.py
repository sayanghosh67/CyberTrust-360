from fastapi import HTTPException
import asyncio
import uuid
import json
from datetime import datetime, timezone
from typing import List
from sqlalchemy.orm import Session

from backend.app.utils.security import normalize_and_validate_target, SecurityValidationError
from backend.app.schemas.scan import (
    ScanResponse,
    URLAnalysis,
    DNSAnalysis,
    SSLAnalysis,
    HeadersAnalysis,
    ThreatIntelSource,
)
from backend.app.services.url_analyzer import analyze_url
from backend.app.services.dns_checker import resolve_dns
from backend.app.services.ssl_checker import inspect_ssl
from backend.app.services.headers_checker import inspect_headers
from backend.app.services.threat_intel import check_threat_intelligence
from backend.app.services.risk_engine import evaluate_risk
from backend.app.models.scan import ScanRecord


async def conduct_investigation(raw_url: str, db: Session) -> ScanResponse:
    """
    Orchestrates the entire multi-vector threat investigation pipeline safely and concurrently.
    Guarantees non-blocking execution, error boundary isolation, and persistent record storage.
    """
    # 1. Input Sanitization & SSRF Protection
    validated = await asyncio.wait_for(asyncio.to_thread(normalize_and_validate_target, raw_url), timeout=5.0)
    hostname = validated["hostname"]
    canonical_url = validated["canonical_url"]
    registered_domain = validated["registered_domain"]

    failed_checks: List[str] = []

    # 2. Run URL Analysis (Synchronous/pure computation)
    url_data = analyze_url(canonical_url)

    # 3. Concurrent Multi-Vector Execution with Error Boundaries
    dns_task = resolve_dns(hostname)
    ssl_task = inspect_ssl(hostname, port=validated["port"])
    headers_task = inspect_headers(canonical_url, initial_hostname=hostname)
    intel_task = check_threat_intelligence(canonical_url)

    dns_res, ssl_res, headers_res, intel_res = await asyncio.gather(
        dns_task, ssl_task, headers_task, intel_task, return_exceptions=True
    )

    # Handle DNS result
    if isinstance(dns_res, Exception):
        failed_checks.append(f"DNS Resolution: {type(dns_res).__name__}")
        dns_data = DNSAnalysis(status="unavailable", error_message=type(dns_res).__name__)
    else:
        dns_data = dns_res

    # Handle SSL result
    if isinstance(ssl_res, Exception):
        failed_checks.append(f"SSL/TLS Inspection: {type(ssl_res).__name__}")
        ssl_data = SSLAnalysis(https_available=False, valid=False, error_message=type(ssl_res).__name__)
    else:
        ssl_data = ssl_res

    # Handle Headers result
    if isinstance(headers_res, Exception):
        failed_checks.append(f"HTTP Headers Inspection: {type(headers_res).__name__}")
        headers_data = HeadersAnalysis(error_message=type(headers_res).__name__)
    else:
        headers_data = headers_res

    # Handle Threat Intelligence result
    if isinstance(intel_res, Exception):
        failed_checks.append(f"Threat Intelligence: {type(intel_res).__name__}")
        threat_intel = [
            ThreatIntelSource(
                provider="Threat Aggregator",
                status="unavailable",
                details=f"Service unavailable: {type(intel_res).__name__}",
            )
        ]
    else:
        threat_intel = intel_res

    # 4. Evaluate Comprehensive Risk Posture
    classification, score, confidence, summary, indicators, recommendations = evaluate_risk(
        url_data=url_data,
        dns_data=dns_data,
        ssl_data=ssl_data,
        headers_data=headers_data,
        threat_intel=threat_intel,
        failed_checks=failed_checks,
    )

    scan_id = str(uuid.uuid4())
    now_str = datetime.now(timezone.utc).isoformat()
    ip_addr = dns_data.a_records[0] if dns_data.a_records else None

    # Construct Response Object
    response = ScanResponse(
        id=scan_id,
        url=canonical_url,
        hostname=hostname,
        registered_domain=registered_domain,
        created_at=now_str,
        risk_classification=classification,
        risk_score=score,
        confidence=confidence,
        summary=summary,
        recommended_actions=recommendations,
        url_analysis=url_data,
        dns_analysis=dns_data,
        ssl_analysis=ssl_data,
        headers_analysis=headers_data,
        threat_intel=threat_intel,
        indicators=indicators,
        failed_checks=failed_checks,
    )

    # 5. Persist to Database via SQLAlchemy
    try:
        record = ScanRecord(
            id=scan_id,
            url=canonical_url,
            hostname=hostname,
            registered_domain=registered_domain,
            ip_address=ip_addr,
            risk_classification=classification,
            risk_score=score,
            confidence=confidence,
            summary=summary,
            report_data=response.model_dump_json(),
        )
        db.add(record)
        db.commit()
    except Exception as db_err:
        db.rollback()
        raise HTTPException(status_code=503, detail="Investigation could not be saved; please retry") from None

    return response
