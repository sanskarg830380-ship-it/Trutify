import asyncio
import logging
from typing import List, Dict, Any, Optional
from urllib.parse import urlparse, urlunparse, parse_qsl, urlencode
import httpx

from app.core.config import settings
from app.schemas.verification import EvidenceItem, EvidenceRelationship
from app.evidence.query_generator import generate_search_queries

logger = logging.getLogger(__name__)


def normalize_url(url: str) -> str:
    """Strips tracking query parameters (utm_*, ref, etc.) and www prefix to deduplicate URLs."""
    try:
        parsed = urlparse(url)
        clean_netloc = parsed.netloc.lower()
        if clean_netloc.startswith('www.'):
            clean_netloc = clean_netloc[4:]

        # Filter out tracking parameters
        clean_query = [
            (k, v) for k, v in parse_qsl(parsed.query)
            if not k.startswith('utm_') and k not in {'fbclid', 'gclid', 'ref', 'source'}
        ]
        return urlunparse((
            parsed.scheme.lower(),
            clean_netloc,
            parsed.path.rstrip('/'),
            parsed.params,
            urlencode(clean_query),
            ''  # remove fragments
        ))
    except Exception:
        return url.strip().lower()


def extract_domain(url: str) -> str:
    """Extracts a clean publisher domain name from a URL."""
    try:
        netloc = urlparse(url).netloc.lower()
        if netloc.startswith('www.'):
            netloc = netloc[4:]
        return netloc or "Web Source"
    except Exception:
        return "Web Source"


class TavilyRetriever:
    """Async evidence retrieval client for Tavily Search API."""

    API_ENDPOINT = "https://api.tavily.com/search"

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key if api_key is not None else settings.TAVILY_API_KEY

    @property
    def is_available(self) -> bool:
        return bool(self.api_key and self.api_key != "your_tavily_api_key_here")

    async def _execute_single_query(
        self,
        client: httpx.AsyncClient,
        query: str,
        max_results: int = 5
    ) -> List[Dict[str, Any]]:
        """Executes a single search query against Tavily API."""
        payload = {
            "api_key": self.api_key,
            "query": query,
            "search_depth": "advanced",
            "include_answer": False,
            "max_results": max_results
        }
        try:
            response = await client.post(self.API_ENDPOINT, json=payload, timeout=12.0)
            if response.status_code == 200:
                data = response.json()
                return data.get("results", [])
            else:
                logger.warning(f"Tavily query '{query}' failed with HTTP {response.status_code}: {response.text}")
                return []
        except Exception as e:
            logger.error(f"Error querying Tavily for '{query}': {e}")
            return []

    async def retrieve_evidence(
        self,
        claim: str,
        max_results_per_query: int = 4,
        max_total_evidence: int = 10,
        custom_queries: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Retrieves, normalizes, and deduplicates evidence for a claim across multiple query variations.

        Returns:
            Dict containing:
                - evidence: List[EvidenceItem]
                - sources: List[str] (deduplicated URLs)
                - queries_used: List[str]
                - is_available: bool
                - limitation: Optional[str]
        """
        if not self.is_available:
            return {
                "evidence": [],
                "sources": [],
                "queries_used": [],
                "is_available": False,
                "limitation": "Tavily Search API key is not configured. Live web evidence retrieval skipped."
            }

        queries = custom_queries or generate_search_queries(claim, max_queries=3)
        seen_urls = set()
        deduplicated_evidence: List[EvidenceItem] = []
        unique_source_urls: List[str] = []

        async with httpx.AsyncClient() as client:
            tasks = [
                self._execute_single_query(client, q, max_results=max_results_per_query)
                for q in queries
            ]
            results_nested = await asyncio.gather(*tasks, return_exceptions=True)

        for raw_results in results_nested:
            if isinstance(raw_results, Exception) or not isinstance(raw_results, list):
                continue

            for item in raw_results:
                raw_url = item.get("url", "").strip()
                if not raw_url:
                    continue

                canonical_url = normalize_url(raw_url)
                if canonical_url in seen_urls:
                    continue

                seen_urls.add(canonical_url)
                unique_source_urls.append(raw_url)

                title = item.get("title", "").strip() or "Untitled Web Source"
                content = item.get("content", "").strip()
                score = item.get("score")
                pub_date = item.get("published_date")

                evidence_item = EvidenceItem(
                    source_name=extract_domain(raw_url),
                    title=title,
                    url=raw_url,
                    published_date=str(pub_date) if pub_date else None,
                    content=content,
                    relevance_score=float(score) if score is not None else None,
                    evidence_relationship=EvidenceRelationship.NEUTRAL
                )
                deduplicated_evidence.append(evidence_item)

                if len(deduplicated_evidence) >= max_total_evidence:
                    break

            if len(deduplicated_evidence) >= max_total_evidence:
                break

        return {
            "evidence": deduplicated_evidence,
            "sources": unique_source_urls,
            "queries_used": queries,
            "is_available": True,
            "limitation": None
        }

