import asyncio
from app.evidence.query_generator import generate_search_queries, clean_search_term
from app.evidence.tavily_retriever import (
    TavilyRetriever,
    normalize_url,
    extract_domain
)
from app.schemas.verification import EvidenceItem
from fastapi.testclient import TestClient
from app.main import app


def test_clean_search_term():
    raw = "NASA's latest report: 'Earth to lose gravity?' [CONFIRMED]!"
    cleaned = clean_search_term(raw)
    assert cleaned == "NASA s latest report Earth to lose gravity CONFIRMED"


def test_query_generator_angles():
    claim = "The government announced a nationwide school closure for one month."
    queries = generate_search_queries(claim, max_queries=4)

    assert len(queries) >= 3
    # Check that direct query exists
    assert any("nationwide school closure" in q.lower() for q in queries)
    # Check that fact-check query exists
    assert any("fact check" in q.lower() for q in queries)
    # Check that debunk / contradiction query exists
    assert any("debunked" in q.lower() or "hoax" in q.lower() for q in queries)


def test_url_normalization_and_domain():
    # URL with tracking parameters
    dirty_url = "https://www.reuters.com/article/idUSKBN123?utm_source=twitter&utm_medium=social&fbclid=XYZ123#heading"
    clean = normalize_url(dirty_url)
    assert "utm_source" not in clean
    assert "fbclid" not in clean
    assert clean == "https://reuters.com/article/idUSKBN123"

    domain = extract_domain(dirty_url)
    assert domain == "reuters.com"


def test_tavily_retriever_missing_key():
    # Instantiating retriever with no key
    retriever = TavilyRetriever(api_key="")
    assert not retriever.is_available

    result = asyncio.run(retriever.retrieve_evidence("Test claim without API key."))
    assert result["is_available"] is False
    assert len(result["evidence"]) == 0
    assert "not configured" in result["limitation"]


def test_tavily_deduplication_and_mapping():
    # Mock search execution with duplicate URLs across queries
    class MockRetriever(TavilyRetriever):
        async def _execute_single_query(self, client, query, max_results=5):
            if "fact check" in query:
                return [
                    {
                        "title": "Reuters Fact Check: Claim is False",
                        "url": "https://www.reuters.com/fact-check/school-closure-claim?utm_source=share",
                        "content": "Official ministry spokespeople confirmed no such order was published.",
                        "score": 0.94,
                        "published_date": "2024-02-10"
                    }
                ]
            else:
                return [
                    # Duplicate URL with different query param
                    {
                        "title": "Reuters Fact Check Article",
                        "url": "https://www.reuters.com/fact-check/school-closure-claim",
                        "content": "Official ministry spokespeople confirmed no such order was published.",
                        "score": 0.91,
                        "published_date": "2024-02-10"
                    },
                    {
                        "title": "Ministry of Education Press Release",
                        "url": "https://education.gov/press-releases/notice-441",
                        "content": "All schools remain open on regular academic schedule.",
                        "score": 0.89,
                        "published_date": "2024-02-09"
                    }
                ]

    retriever = MockRetriever(api_key="tvly-mock-key")
    assert retriever.is_available

    result = asyncio.run(retriever.retrieve_evidence(
        "The government announced a nationwide school closure for one month."
    ))

    evidence = result["evidence"]
    sources = result["sources"]

    # Even though 3 items were returned across queries, deduplication must keep only 2 unique articles
    assert len(evidence) == 2
    assert len(sources) == 2
    assert all(isinstance(e, EvidenceItem) for e in evidence)

    # Check mapping fields
    reuters_item = next(e for e in evidence if "reuters.com" in e.source_name)
    assert reuters_item.source_name == "reuters.com"
    assert "Reuters Fact Check" in reuters_item.title
    assert reuters_item.relevance_score in [0.94, 0.91]
    assert reuters_item.published_date == "2024-02-10"


def test_api_verify_endpoint_with_retriever():
    client = TestClient(app)
    response = client.post("/api/verify", json={
        "claim": "NASA announces Earth will lose gravity for seven seconds tomorrow."
    })
    assert response.status_code == 200
    data = response.json()
    assert data["original_claim"] == "NASA announces Earth will lose gravity for seven seconds tomorrow."
    assert "summary" in data
    assert isinstance(data["sources"], list)
    assert isinstance(data["limitations"], list)


def run_all():
    print("🧪 Running Phase 6: Tavily Evidence Retrieval Tests...\n")
    test_clean_search_term()
    print("  ✅ PASS: Search term cleaning removes punctuation and extra whitespace")

    test_query_generator_angles()
    print("  ✅ PASS: Multi-query generator creates direct, fact-check, and debunk search angles")

    test_url_normalization_and_domain()
    print("  ✅ PASS: URL normalizer strips tracking tags and extracts clean domain")

    test_tavily_retriever_missing_key()
    print("  ✅ PASS: Gracefully detects missing TAVILY_API_KEY without crashing")

    test_tavily_deduplication_and_mapping()
    print("  ✅ PASS: Deduplicates identical URLs across queries and maps to EvidenceItem schema")

    test_api_verify_endpoint_with_retriever()
    print("  ✅ PASS: POST /api/verify correctly integrates retriever and returns valid response")

    print("\n🎉 All 6 Phase 6 tests passed successfully!")


if __name__ == "__main__":
    run_all()

