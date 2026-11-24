from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime, timezone


class VerdictEnum(str, Enum):
    VERIFIED = "VERIFIED"
    FALSE = "FALSE"
    MISLEADING = "MISLEADING"
    PARTIALLY_TRUE = "PARTIALLY TRUE"
    UNVERIFIED = "UNVERIFIED"


class EvidenceRelationship(str, Enum):
    SUPPORTS = "SUPPORTS"
    CONTRADICTS = "CONTRADICTS"
    CONTEXTUALIZES = "CONTEXTUALIZES"
    NEUTRAL = "NEUTRAL"


class EvidenceItem(BaseModel):
    source_name: str = Field(description="Name of the publisher or domain")
    title: str = Field(description="Article or page title")
    url: str = Field(description="Direct URL to the retrieved evidence")
    published_date: Optional[str] = Field(default=None, description="ISO publication date if available")
    content: str = Field(description="Text snippet or extracted evidence quote")
    relevance_score: Optional[float] = Field(default=None, description="Calculated relevance score from 0.0 to 1.0")
    evidence_relationship: EvidenceRelationship = Field(
        default=EvidenceRelationship.NEUTRAL,
        description="Relationship to claim: SUPPORTS, CONTRADICTS, CONTEXTUALIZES, or NEUTRAL"
    )
    metadata: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Optional metadata such as source authority tier or scoring details"
    )


class ClaimRequest(BaseModel):
    claim: str = Field(
        min_length=5,
        max_length=1500,
        description="Normalized factual claim to verify"
    )
    context: Optional[str] = Field(
        default=None,
        description="Optional additional context or source text"
    )


class VerificationResponse(BaseModel):
    original_claim: str = Field(description="The claim that was analyzed")
    verdict: VerdictEnum = Field(description="Final fact-checking verdict")
    confidence: int = Field(ge=0, le=100, description="Confidence score from 0 to 100")
    summary: str = Field(description="Brief 1-2 sentence executive summary")
    explanation: str = Field(description="Detailed evidence-grounded explanation")
    supporting_evidence: List[EvidenceItem] = Field(default_factory=list)
    contradicting_evidence: List[EvidenceItem] = Field(default_factory=list)
    contextual_evidence: List[EvidenceItem] = Field(default_factory=list)
    corrected_headline: Optional[str] = Field(default=None, description="Factual replacement headline if misleading or false")
    corrected_news: Optional[str] = Field(default=None, description="Evidence-backed news correction paragraph")
    correction_explanation: Optional[str] = Field(default=None, description="Breakdown of specific inaccuracies")
    sources: List[str] = Field(default_factory=list, description="Unique list of source URLs cited")
    limitations: List[str] = Field(default_factory=list, description="Known constraints or information gaps")
    verification_timestamp: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat(),
        description="ISO timestamp of verification completion"
    )
