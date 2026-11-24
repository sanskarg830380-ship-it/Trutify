import re
from typing import List, Dict, Any
from app.schemas.verification import EvidenceItem, EvidenceRelationship
from app.analysis.source_evaluator import evaluate_source_authority


REFUTATION_PATTERNS = [
    r"\bfalse\b", r"\bhoax\b", r"\bdebunked\b", r"\bno evidence\b", r"\buntrue\b",
    r"\bmyth\b", r"\bfake\b", r"\brefute[sd]?\b", r"\bdenie[sd]?\b", r"\bincorrect\b",
    r"\bnot true\b", r"\bdisproven\b", r"\bfabricated\b", r"\bdeceptive\b", r"\bmisinformation\b"
]

CONTEXTUAL_PATTERNS = [
    r"\bmisleading\b", r"\bout of context\b", r"\bpartly true\b", r"\bpartially\b",
    r"\bhalf true\b", r"\bclarifie[sd]?\b", r"\bexaggerated\b", r"\bsatire\b", r"\bparody\b",
    r"\bold video\b", r"\bmissing context\b", r"\bdistorted\b"
]

SUPPORTING_PATTERNS = [
    r"\bconfirms?\b", r"\bannounced\b", r"\bverified\b", r"\bofficial statement\b",
    r"\bcorroborated\b", r"\bproves?\b", r"\bvalidates?\b", r"\btrue\b",
    r"\breports?\b", r"\breported\b", r"\baccording to\b", r"\bstated\b", r"\bsaid\b",
    r"\bunveiled\b", r"\breleased\b", r"\bpassed\b", r"\bsigned\b", r"\bapproved\b",
    r"\blaunched\b", r"\bwon\b", r"\bheld\b", r"\bdecided\b", r"\bdeclared\b",
    r"\bappointed\b", r"\bmet\b", r"\bagreed\b", r"\bscheduled\b", r"\bupdated\b",
    r"\bofficially\b", r"\bstatement\b", r"\bconducted\b", r"\bcompleted\b"
]


def classify_snippet_relationship(text: str, current_relationship: EvidenceRelationship, auth_score: float = 0.5) -> EvidenceRelationship:
    """
    Classifies the stance of an evidence snippet relative to the claim.
    Prioritizes established fact-checks, then checks contextual, refutation, and corroborating signals.
    High-authority journalism reporting directly without debunk signals is treated as supporting.
    """
    if current_relationship in {EvidenceRelationship.CONTRADICTS, EvidenceRelationship.CONTEXTUALIZES, EvidenceRelationship.SUPPORTS}:
        return current_relationship

    t_lower = text.lower()

    # Check for contextual / nuance signals first
    if any(re.search(p, t_lower) for p in CONTEXTUAL_PATTERNS):
        return EvidenceRelationship.CONTEXTUALIZES

    # Check for refutation / debunking signals
    if any(re.search(p, t_lower) for p in REFUTATION_PATTERNS):
        return EvidenceRelationship.CONTRADICTS

    # Check for corroboration / affirmation / reporting signals
    if any(re.search(p, t_lower) for p in SUPPORTING_PATTERNS):
        return EvidenceRelationship.SUPPORTS

    # High-credibility journalism reporting without contradiction flags acts as corroboration for news
    if auth_score >= 0.80:
        return EvidenceRelationship.SUPPORTS

    return EvidenceRelationship.NEUTRAL


class EvidenceProcessor:
    """
    Processes raw retrieved evidence items:
    - Calculates source authority and adjusts relevance scores.
    - Classifies evidence relationships (SUPPORTS, CONTRADICTS, CONTEXTUALIZES).
    - Partitions evidence into categorized buckets.
    - Computes aggregated authority weights.
    """

    def process_evidence(
        self,
        evidence_items: List[EvidenceItem],
        claim: str
    ) -> Dict[str, Any]:
        """
        Processes and categorizes retrieved evidence.

        Returns:
            Dict containing:
                - supporting_evidence: List[EvidenceItem]
                - contradicting_evidence: List[EvidenceItem]
                - contextual_evidence: List[EvidenceItem]
                - neutral_evidence: List[EvidenceItem]
                - authority_weights: Dict[str, float]
                - dominant_evidence_direction: str ("CONTRADICTING", "SUPPORTING", "CONTEXTUAL", "INCONCLUSIVE")
        """
        supporting: List[EvidenceItem] = []
        contradicting: List[EvidenceItem] = []
        contextual: List[EvidenceItem] = []
        neutral: List[EvidenceItem] = []

        total_support_weight = 0.0
        total_contradict_weight = 0.0
        total_context_weight = 0.0

        for item in evidence_items:
            # 1. Evaluate Source Domain Authority
            authority = evaluate_source_authority(item.url)
            auth_score = authority["authority_score"]

            # Adjust relevance based on domain credibility
            base_score = item.relevance_score if item.relevance_score is not None else 0.70
            effective_score = round((0.4 * base_score) + (0.6 * auth_score), 3)

            # Cap low-trust user-generated domains
            if authority["tier"] == 4:
                effective_score = min(effective_score, 0.40)

            item.relevance_score = effective_score

            # 2. Determine Relationship Stance
            combined_text = f"{item.title} {item.content}"
            relationship = classify_snippet_relationship(combined_text, item.evidence_relationship, auth_score)
            item.evidence_relationship = relationship

            # 3. Categorize into Buckets
            if relationship == EvidenceRelationship.CONTRADICTS:
                contradicting.append(item)
                total_contradict_weight += auth_score
            elif relationship == EvidenceRelationship.SUPPORTS:
                supporting.append(item)
                total_support_weight += auth_score
            elif relationship == EvidenceRelationship.CONTEXTUALIZES:
                contextual.append(item)
                total_context_weight += auth_score
            else:
                neutral.append(item)

        # Sort each bucket by authority/relevance descending
        supporting.sort(key=lambda x: x.relevance_score or 0.0, reverse=True)
        contradicting.sort(key=lambda x: x.relevance_score or 0.0, reverse=True)
        contextual.sort(key=lambda x: x.relevance_score or 0.0, reverse=True)

        # Determine dominant direction
        if total_contradict_weight > total_support_weight and total_contradict_weight >= 0.8:
            dominant_direction = "CONTRADICTING"
        elif total_support_weight > total_contradict_weight and total_support_weight >= 0.8:
            dominant_direction = "SUPPORTING"
        elif total_context_weight > 0.8:
            dominant_direction = "CONTEXTUAL"
        else:
            dominant_direction = "INCONCLUSIVE"

        return {
            "supporting_evidence": supporting,
            "contradicting_evidence": contradicting,
            "contextual_evidence": contextual,
            "neutral_evidence": neutral,
            "authority_weights": {
                "supporting": round(total_support_weight, 2),
                "contradicting": round(total_contradict_weight, 2),
                "contextual": round(total_context_weight, 2)
            },
            "dominant_direction": dominant_direction
        }
