from fastapi import APIRouter, HTTPException, status
from app.schemas.verification import (
    ClaimRequest,
    VerificationResponse,
    VerdictEnum,
)
from app.evidence.evidence_aggregator import EvidenceAggregator
from app.analysis.evidence_processor import EvidenceProcessor
from app.verdict.verdict_engine import VerdictEngine
from app.correction.correction_engine import CorrectionEngine
from datetime import datetime, timezone

router = APIRouter(prefix="/api", tags=["Verification"])


@router.post("/verify", response_model=VerificationResponse, status_code=status.HTTP_200_OK)
@router.post("/verify/claim", response_model=VerificationResponse, status_code=status.HTTP_200_OK)
async def verify_claim(request: ClaimRequest):
    """
    Core verification endpoint.
    Retrieves evidence from multi-source aggregators, analyzes source authority,
    categorizes evidence (Supporting, Contradicting, Contextual), and synthesizes
    an AI-powered, evidence-backed factual verdict.
    """
    clean_claim = request.claim.strip()
    if not clean_claim:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Claim cannot be empty."
        )

    # 1. Multi-source parallel evidence aggregation
    aggregator = EvidenceAggregator()
    aggregated = await aggregator.aggregate_evidence(clean_claim)

    evidence_list = aggregated.get("evidence", [])
    sources_list = aggregated.get("sources", [])
    limitations = aggregated.get("limitations", [])
    providers_used = aggregated.get("providers_used", [])

    # 2. Source Credibility Evaluation & Evidence Categorization
    processor = EvidenceProcessor()
    processed = processor.process_evidence(evidence_list, clean_claim)

    supporting = processed.get("supporting_evidence", [])
    contradicting = processed.get("contradicting_evidence", [])
    contextual = processed.get("contextual_evidence", [])
    direction = processed.get("dominant_direction", "INCONCLUSIVE")
    weights = processed.get("authority_weights", {})

    # 3. AI Verdict Synthesis & Calibration
    verdict_engine = VerdictEngine()
    verdict_data = await verdict_engine.generate_verdict(
        claim=clean_claim,
        supporting=supporting,
        contradicting=contradicting,
        contextual=contextual,
        dominant_direction=direction,
        authority_weights=weights
    )

    final_verdict = verdict_data.get("verdict", VerdictEnum.UNVERIFIED)
    final_summary = verdict_data.get("summary", "Verification complete.")
    final_explanation = verdict_data.get("explanation", "Evidence synthesis concluded.")

    # 4. News Correction & Factual Rewrite
    correction_engine = CorrectionEngine()
    correction_data = await correction_engine.generate_correction(
        claim=clean_claim,
        verdict=final_verdict,
        verdict_summary=final_summary,
        verdict_explanation=final_explanation,
        supporting=supporting,
        contradicting=contradicting,
        contextual=contextual
    )

    if not evidence_list and providers_used:
        limitations.append("No corroborating or refuting evidence found across active search providers.")

    return VerificationResponse(
        original_claim=clean_claim,
        verdict=final_verdict,
        confidence=verdict_data.get("confidence", 35),
        summary=final_summary,
        explanation=final_explanation,
        supporting_evidence=supporting,
        contradicting_evidence=contradicting,
        contextual_evidence=contextual,
        corrected_headline=correction_data.get("corrected_headline"),
        corrected_news=correction_data.get("corrected_news"),
        correction_explanation=correction_data.get("correction_explanation"),
        sources=sources_list,
        limitations=limitations,
        verification_timestamp=datetime.now(timezone.utc).isoformat()
    )
