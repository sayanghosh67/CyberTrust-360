import re
import json
import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional, Set, Tuple
from urllib.parse import urlparse
import tldextract

from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.models.scan import ScanRecord
from backend.app.models.scam import ScamAnalysisRecord
from backend.app.schemas.intelligence import (
    GraphNode,
    GraphEdge,
    GraphResponse,
    RecurringIndicatorSummary,
    IndicatorsResponse,
    ReportRelationshipsResponse,
    ConnectedReportSummary,
    NodeType,
    RelationshipCategory,
)

logger = logging.getLogger("cybertrust.relationship_engine")

STANDARD_LIMITATION = (
    "A shared technical indicator or tactic indicates common infrastructure or shared link reuse, "
    "but does not prove common ownership, attacker identity, or coordinated criminal campaigns without authoritative external attribution."
)


# ==============================================================================
# Normalization Utilities
# ==============================================================================

def normalize_url(raw_url: str) -> str:
    """Standardizes URLs (strip whitespace, lowercase scheme and host, remove trailing slashes)."""
    if not raw_url:
        return ""
    clean = raw_url.strip()
    clean_lower = clean.lower()
    if not clean_lower.startswith(("http://", "https://")):
        clean = "https://" + clean
    try:
        parsed = urlparse(clean)
        scheme = parsed.scheme.lower()
        netloc = parsed.netloc.lower()
        if (scheme == "http" and netloc.endswith(":80")) or (scheme == "https" and netloc.endswith(":443")):
            netloc = netloc.rsplit(":", 1)[0]
        path = parsed.path.rstrip("/") if parsed.path != "/" else "/"
        query = f"?{parsed.query}" if parsed.query else ""
        return f"{scheme}://{netloc}{path}{query}"
    except Exception:
        return clean.lower().rstrip("/")


def normalize_domain(domain_or_url: str) -> str:
    """Extracts lowercase registered domain or hostname without www."""
    if not domain_or_url:
        return ""
    target = domain_or_url.strip().lower()
    if "://" in target:
        try:
            target = urlparse(target).hostname or target
        except Exception:
            pass
    if target.startswith("www."):
        target = target[4:]
    ext = tldextract.extract(target)
    if ext.domain and ext.suffix:
        return f"{ext.domain}.{ext.suffix}"
    return target


def normalize_phone(raw_phone: str) -> str:
    """Normalizes Indian and international phone numbers to standard representation."""
    if not raw_phone:
        return ""
    digits = re.sub(r"[^\d+]", "", raw_phone.strip())
    # Standardize Indian 10-digit mobile
    pure_digits = re.sub(r"\D", "", digits)
    if len(pure_digits) == 10 and pure_digits[0] in "6789":
        return f"+91-{pure_digits}"
    if len(pure_digits) == 12 and pure_digits.startswith("91") and pure_digits[2] in "6789":
        return f"+91-{pure_digits[2:]}"
    return digits


def normalize_upi(raw_upi: str) -> str:
    """Lowercases and cleans UPI virtual payment address."""
    return raw_upi.strip().lower() if raw_upi else ""


def normalize_brand(raw_brand: str) -> str:
    """Standardizes well-known brand names."""
    if not raw_brand:
        return ""
    b = raw_brand.strip()
    known = {
        "sbi": "SBI",
        "state bank of india": "SBI",
        "yono": "YONO",
        "hdfc": "HDFC Bank",
        "hdfc bank": "HDFC Bank",
        "icici": "ICICI Bank",
        "icici bank": "ICICI Bank",
        "phonepe": "PhonePe",
        "paytm": "Paytm",
        "google pay": "Google Pay",
        "gpay": "Google Pay",
        "india post": "India Post",
        "post office": "India Post",
        "paypal": "PayPal",
        "amazon": "Amazon",
        "netflix": "Netflix",
        "microsoft": "Microsoft",
        "telegram": "Telegram",
        "whatsapp": "WhatsApp",
    }
    return known.get(b.lower(), b.title())


# ==============================================================================
# Graph Builder from Database Records
# ==============================================================================

def build_threat_graph(
    db: Session,
    filter_type: Optional[str] = None,
    search_query: Optional[str] = None,
    limit: int = 100,
    include_demo: bool = False,
) -> GraphResponse:
    """
    Constructs an interactive threat relationship graph by evaluating live database records.
    Distinguishes VERIFIED_SHARED_INDICATOR from POSSIBLE_RELATIONSHIP.
    """
    nodes_map: Dict[str, GraphNode] = {}
    edges_map: Dict[str, GraphEdge] = {}

    # 1. Fetch live records from database
    url_scans = db.execute(
        select(ScanRecord).order_by(ScanRecord.created_at.desc()).limit(limit // 2)
    ).scalars().all()

    scam_reports = db.execute(
        select(ScamAnalysisRecord).order_by(ScamAnalysisRecord.created_at.desc()).limit(limit // 2)
    ).scalars().all()

    total_reports = len(url_scans) + len(scam_reports)

    # 2. If database is completely empty and demo not explicitly requested, or if demo is requested
    is_demo = False
    if total_reports == 0 or include_demo:
        is_demo = True
        _inject_synthetic_demo_data(nodes_map, edges_map)

    # 3. Process Live URL Scans
    for scan in url_scans:
        scan_node_id = f"url_scan:{scan.id}"
        norm_url = normalize_url(scan.url)
        norm_domain = normalize_domain(scan.registered_domain or scan.hostname)

        # Scan Report Node
        nodes_map[scan_node_id] = GraphNode(
            id=scan_node_id,
            type="url_scan",
            label=scan.hostname or norm_domain,
            sublabel=f"URL Scan · Score {scan.risk_score}/100",
            risk_classification=scan.risk_classification,  # type: ignore
            risk_score=scan.risk_score,
            properties={
                "url": scan.url,
                "hostname": scan.hostname,
                "registered_domain": scan.registered_domain,
                "ip_address": scan.ip_address,
                "created_at": scan.created_at.isoformat(),
                "summary": scan.summary,
            },
        )

        # Domain Node
        if norm_domain:
            domain_node_id = f"domain:{norm_domain}"
            if domain_node_id not in nodes_map:
                nodes_map[domain_node_id] = GraphNode(
                    id=domain_node_id,
                    type="domain",
                    label=norm_domain,
                    sublabel="Registered Domain",
                    indicator_type="domain",
                    report_count=1,
                    properties={"domain": norm_domain},
                )
            else:
                nodes_map[domain_node_id].report_count += 1

            # Edge: Scan -> Domain (Verified Technical Indicator)
            edge_id = f"edge_{scan.id}_domain_{norm_domain}"
            edges_map[edge_id] = GraphEdge(
                id=edge_id,
                source=scan_node_id,
                target=domain_node_id,
                label="Target Domain",
                relationship_type="RESOLVES_TO_DOMAIN",
                category="VERIFIED_SHARED_INDICATOR",
                evidence=f"Investigation target explicitly resolved to domain '{norm_domain}'.",
                source_report_ids=[scan.id],
                confidence="High",
                weight=1.0,
                limitations=STANDARD_LIMITATION,
            )

        # Exact URL Node (if path / query differs from bare domain)
        if norm_url and norm_url != f"https://{norm_domain}/":
            url_node_id = f"url:{norm_url}"
            if url_node_id not in nodes_map:
                nodes_map[url_node_id] = GraphNode(
                    id=url_node_id,
                    type="url",
                    label=norm_url if len(norm_url) <= 35 else norm_url[:32] + "...",
                    sublabel="Exact URL",
                    indicator_type="url",
                    properties={"full_url": norm_url},
                )
            edge_url_id = f"edge_{scan.id}_url_{hash(norm_url)}"
            edges_map[edge_url_id] = GraphEdge(
                id=edge_url_id,
                source=scan_node_id,
                target=url_node_id,
                label="Evaluated URL",
                relationship_type="EXACT_URL",
                category="VERIFIED_SHARED_INDICATOR",
                evidence=f"Full URL target: {norm_url}",
                source_report_ids=[scan.id],
                confidence="High",
                weight=1.0,
                limitations=STANDARD_LIMITATION,
            )

        # Inspect report_data for typosquatting brands
        try:
            report_dict = json.loads(scan.report_data) if scan.report_data else {}
            typosquats = report_dict.get("url_analysis", {}).get("typosquatting_matches", [])
            for ts in typosquats:
                brand_name = normalize_brand(ts.get("brand", ""))
                if brand_name:
                    brand_id = f"brand:{brand_name}"
                    if brand_id not in nodes_map:
                        nodes_map[brand_id] = GraphNode(
                            id=brand_id,
                            type="brand",
                            label=brand_name,
                            sublabel="Targeted Entity",
                            indicator_type="brand",
                            properties={"brand": brand_name},
                        )
                    edge_brand_id = f"edge_{scan.id}_brand_{brand_name}"
                    edges_map[edge_brand_id] = GraphEdge(
                        id=edge_brand_id,
                        source=scan_node_id,
                        target=brand_id,
                        label="Typosquats Brand",
                        relationship_type="TYPOSQUAT_TARGET",
                        category="POSSIBLE_RELATIONSHIP",
                        evidence=f"Domain similarity heuristic indicates lookalike of brand '{brand_name}' ({ts.get('reason', '')}).",
                        source_report_ids=[scan.id],
                        confidence="Medium",
                        weight=0.7,
                        limitations=STANDARD_LIMITATION,
                    )
        except Exception as e:
            logger.debug(f"Error parsing scan report_data: {e}")

    # 4. Process Live Scam Reports
    for scam in scam_reports:
        scam_node_id = f"scam_report:{scam.id}"

        # Scam Report Node
        nodes_map[scam_node_id] = GraphNode(
            id=scam_node_id,
            type="scam_report",
            label=scam.scam_archetype,
            sublabel=f"Threat Score {scam.risk_score}/100",
            risk_classification=scam.risk_classification,  # type: ignore
            risk_score=scam.risk_score,
            properties={
                "preview": scam.message_preview,
                "scam_archetype": scam.scam_archetype,
                "analysis_source": scam.analysis_source,
                "created_at": scam.created_at.isoformat(),
                "summary": scam.summary,
            },
        )

        try:
            data = json.loads(scam.report_data) if scam.report_data else {}

            # Process Extracted Indicators
            for indicator in data.get("extracted_indicators", []):
                itype = indicator.get("type", "")
                ivalue = indicator.get("value", "").strip()

                if itype == "url" and ivalue:
                    norm_u = normalize_url(ivalue)
                    norm_d = normalize_domain(norm_u)

                    # Exact URL Node
                    url_id = f"url:{norm_u}"
                    if url_id not in nodes_map:
                        nodes_map[url_id] = GraphNode(
                            id=url_id,
                            type="url",
                            label=norm_u if len(norm_u) <= 35 else norm_u[:32] + "...",
                            sublabel="Embedded Link",
                            indicator_type="url",
                            properties={"full_url": norm_u},
                        )
                    edge_scam_u = f"edge_{scam.id}_url_{hash(norm_u)}"
                    edges_map[edge_scam_u] = GraphEdge(
                        id=edge_scam_u,
                        source=scam_node_id,
                        target=url_id,
                        label="Contains Link",
                        relationship_type="EXTRACTED_URL",
                        category="VERIFIED_SHARED_INDICATOR",
                        evidence=f"Deceptive message contains embedded link: '{norm_u}'.",
                        source_report_ids=[scam.id],
                        confidence="High",
                        weight=1.0,
                        limitations=STANDARD_LIMITATION,
                    )

                    # Domain Node & Direct Link
                    if norm_d:
                        d_id = f"domain:{norm_d}"
                        if d_id not in nodes_map:
                            nodes_map[d_id] = GraphNode(
                                id=d_id,
                                type="domain",
                                label=norm_d,
                                sublabel="Extracted Domain",
                                indicator_type="domain",
                                report_count=1,
                                properties={"domain": norm_d},
                            )
                        else:
                            nodes_map[d_id].report_count += 1

                        # Direct edge from Scam Report to Domain
                        edge_scam_d = f"edge_{scam.id}_domain_{norm_d}"
                        edges_map[edge_scam_d] = GraphEdge(
                            id=edge_scam_d,
                            source=scam_node_id,
                            target=d_id,
                            label="Referenced Domain",
                            relationship_type="EXTRACTED_DOMAIN",
                            category="VERIFIED_SHARED_INDICATOR",
                            evidence=f"Deceptive message links to infrastructure on domain '{norm_d}'.",
                            source_report_ids=[scam.id],
                            confidence="High",
                            weight=1.0,
                            limitations=STANDARD_LIMITATION,
                        )

                        # URL to Domain Edge
                        edge_u_d = f"edge_url_{hash(norm_u)}_domain_{norm_d}"
                        if edge_u_d not in edges_map:
                            edges_map[edge_u_d] = GraphEdge(
                                id=edge_u_d,
                                source=url_id,
                                target=d_id,
                                label="Hosted On",
                                relationship_type="HOSTED_ON_DOMAIN",
                                category="VERIFIED_SHARED_INDICATOR",
                                evidence=f"URL resolves to registered domain '{norm_d}'.",
                                source_report_ids=[scam.id],
                                confidence="High",
                                weight=1.0,
                                limitations=STANDARD_LIMITATION,
                            )
                        elif scam.id not in edges_map[edge_u_d].source_report_ids:
                            edges_map[edge_u_d].source_report_ids.append(scam.id)

                elif itype == "phone" and ivalue:
                    norm_p = normalize_phone(ivalue)
                    phone_id = f"indicator:phone:{norm_p}"
                    if phone_id not in nodes_map:
                        nodes_map[phone_id] = GraphNode(
                            id=phone_id,
                            type="indicator",
                            label=norm_p,
                            sublabel="Phone Contact",
                            indicator_type="phone",
                            report_count=1,
                            properties={"phone": norm_p},
                        )
                    else:
                        nodes_map[phone_id].report_count += 1

                    edge_p = f"edge_{scam.id}_phone_{norm_p}"
                    edges_map[edge_p] = GraphEdge(
                        id=edge_p,
                        source=scam_node_id,
                        target=phone_id,
                        label="Contact Number",
                        relationship_type="EXTRACTED_PHONE",
                        category="VERIFIED_SHARED_INDICATOR",
                        evidence=f"Message provides contact telephone number: {norm_p}.",
                        source_report_ids=[scam.id],
                        confidence="High",
                        weight=1.0,
                        limitations=STANDARD_LIMITATION,
                    )

                elif itype == "upi_id" and ivalue:
                    norm_upi_v = normalize_upi(ivalue)
                    upi_id = f"indicator:upi:{norm_upi_v}"
                    if upi_id not in nodes_map:
                        nodes_map[upi_id] = GraphNode(
                            id=upi_id,
                            type="indicator",
                            label=norm_upi_v,
                            sublabel="UPI Payment Handle",
                            indicator_type="upi_id",
                            report_count=1,
                            properties={"upi": norm_upi_v},
                        )
                    else:
                        nodes_map[upi_id].report_count += 1

                    edge_upi = f"edge_{scam.id}_upi_{norm_upi_v}"
                    edges_map[edge_upi] = GraphEdge(
                        id=edge_upi,
                        source=scam_node_id,
                        target=upi_id,
                        label="Payment Handle",
                        relationship_type="EXTRACTED_UPI",
                        category="VERIFIED_SHARED_INDICATOR",
                        evidence=f"Fraudulent request solicits transfer to UPI VPA: {norm_upi_v}.",
                        source_report_ids=[scam.id],
                        confidence="High",
                        weight=1.0,
                        limitations=STANDARD_LIMITATION,
                    )

                elif itype == "brand" and ivalue:
                    norm_b = normalize_brand(ivalue)
                    brand_id = f"brand:{norm_b}"
                    if brand_id not in nodes_map:
                        nodes_map[brand_id] = GraphNode(
                            id=brand_id,
                            type="brand",
                            label=norm_b,
                            sublabel="Impersonated Entity",
                            indicator_type="brand",
                            report_count=1,
                            properties={"brand": norm_b},
                        )
                    else:
                        nodes_map[brand_id].report_count += 1

                    edge_b = f"edge_{scam.id}_brand_{norm_b}"
                    edges_map[edge_b] = GraphEdge(
                        id=edge_b,
                        source=scam_node_id,
                        target=brand_id,
                        label="Impersonates",
                        relationship_type="IMPERSONATES_BRAND",
                        category="POSSIBLE_RELATIONSHIP",
                        evidence=f"Message cites or mimics legitimate brand '{norm_b}'.",
                        source_report_ids=[scam.id],
                        confidence="Medium",
                        weight=0.7,
                        limitations=STANDARD_LIMITATION,
                    )

            # Process Scam Tactics
            for tactic in data.get("tactics", []):
                t_name = tactic.get("name", "")
                if t_name:
                    tactic_id = f"tactic:{t_name}"
                    if tactic_id not in nodes_map:
                        nodes_map[tactic_id] = GraphNode(
                            id=tactic_id,
                            type="tactic",
                            label=t_name,
                            sublabel="Deceptive Tactic",
                            severity=tactic.get("severity", "medium"),
                            report_count=1,
                            properties={
                                "category": tactic.get("category", ""),
                                "severity": tactic.get("severity", "medium"),
                            },
                        )
                    else:
                        nodes_map[tactic_id].report_count += 1

                    edge_t = f"edge_{scam.id}_tactic_{hash(t_name)}"
                    edges_map[edge_t] = GraphEdge(
                        id=edge_t,
                        source=scam_node_id,
                        target=tactic_id,
                        label="Uses Playbook",
                        relationship_type="USES_TACTIC",
                        category="POSSIBLE_RELATIONSHIP",
                        evidence=f"Deception pattern match: {t_name}. Evidence: '{tactic.get('evidence', '')}'.",
                        source_report_ids=[scam.id],
                        confidence="Medium",
                        weight=0.5,
                        limitations=STANDARD_LIMITATION,
                    )

        except Exception as e:
            logger.debug(f"Error parsing scam report_data: {e}")

    # 5. Apply Optional Filtering
    filtered_nodes = list(nodes_map.values())
    filtered_edges = list(edges_map.values())

    if filter_type == "verified_only":
        verified_edges = [e for e in filtered_edges if e.category == "VERIFIED_SHARED_INDICATOR"]
        connected_node_ids = {e.source for e in verified_edges} | {e.target for e in verified_edges}
        filtered_nodes = [n for n in filtered_nodes if n.id in connected_node_ids]
        filtered_edges = verified_edges

    elif filter_type == "scam_only":
        scam_edges = [e for e in filtered_edges if e.source.startswith("scam_report") or e.target.startswith("scam_report")]
        connected_node_ids = {e.source for e in scam_edges} | {e.target for e in scam_edges}
        filtered_nodes = [n for n in filtered_nodes if n.id in connected_node_ids]
        filtered_edges = scam_edges

    elif filter_type == "url_only":
        url_edges = [e for e in filtered_edges if e.source.startswith("url_scan") or e.target.startswith("url_scan")]
        connected_node_ids = {e.source for e in url_edges} | {e.target for e in url_edges}
        filtered_nodes = [n for n in filtered_nodes if n.id in connected_node_ids]
        filtered_edges = url_edges

    elif filter_type == "high_risk":
        filtered_nodes = [n for n in filtered_nodes if (n.risk_score or 0) >= 70 or n.severity in ("high", "critical") or n.report_count > 1]
        valid_ids = {n.id for n in filtered_nodes}
        filtered_edges = [e for e in filtered_edges if e.source in valid_ids and e.target in valid_ids]

    if search_query:
        sq = search_query.strip().lower()
        matching_nodes = [n for n in filtered_nodes if sq in n.label.lower() or sq in (n.sublabel or "").lower()]
        matching_ids = {n.id for n in matching_nodes}
        # Include 1-hop neighbours of matching nodes
        hop_edges = [e for e in filtered_edges if e.source in matching_ids or e.target in matching_ids]
        all_ids = matching_ids | {e.source for e in hop_edges} | {e.target for e in hop_edges}
        filtered_nodes = [n for n in filtered_nodes if n.id in all_ids]
        filtered_edges = hop_edges

    verified_count = sum(1 for e in filtered_edges if e.category == "VERIFIED_SHARED_INDICATOR")
    possible_count = sum(1 for e in filtered_edges if e.category == "POSSIBLE_RELATIONSHIP")

    return GraphResponse(
        nodes=filtered_nodes,
        edges=filtered_edges,
        total_reports_analyzed=total_reports,
        verified_relationships_count=verified_count,
        possible_relationships_count=possible_count,
        is_demo_data=is_demo,
        generated_at=datetime.now(timezone.utc).isoformat(),
    )


# ==============================================================================
# Synthetic Demonstration Dataset (Explicitly Labeled)
# ==============================================================================

def _inject_synthetic_demo_data(
    nodes: Dict[str, GraphNode],
    edges: Dict[str, GraphEdge],
) -> None:
    """
    Supplies an explicitly labeled demonstration dataset showing:
    1. Cluster Alpha: SBI YONO Phishing Ring (Shared Domain + Shared UPI handle)
    2. Cluster Beta: Bijli Power Disconnection Extortion (Hinglish utility threats)
    3. Multi-Cluster Pivot: Shared burner phone number between Alpha and Beta!
    All nodes and edges carry explicit synthetic attribution labels.
    """
    prefix = "[DEMO] "

    # --- Cluster Alpha Nodes (Banking KYC) ---
    r1_id = "scam_report:demo-sbi-1"
    nodes[r1_id] = GraphNode(
        id=r1_id,
        type="scam_report",
        label=prefix + "SBI Account Block SMS",
        sublabel="Threat Score 90/100 · High Risk",
        risk_classification="High Risk",
        risk_score=90,
        properties={"archetype": "Bank KYC Phishing", "is_demo": True},
    )

    r2_id = "scam_report:demo-sbi-2"
    nodes[r2_id] = GraphNode(
        id=r2_id,
        type="scam_report",
        label=prefix + "YONO App Mandate Threat",
        sublabel="Threat Score 85/100 · High Risk",
        risk_classification="High Risk",
        risk_score=85,
        properties={"archetype": "Bank KYC Phishing", "is_demo": True},
    )

    scan1_id = "url_scan:demo-scan-sbi"
    nodes[scan1_id] = GraphNode(
        id=scan1_id,
        type="url_scan",
        label=prefix + "sbi-kyc-update-portal.xyz",
        sublabel="URL Scan · Score 92/100 · High Risk",
        risk_classification="High Risk",
        risk_score=92,
        properties={"target": "http://sbi-kyc-update-portal.xyz/verify", "is_demo": True},
    )

    d_sbi = "domain:sbi-kyc-update-portal.xyz"
    nodes[d_sbi] = GraphNode(
        id=d_sbi,
        type="domain",
        label="sbi-kyc-update-portal.xyz",
        sublabel="Verified Shared Domain (3 Reports)",
        indicator_type="domain",
        report_count=3,
        properties={"domain": "sbi-kyc-update-portal.xyz", "is_demo": True},
    )

    brand_sbi = "brand:SBI"
    nodes[brand_sbi] = GraphNode(
        id=brand_sbi,
        type="brand",
        label="SBI (State Bank of India)",
        sublabel="Targeted Financial Brand",
        indicator_type="brand",
        report_count=3,
        properties={"brand": "SBI", "is_demo": True},
    )

    # --- Pivot Indicator: Burner Phone Number ---
    phone_shared = "indicator:phone:+91-9876543210"
    nodes[phone_shared] = GraphNode(
        id=phone_shared,
        type="indicator",
        label="+91-9876543210",
        sublabel="Cross-Cluster Burner Phone (3 Reports)",
        indicator_type="phone",
        report_count=3,
        properties={"phone": "+91-9876543210", "is_demo": True},
    )

    # --- Cluster Beta Nodes (Utility Bijli Extortion) ---
    r3_id = "scam_report:demo-bijli-1"
    nodes[r3_id] = GraphNode(
        id=r3_id,
        type="scam_report",
        label=prefix + "Bijli Cutoff Tonight (Hinglish)",
        sublabel="Threat Score 78/100 · High Risk",
        risk_classification="High Risk",
        risk_score=78,
        properties={"archetype": "Utility Disconnection Extortion", "is_demo": True},
    )

    r4_id = "scam_report:demo-bijli-2"
    nodes[r4_id] = GraphNode(
        id=r4_id,
        type="scam_report",
        label=prefix + "Urgent Power Disconnection Notice",
        sublabel="Threat Score 75/100 · High Risk",
        risk_classification="High Risk",
        risk_score=75,
        properties={"archetype": "Utility Disconnection Extortion", "is_demo": True},
    )

    tactic_urgency = "tactic:Artificial Urgency & Coercive Pressure"
    nodes[tactic_urgency] = GraphNode(
        id=tactic_urgency,
        type="tactic",
        label="Artificial Urgency & Disconnection Threat",
        sublabel="Psychological Tactic (4 Reports)",
        severity="high",
        report_count=4,
        properties={"category": "urgency_threat", "is_demo": True},
    )

    # --- Cluster Alpha Edges ---
    edges["e_r1_d"] = GraphEdge(
        id="e_r1_d",
        source=r1_id,
        target=d_sbi,
        label="Verified Shared Domain",
        relationship_type="EXTRACTED_DOMAIN",
        category="VERIFIED_SHARED_INDICATOR",
        evidence="[SYNTHETIC DEMO] Scam report #1 contains direct link on domain 'sbi-kyc-update-portal.xyz'.",
        source_report_ids=["demo-sbi-1"],
        confidence="High",
        weight=1.0,
        limitations=STANDARD_LIMITATION,
    )
    edges["e_r2_d"] = GraphEdge(
        id="e_r2_d",
        source=r2_id,
        target=d_sbi,
        label="Verified Shared Domain",
        relationship_type="EXTRACTED_DOMAIN",
        category="VERIFIED_SHARED_INDICATOR",
        evidence="[SYNTHETIC DEMO] Scam report #2 contains redirect to domain 'sbi-kyc-update-portal.xyz'.",
        source_report_ids=["demo-sbi-2"],
        confidence="High",
        weight=1.0,
        limitations=STANDARD_LIMITATION,
    )
    edges["e_scan1_d"] = GraphEdge(
        id="e_scan1_d",
        source=scan1_id,
        target=d_sbi,
        label="Investigated Infrastructure",
        relationship_type="RESOLVES_TO_DOMAIN",
        category="VERIFIED_SHARED_INDICATOR",
        evidence="[SYNTHETIC DEMO] Phase 2 deep URL scan targeted 'sbi-kyc-update-portal.xyz'.",
        source_report_ids=["demo-scan-sbi"],
        confidence="High",
        weight=1.0,
        limitations=STANDARD_LIMITATION,
    )
    edges["e_r1_b"] = GraphEdge(
        id="e_r1_b",
        source=r1_id,
        target=brand_sbi,
        label="Impersonates Brand",
        relationship_type="IMPERSONATES_BRAND",
        category="POSSIBLE_RELATIONSHIP",
        evidence="[SYNTHETIC DEMO] Message text impersonates State Bank of India brand.",
        source_report_ids=["demo-sbi-1"],
        confidence="Medium",
        weight=0.7,
        limitations=STANDARD_LIMITATION,
    )
    edges["e_r2_b"] = GraphEdge(
        id="e_r2_b",
        source=r2_id,
        target=brand_sbi,
        label="Impersonates Brand",
        relationship_type="IMPERSONATES_BRAND",
        category="POSSIBLE_RELATIONSHIP",
        evidence="[SYNTHETIC DEMO] Message text impersonates State Bank of India brand.",
        source_report_ids=["demo-sbi-2"],
        confidence="Medium",
        weight=0.7,
        limitations=STANDARD_LIMITATION,
    )

    # --- Cross-Cluster Pivot: Shared Phone Number ---
    edges["e_r1_phone"] = GraphEdge(
        id="e_r1_phone",
        source=r1_id,
        target=phone_shared,
        label="Verified Shared Phone",
        relationship_type="EXTRACTED_PHONE",
        category="VERIFIED_SHARED_INDICATOR",
        evidence="[SYNTHETIC DEMO] Contact helpline number in SBI SMS matches phone: +91-9876543210.",
        source_report_ids=["demo-sbi-1"],
        confidence="High",
        weight=1.0,
        limitations=STANDARD_LIMITATION,
    )
    edges["e_r3_phone"] = GraphEdge(
        id="e_r3_phone",
        source=r3_id,
        target=phone_shared,
        label="Verified Shared Phone",
        relationship_type="EXTRACTED_PHONE",
        category="VERIFIED_SHARED_INDICATOR",
        evidence="[SYNTHETIC DEMO] Bijli officer contact in electricity extortion matches phone: +91-9876543210.",
        source_report_ids=["demo-bijli-1"],
        confidence="High",
        weight=1.0,
        limitations=STANDARD_LIMITATION,
    )
    edges["e_r4_phone"] = GraphEdge(
        id="e_r4_phone",
        source=r4_id,
        target=phone_shared,
        label="Verified Shared Phone",
        relationship_type="EXTRACTED_PHONE",
        category="VERIFIED_SHARED_INDICATOR",
        evidence="[SYNTHETIC DEMO] Second power cutoff notification lists identical callback phone: +91-9876543210.",
        source_report_ids=["demo-bijli-2"],
        confidence="High",
        weight=1.0,
        limitations=STANDARD_LIMITATION,
    )

    # --- Tactic Links ---
    edges["e_r3_t"] = GraphEdge(
        id="e_r3_t",
        source=r3_id,
        target=tactic_urgency,
        label="Shared Tactic",
        relationship_type="USES_TACTIC",
        category="POSSIBLE_RELATIONSHIP",
        evidence="[SYNTHETIC DEMO] Hinglish phrase 'aaj raat disconnect' exerts coercive time pressure.",
        source_report_ids=["demo-bijli-1"],
        confidence="Medium",
        weight=0.6,
        limitations=STANDARD_LIMITATION,
    )
    edges["e_r4_t"] = GraphEdge(
        id="e_r4_t",
        source=r4_id,
        target=tactic_urgency,
        label="Shared Tactic",
        relationship_type="USES_TACTIC",
        category="POSSIBLE_RELATIONSHIP",
        evidence="[SYNTHETIC DEMO] Notice states electricity will be cut off within 4 hours.",
        source_report_ids=["demo-bijli-2"],
        confidence="Medium",
        weight=0.6,
        limitations=STANDARD_LIMITATION,
    )


# ==============================================================================
# Specific Report Relationships & Recurring Indicators
# ==============================================================================

def get_report_relationships(report_id: str, db: Session) -> ReportRelationshipsResponse:
    """Returns all 1-hop and 2-hop connections for a specific investigation report."""
    graph = build_threat_graph(db=db, limit=200, include_demo=True)
    target_node_id_options = [
        f"url_scan:{report_id}",
        f"scam_report:{report_id}",
        report_id,
    ]
    target_node_id = next((nid for nid in target_node_id_options if nid in {n.id for n in graph.nodes}), None)

    if not target_node_id:
        return ReportRelationshipsResponse(
            report_id=report_id,
            report_type="scam_report" if "scam" in report_id else "url_scan",
            report_label="Report Not Found",
            connected_reports=[],
            total_connected_reports=0,
            verified_shared_count=0,
            possible_inferred_count=0,
            limitations=STANDARD_LIMITATION,
        )

    # 1-hop connected entities
    direct_edges = [e for e in graph.edges if e.source == target_node_id or e.target == target_node_id]
    entity_ids = set()
    for e in direct_edges:
        other = e.target if e.source == target_node_id else e.source
        entity_ids.add(other)

    # 2-hop connected reports through those entities
    connected_reports_dict: Dict[str, ConnectedReportSummary] = {}
    verified_count = 0
    possible_count = 0

    for e in graph.edges:
        # Check if edge connects one of our entities to another report
        is_entity_source = e.source in entity_ids and e.target != target_node_id and (e.target.startswith("url_scan:") or e.target.startswith("scam_report:"))
        is_entity_target = e.target in entity_ids and e.source != target_node_id and (e.source.startswith("url_scan:") or e.source.startswith("scam_report:"))

        if is_entity_source or is_entity_target:
            other_report_id = e.target if is_entity_source else e.source
            pivot_entity_id = e.source if is_entity_source else e.target
            pivot_node = next((n for n in graph.nodes if n.id == pivot_entity_id), None)
            other_report_node = next((n for n in graph.nodes if n.id == other_report_id), None)

            if other_report_node and other_report_id not in connected_reports_dict:
                category: RelationshipCategory = (
                    "VERIFIED_SHARED_INDICATOR"
                    if pivot_node and pivot_node.type in ("domain", "url", "indicator")
                    else "POSSIBLE_RELATIONSHIP"
                )
                if category == "VERIFIED_SHARED_INDICATOR":
                    verified_count += 1
                else:
                    possible_count += 1

                connected_reports_dict[other_report_id] = ConnectedReportSummary(
                    report_id=other_report_id.split(":", 1)[1] if ":" in other_report_id else other_report_id,
                    report_type="url_scan" if other_report_id.startswith("url_scan:") else "scam_report",
                    label=other_report_node.label,
                    risk_classification=other_report_node.risk_classification or "Suspicious",
                    risk_score=other_report_node.risk_score or 50,
                    connection_type=category,
                    shared_indicators=[pivot_node.label] if pivot_node else [],
                    evidence=f"Connected through shared {pivot_node.sublabel if pivot_node else 'indicator'}: '{pivot_node.label if pivot_node else pivot_entity_id}'.",
                )

    curr_node = next(n for n in graph.nodes if n.id == target_node_id)
    return ReportRelationshipsResponse(
        report_id=report_id,
        report_type="url_scan" if target_node_id.startswith("url_scan:") else "scam_report",
        report_label=curr_node.label,
        connected_reports=list(connected_reports_dict.values()),
        total_connected_reports=len(connected_reports_dict),
        verified_shared_count=verified_count,
        possible_inferred_count=possible_count,
        limitations=STANDARD_LIMITATION,
    )


def get_top_recurring_indicators(db: Session, limit: int = 20) -> IndicatorsResponse:
    """Aggregates shared entities that appear in multiple reports."""
    graph = build_threat_graph(db=db, limit=200, include_demo=True)
    recurring_nodes = [
        n for n in graph.nodes
        if n.type in ("domain", "url", "indicator", "brand") and n.report_count >= 1
    ]
    # Sort by report_count descending
    recurring_nodes.sort(key=lambda n: n.report_count, reverse=True)

    indicators_list: List[RecurringIndicatorSummary] = []
    for node in recurring_nodes[:limit]:
        # Find all reports connected to this entity
        connected_edges = [e for e in graph.edges if e.source == node.id or e.target == node.id]
        report_ids = []
        for e in connected_edges:
            report_ids.extend(e.source_report_ids)
        unique_reports = list(dict.fromkeys(report_ids))

        indicators_list.append(
            RecurringIndicatorSummary(
                type=node.indicator_type or node.type,
                value=node.label,
                report_count=max(node.report_count, len(unique_reports)),
                report_ids=unique_reports,
                risk_classifications=[node.risk_classification] if node.risk_classification else ["Suspicious"],
                first_seen=datetime.now(timezone.utc).isoformat(),
                last_seen=datetime.now(timezone.utc).isoformat(),
            )
        )

    return IndicatorsResponse(
        indicators=indicators_list,
        total_count=len(indicators_list),
    )
