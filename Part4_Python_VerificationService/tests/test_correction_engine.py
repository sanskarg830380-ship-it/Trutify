import pytest
import asyncio
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient

from app.schemas.verification import (
    VerdictEnum,
    EvidenceItem,
    EvidenceRelationship
)
from app.correction.correction_engine import CorrectionEngine
from app.main import app

client = TestClient(app)


def test_correction_fallback_false_verdict():
    engine = CorrectionEngine(api_key="")
    assert not engine.is_available

    contradicting = [
        EvidenceItem(
            source_name="reuters.com",
            title="Fact Check: Viral Report on Gravity Disproven",
            url="https://reuters.com/fact-check/gravity",
            content="Physicists confirm planetary gravity cannot fluctuate for several seconds.",
            evidence_relationship=EvidenceRelationship.CONTRADICTS
        )
    ]

    res = asyncio.run(engine.generate_correction(
        claim="Earth will lose gravity for seven seconds tomorrow.",
        verdict=VerdictEnum.FALSE,
        verdict_summary="NASA and international physicists confirm this claim is a hoax.",
        verdict_explanation="No credible scientific body supports this assertion.",
        supporting=[],
        contradicting=contradicting,
        contextual=[]
    ))

    assert res["corrected_headline"] is not None
    assert "Fact Check" in res["corrected_headline"]
    assert "refuted" in res["corrected_news"].lower() or "disprove" in res["corrected_headline"].lower()
    assert res["correction_explanation"] is not None
    assert "reuters.com" in res["corrected_news"] or "reuters.com" in res["correction_explanation"]


def test_correction_fallback_misleading_verdict():
    engine = CorrectionEngine(api_key="")

    res = asyncio.run(engine.generate_correction(
        claim="The government passed a new education mandate yesterday.",
        verdict=VerdictEnum.MISLEADING,
        verdict_summary="A draft proposal was introduced, but no legislation was passed.",
        verdict_explanation="The viral claim misrepresents a legislative committee proposal as a passed law.",
        supporting=[],
        contradicting=[],
        contextual=[]
    ))

    assert res["corrected_headline"] is not None
    assert "Clarification" in res["corrected_headline"]
    assert "context" in res["corrected_news"].lower()
    assert "- " in res["correction_explanation"]


def test_correction_fallback_verified_verdict():
    engine = CorrectionEngine(api_key="")
    supporting = [
        EvidenceItem(
            source_name="un.org",
            title="UN History and Founding",
            url="https://un.org/overview",
            content="The United Nations officially came into existence on 24 October 1945.",
            evidence_relationship=EvidenceRelationship.SUPPORTS
        )
    ]

    res = asyncio.run(engine.generate_correction(
        claim="The United Nations was founded in 1945.",
        verdict=VerdictEnum.VERIFIED,
        verdict_summary="Primary records from international charters confirm the UN was founded in 1945.",
        verdict_explanation="Charter was ratified in October 1945.",
        supporting=supporting,
        contradicting=[],
        contextual=[]
    ))

    assert res["corrected_headline"] is not None
    assert "Verified" in res["corrected_headline"]
    assert "corroborate" in res["corrected_news"].lower()
    assert "No correction needed" in res["correction_explanation"] or "accurately reflects" in res["correction_explanation"]


def test_correction_fallback_unverified_verdict():
    engine = CorrectionEngine(api_key="")

    res = asyncio.run(engine.generate_correction(
        claim="Mysterious unknown sound heard across remote desert.",
        verdict=VerdictEnum.UNVERIFIED,
        verdict_summary="Zero independent records found.",
        verdict_explanation="No scientific reports available.",
        supporting=[],
        contradicting=[],
        contextual=[]
    ))

    # For UNVERIFIED, headline must be None
    assert res["corrected_headline"] is None
    assert "insufficient" in res["corrected_news"].lower()
    assert "No accredited news" in res["correction_explanation"] or "insufficient" in res["correction_explanation"]


def test_correction_prompt_construction():
    engine = CorrectionEngine(api_key="mock_key")
    claim = "Drinking salt water cures coronavirus instantly."
    contradicting = [
        EvidenceItem(
            source_name="who.int",
            title="Salt Water Myth",
            url="https://who.int/salt-water",
            content="Drinking saline solution does not prevent or cure respiratory viruses.",
            evidence_relationship=EvidenceRelationship.CONTRADICTS
        )
    ]

    prompt = engine._build_prompt(
        claim=claim,
        verdict=VerdictEnum.FALSE,
        verdict_summary="Medical consensus confirms salt water is ineffective.",
        verdict_explanation="High salinity ingestion can cause dehydration.",
        supporting=[],
        contradicting=contradicting,
        contextual=[]
    )

    assert claim in prompt
    assert "FALSE" in prompt
    assert "who.int" in prompt
    assert "Never fabricate facts" in prompt
    assert "corrected_headline" in prompt
    assert "corrected_news" in prompt


def test_correction_mock_gemini_success():
    engine = CorrectionEngine(api_key="mock_key")

    mock_gemini_output = {
        "corrected_headline": "Fact Check: NASA Debunks Rumor of Impending Zero-Gravity Event",
        "corrected_news": "A widely circulated social media claim asserting that Earth will temporarily lose gravity is entirely false. NASA scientists confirmed that the laws of physics remain constant.",
        "correction_explanation": "- Debunked the non-existent 'zero gravity' window.\n- Clarified that the alleged leaked memo is a fabricated document."
    }

    contradicting = [
        EvidenceItem(
            source_name="nasa.gov",
            title="Physics Statement",
            url="https://nasa.gov/gravity",
            content="No such event is possible.",
            evidence_relationship=EvidenceRelationship.CONTRADICTS
        )
    ]

    with patch.object(engine, "_call_gemini", new=AsyncMock(return_value=mock_gemini_output)):
        res = asyncio.run(engine.generate_correction(
            claim="Earth will lose gravity tomorrow.",
            verdict=VerdictEnum.FALSE,
            verdict_summary="Debunked by NASA.",
            verdict_explanation="Physics prevents gravity disruption.",
            supporting=[],
            contradicting=contradicting,
            contextual=[]
        ))

        assert res["corrected_headline"] == "Fact Check: NASA Debunks Rumor of Impending Zero-Gravity Event"
        assert "NASA scientists confirmed" in res["corrected_news"]
        assert "Debunked the non-existent" in res["correction_explanation"]


def test_api_verify_endpoint_returns_correction():
    """Validates that POST /api/verify populates correction fields in the response."""
    response = client.post(
        "/api/verify",
        json={"claim": "The United Nations was founded in 1945."}
    )
    assert response.status_code == 200
    data = response.json()
    assert "corrected_headline" in data
    assert "corrected_news" in data
    assert "correction_explanation" in data
    assert isinstance(data["corrected_news"], str) and len(data["corrected_news"]) > 10
    assert isinstance(data["correction_explanation"], str) and len(data["correction_explanation"]) > 5
