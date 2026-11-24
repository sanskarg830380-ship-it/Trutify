from app.analysis.source_evaluator import evaluate_source_authority
from app.analysis.evidence_processor import (
    classify_snippet_relationship,
    EvidenceProcessor
)
from app.schemas.verification import EvidenceItem, EvidenceRelationship, VerdictEnum
from fastapi.testclient import TestClient
from app.main import app


def test_source_authority_tiers():
    # Government / Primary source
    gov = evaluate_source_authority("https://www.nasa.gov/press-release/gravity-study")
    assert gov["tier"] == 1
    assert gov["authority_score"] >= 0.95
    assert gov["is_primary_source"] is True

    # Academic source
    edu = evaluate_source_authority("https://web.mit.edu/research/physics/gravity")
    assert edu["tier"] == 1
    assert edu["authority_score"] >= 0.95

    # Fact checker
    snopes = evaluate_source_authority("https://www.snopes.com/fact-check/earth-gravity-loss")
    assert snopes["tier"] == 1
    assert snopes["is_fact_checker"] is True
    assert snopes["authority_score"] >= 0.95

    # Major News Agency
    reuters = evaluate_source_authority("https://www.reuters.com/world/science/article-123")
    assert reuters["tier"] == 2
    assert reuters["authority_score"] == 0.88

    # Low trust / Social Media
    twitter = evaluate_source_authority("https://twitter.com/user/status/123456")
    assert twitter["tier"] == 4
    assert twitter["authority_score"] <= 0.35


def test_classify_snippet_relationship():
    # Refutation signal
    debunk_text = "Scientists have debunked the viral claim, confirming it is completely false."
    assert classify_snippet_relationship(debunk_text, EvidenceRelationship.NEUTRAL) == EvidenceRelationship.CONTRADICTS

    # Contextual signal
    context_text = "The viral video is being shared out of context, using old footage from 2018."
    assert classify_snippet_relationship(context_text, EvidenceRelationship.NEUTRAL) == EvidenceRelationship.CONTEXTUALIZES

    # Corroborating signal
    support_text = "The Ministry of Health officially announced and confirmed the new emergency protocol."
    assert classify_snippet_relationship(support_text, EvidenceRelationship.NEUTRAL) == EvidenceRelationship.SUPPORTS

    # Already classified fact-check preserved
    assert classify_snippet_relationship("Random text", EvidenceRelationship.CONTRADICTS) == EvidenceRelationship.CONTRADICTS


def test_evidence_processor_bucketing_and_weights():
    processor = EvidenceProcessor()

    evidence_items = [
        # High authority contradicting evidence
        EvidenceItem(
            source_name="snopes.com",
            title="Fact Check: NASA did NOT confirm Earth gravity loss",
            url="https://www.snopes.com/fact-check/earth-gravity-loss",
            content="Snopes: Rating is False. This is a fabricated hoax.",
            relevance_score=0.98,
            evidence_relationship=EvidenceRelationship.CONTRADICTS
        ),
        # High authority second contradicting source
        EvidenceItem(
            source_name="reuters.com",
            title="Reuters Fact Check: False claim circulates regarding Earth gravity",
            url="https://www.reuters.com/fact-check/earth-gravity-hoax",
            content="Reuters confirms physics principles debunk the viral rumor.",
            relevance_score=0.94,
            evidence_relationship=EvidenceRelationship.NEUTRAL
        ),
        # Low authority rumor repeater
        EvidenceItem(
            source_name="twitter.com",
            title="Viral post on gravity",
            url="https://twitter.com/conspiracy/status/987",
            content="Someone announced gravity will shut down tomorrow!",
            relevance_score=0.80,
            evidence_relationship=EvidenceRelationship.NEUTRAL
        )
    ]

    processed = processor.process_evidence(evidence_items, "NASA confirms gravity loss")

    contradicting = processed["contradicting_evidence"]
    supporting = processed["supporting_evidence"]
    contextual = processed["contextual_evidence"]
    weights = processed["authority_weights"]

    assert len(contradicting) == 2
    assert len(supporting) == 1  # "announced" matched in twitter snippet, but authority is low
    assert processed["dominant_direction"] == "CONTRADICTING"
    assert weights["contradicting"] > weights["supporting"]

    # Check that Snopes and Reuters are at the top of the contradicting list
    assert contradicting[0].source_name in ["snopes.com", "reuters.com"]
    # Check that Twitter source authority was capped
    twitter_item = next(i for i in supporting if "twitter.com" in i.url)
    assert twitter_item.relevance_score <= 0.40


def test_api_verify_with_processed_evidence():
    client = TestClient(app)
    response = client.post("/api/verify", json={
        "claim": "NASA announces Earth will lose gravity for seven seconds tomorrow."
    })
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data["supporting_evidence"], list)
    assert isinstance(data["contradicting_evidence"], list)
    assert isinstance(data["contextual_evidence"], list)
    assert len(data["summary"]) > 0
    assert data["verdict"] in [v.value for v in VerdictEnum]


def run_all():
    print("🧪 Running Phase 8: Source Evaluation & Evidence Processing Tests...\n")
    test_source_authority_tiers()
    print("  ✅ PASS: Source authority correctly identifies Tier 1 (.gov, fact-checkers), Tier 2 (news), and Tier 4 (social)")

    test_classify_snippet_relationship()
    print("  ✅ PASS: Snippet relationship classifier identifies CONTRADICTS, CONTEXTUALIZES, and SUPPORTS signals")

    test_evidence_processor_bucketing_and_weights()
    print("  ✅ PASS: Evidence processor accurately buckets items, calculates weights, and caps low-trust domains")

    test_api_verify_with_processed_evidence()
    print("  ✅ PASS: POST /api/verify outputs structured categorized evidence buckets")

    print("\n🎉 All 4 Phase 8 tests passed successfully!")


if __name__ == "__main__":
    run_all()
