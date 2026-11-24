import asyncio
import logging
from typing import List, Dict, Any, Optional

from app.schemas.verification import EvidenceItem
from app.evidence.tavily_retriever import TavilyRetriever, normalize_url
from app.evidence.newsapi_retriever import NewsApiRetriever
from app.evidence.factcheck_retriever import GoogleFactCheckRetriever

logger = logging.getLogger(__name__)


class EvidenceAggregator:
    """
    Coordinates and aggregates evidence retrieval across:
    - Tavily Search API (Multi-query web retrieval)
    - NewsAPI (Curated journalism and publications)
    - Google Fact Check Tools API (Existing verified claims)
    """

    def __init__(
        self,
        tavily: Optional[TavilyRetriever] = None,
        newsapi: Optional[NewsApiRetriever] = None,
        factcheck: Optional[GoogleFactCheckRetriever] = None
    ):
        self.tavily = tavily or TavilyRetriever()
        self.newsapi = newsapi or NewsApiRetriever()
        self.factcheck = factcheck or GoogleFactCheckRetriever()

    async def aggregate_evidence(
        self,
        claim: str,
        max_total_evidence: int = 15
    ) -> Dict[str, Any]:
        """
        Executes parallel searches across all available providers,
        deduplicates sources by canonical URL, and prioritizes authoritative fact-checks.

        Returns:
            Dict containing:
                - evidence: List[EvidenceItem]
                - sources: List[str] (deduplicated URLs)
                - limitations: List[str]
                - providers_used: List[str]
        """
        tasks = [
            self.factcheck.retrieve_fact_checks(claim),
            self.tavily.retrieve_evidence(claim, max_results_per_query=4),
            self.newsapi.retrieve_news(claim, max_results=5)
        ]

        results = await asyncio.gather(*tasks, return_exceptions=True)

        factcheck_res, tavily_res, newsapi_res = results

        all_evidence: List[EvidenceItem] = []
        unique_sources: List[str] = []
        seen_urls = set()
        limitations: List[str] = []
        providers_used: List[str] = []

        # 1. Process Google Fact Check Results first (highest priority)
        if isinstance(factcheck_res, dict):
            if factcheck_res.get("is_available"):
                providers_used.append("Google Fact Check Tools")
                for item in factcheck_res.get("evidence", []):
                    c_url = normalize_url(item.url)
                    if c_url not in seen_urls:
                        seen_urls.add(c_url)
                        all_evidence.append(item)
                        unique_sources.append(item.url)
            elif factcheck_res.get("limitation"):
                limitations.append(factcheck_res["limitation"])

        # 2. Process Tavily Web Search Results
        if isinstance(tavily_res, dict):
            if tavily_res.get("is_available"):
                providers_used.append("Tavily Web Search")
                for item in tavily_res.get("evidence", []):
                    c_url = normalize_url(item.url)
                    if c_url not in seen_urls:
                        seen_urls.add(c_url)
                        all_evidence.append(item)
                        unique_sources.append(item.url)
            elif tavily_res.get("limitation"):
                limitations.append(tavily_res["limitation"])

        # 3. Process NewsAPI Results
        if isinstance(newsapi_res, dict):
            if newsapi_res.get("is_available"):
                providers_used.append("NewsAPI")
                for item in newsapi_res.get("evidence", []):
                    c_url = normalize_url(item.url)
                    if c_url not in seen_urls:
                        seen_urls.add(c_url)
                        all_evidence.append(item)
                        unique_sources.append(item.url)
            elif newsapi_res.get("limitation"):
                limitations.append(newsapi_res["limitation"])

        # Sort evidence by relevance_score descending (top authority first)
        all_evidence.sort(key=lambda x: x.relevance_score or 0.0, reverse=True)

        return {
            "evidence": all_evidence[:max_total_evidence],
            "sources": unique_sources[:max_total_evidence],
            "limitations": limitations,
            "providers_used": providers_used
        }
