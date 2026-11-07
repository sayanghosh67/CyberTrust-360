from datetime import datetime
from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field

NodeType = Literal[
    "scam_report",
    "url_scan",
    "domain",
    "url",
    "brand",
    "tactic",
    "indicator",
]

RelationshipCategory = Literal[
    "VERIFIED_SHARED_INDICATOR",
    "POSSIBLE_RELATIONSHIP",
]

SeverityLevel = Literal["info", "low", "medium", "high", "critical"]
RiskLevel = Literal["Low Risk", "Suspicious", "High Risk", "Confirmed Malicious", "Inconclusive"]
ConfidenceLevel = Literal["Low", "Medium", "High"]


class GraphNode(BaseModel):
    id: str = Field(..., description="Unique deterministic node identifier (e.g. 'domain:sbi-yono.xyz')")
    type: NodeType = Field(..., description="Type of graph entity")
    label: str = Field(..., description="Primary display label")
    sublabel: Optional[str] = Field(None, description="Secondary context (e.g. Archetype or Entity category)")
    risk_classification: Optional[RiskLevel] = Field(None, description="Risk classification if applicable")
    risk_score: Optional[int] = Field(None, ge=0, le=100, description="0-100 risk score")
    severity: Optional[SeverityLevel] = Field(None, description="Severity rating")
    indicator_type: Optional[str] = Field(None, description="Specific indicator category (phone, upi_id, email, url)")
    report_count: int = Field(default=1, description="Number of reports referencing this entity")
    properties: Dict[str, Any] = Field(default_factory=dict, description="Metadata dictionary")


class GraphEdge(BaseModel):
    id: str = Field(..., description="Unique deterministic edge identifier")
    source: str = Field(..., description="Source node ID")
    target: str = Field(..., description="Target node ID")
    label: str = Field(..., description="Readable edge relationship label")
    relationship_type: str = Field(
        ...,
        description="Technical relationship code (e.g. SHARED_DOMAIN, SHARED_PHONE, IMPERSONATES_BRAND)"
    )
    category: RelationshipCategory = Field(
        ...,
        description="VERIFIED_SHARED_INDICATOR (exact technical match) or POSSIBLE_RELATIONSHIP (heuristic/tactic inference)"
    )
    evidence: str = Field(..., description="Detailed technical evidence justifying the link")
    source_report_ids: List[str] = Field(default_factory=list, description="IDs of reports providing evidence")
    confidence: ConfidenceLevel = Field(default="Medium", description="Confidence level in the relationship")
    weight: float = Field(default=1.0, description="Graph link weight for layout force calculations")
    limitations: str = Field(
        default=(
            "A shared technical indicator or tactic demonstrates common infrastructure or shared techniques, "
            "but does not prove common ownership, attacker identity, or coordinated criminal campaigns without external attribution."
        ),
        description="Attribution disclaimer and limitations statement"
    )


class GraphResponse(BaseModel):
    nodes: List[GraphNode]
    edges: List[GraphEdge]
    total_reports_analyzed: int
    verified_relationships_count: int
    possible_relationships_count: int
    is_demo_data: bool = False
    generated_at: str


class RecurringIndicatorSummary(BaseModel):
    type: str
    value: str
    report_count: int
    report_ids: List[str]
    risk_classifications: List[str]
    first_seen: str
    last_seen: str


class IndicatorsResponse(BaseModel):
    indicators: List[RecurringIndicatorSummary]
    total_count: int


class ConnectedReportSummary(BaseModel):
    report_id: str
    report_type: Literal["scam_report", "url_scan"]
    label: str
    risk_classification: str
    risk_score: int
    connection_type: RelationshipCategory
    shared_indicators: List[str]
    evidence: str


class ReportRelationshipsResponse(BaseModel):
    report_id: str
    report_type: Literal["scam_report", "url_scan"]
    report_label: str
    connected_reports: List[ConnectedReportSummary]
    total_connected_reports: int
    verified_shared_count: int
    possible_inferred_count: int
    limitations: str

