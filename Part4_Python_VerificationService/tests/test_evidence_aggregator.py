import asyncio
from app.evidence.newsapi_retriever import NewsApiRetriever
from app.evidence.factcheck_retriever import (
    GoogleFactCheckRetriever,
    map_textual_rating_to_relationship
)
from app.evidence.tavily_retriever import TavilyRetriever
from app.evidence.evidence_aggregator import EvidenceAggregator
from app.schemas.verification import EvidenceItem, EvidenceRelationship, VerdictEnum
from fastapi.testclient import TestClient
from app.main import app


def test_rating_mapper():
    assert map_textual_rating_to_relationship("False") == EvidenceRelationship.CONTRADICTS
    assert map_textual_rating_to_relationship("Pants on Fire!") == EvidenceRelationship.CONTRADICTS
    assert map_textual_rating_to_relationship("Hoax") == EvidenceRelationship.CONTRADICTS
    assert map_textual_rating_to_relationship("Mostly True") == EvidenceRelationship.SUPPORTS
    assert map_textual_rating_to_relationship("Correct") == EvidenceRelationship.SUPPORTS
    assert map_textual_rating_to_relationship("Misleading Context") == EvidenceRelationship.CONTEXTUALIZES
    assert map_textual_rating_to_relationship("Mixture of True and False") == EvidenceRelationship.CONTEXTUALIZES
    assert map_textual_rating_to_relationship("Unproven statement") == EvidenceRelationship.NEUTRAL


def test_unconfigured_keys_limitations():
    news = NewsApiRetriever(api_key="")
    assert not news.is_available
    news_res = asyncio.run(news.retrieve_news("Test"))
    assert news_res["is_available"] is False
    assert "NewsAPI key is not configured" in news_res["limitation"]

    fact = GoogleFactCheckRetriever(api_key="")
    assert not fact.is_available
    fact_res = asyncio.run(fact.retrieve_fact_checks("Test"))
    assert fact_res["is_available"] is False
    assert "Google Fact Check Tools API key is not configured" in fact_res["limitation"]


def test_evidence_aggregator_multi_source():
    # Mock Tavily
    class MockTavily(TavilyRetriever):
        async def retrieve_evidence(self, claim, **kwargs):
            return {
                "evidence": [
                    EvidenceItem(
                        source_name="bbc.com",
                        title="BBC Report on Education",
                        url="https://www.bbc.com/news/education-123?utm_source=twitter",
                        content="Education department outlines current policy.",
                        relevance_score=0.88,
                        evidence_relationship=EvidenceRelationship.NEUTRAL
                    )
                ],
                "sources": ["https://www.bbc.com/news/education-123"],
                "is_available": True,
                "limitation": None
            }

    # Mock NewsAPI (contains duplicate canonical URL of BBC with different query params)
    class MockNewsApi(NewsApiRetriever):
        async def retrieve_news(self, query, **kwargs):
            return {
                "evidence": [
                    EvidenceItem(
                        source_name="bbc.com",
                        title="BBC News Duplicate",
                        url="https://bbc.com/news/education-123",
                        content="Duplicate article snippet.",
                        relevance_score=0.85,
                        evidence_relationship=EvidenceRelationship.NEUTRAL
                    ),
                    EvidenceItem(
                        source_name="theguardian.com",
                        title="Guardian School Analysis",
                        url="https://theguardian.com/education/schools-update",
                        content="Schools operate under standard term schedules.",
                        relevance_score=0.87,
                        evidence_relationship=EvidenceRelationship.NEUTRAL
                    )
                ],
                "sources": ["https://theguardian.com/education/schools-update"],
                "is_available": True,
                "limitation": None
            }

    # Mock Fact Check Tools
    class MockFactCheck(GoogleFactCheckRetriever):
        async def retrieve_fact_checks(self, query, **kwargs):
            return {
                "evidence": [
                    EvidenceItem(
                        source_name="snopes.com",
                        title="Did the Government Announce School Closures?",
                        url="https://snopes.com/fact-check/school-closures",
                        content="Snopes Fact Check: Rating is False. Viral rumors circulating on WhatsApp are fabricated.",
                        relevance_score=0.98,
                        evidence_relationship=EvidenceRelationship.CONTRADICTS
                    )
                ],
                "sources": ["https://snopes.com/fact-check/school-closures"],
                "is_available": True,
                "limitation": None
            }

    aggregator = EvidenceAggregator(
        tavily=MockTavily(api_key="mock-key"),
        newsapi=MockNewsApi(api_key="mock-key"),
        factcheck=MockFactCheck(api_key="mock-key")
    )

    result = asyncio.run(aggregator.aggregate_evidence("School closure claim"))

    evidence = result["evidence"]
    sources = result["sources"]
    providers = result["providers_used"]

    assert "Google Fact Check Tools" in providers
    assert "Tavily Web Search" in providers
    assert "NewsAPI" in providers

    # 4 items were returned across all 3 providers, but 1 is a duplicate (BBC)
    # Deduplication must result in exactly 3 unique items
    assert len(evidence) == 3
    assert len(sources) == 3

    # Most authoritative evidence (Snopes with score 0.98) must be sorted first
    assert evidence[0].source_name == "snopes.com"
    assert evidence[0].evidence_relationship == EvidenceRelationship.CONTRADICTS
    assert evidence[0].relevance_score == 0.98


def test_api_verify_with_aggregator():
    client = TestClient(app)
    response = client.post("/api/verify", json={
        "claim": "The government announces nationwide school closure."
    })
    assert response.status_code == 200
    data = response.json()
    assert data["verdict"] in [v.value for v in VerdictEnum]
    assert "summary" in data
    assert isinstance(data["sources"], list)
    assert isinstance(data["limitations"], list)


def run_all():
    print("🧪 Running Phase 7: Multi-Source Evidence Aggregation Tests...\n")
    test_rating_mapper()
    print("  ✅ PASS: Fact-check textual rating mapper classifies ratings into relationships correctly")

    test_unconfigured_keys_limitations()
    print("  ✅ PASS: Unconfigured NewsAPI and Fact Check keys report limitations gracefully")

    test_evidence_aggregator_multi_source()
    print("  ✅ PASS: Multi-source aggregator merges Tavily, NewsAPI, and FactCheck with deduplication & prioritization")

    test_api_verify_with_aggregator()
    print("  ✅ PASS: POST /api/verify correctly handles aggregated multi-source responses")

    print("\n🎉 All 4 Phase 7 tests passed successfully!")


if __name__ == "__main__":
    run_all()
