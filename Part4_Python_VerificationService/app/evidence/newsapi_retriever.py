import logging
from typing import List, Dict, Any, Optional
import httpx

from app.core.config import settings
from app.schemas.verification import EvidenceItem, EvidenceRelationship
from app.evidence.tavily_retriever import normalize_url, extract_domain

logger = logging.getLogger(__name__)


class NewsApiRetriever:
    """Async client for querying recent news coverage via NewsAPI."""

    API_ENDPOINT = "https://newsapi.org/v2/everything"

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key if api_key is not None else settings.NEWSAPI_KEY

    @property
    def is_available(self) -> bool:
        return bool(self.api_key and self.api_key != "your_newsapi_key_here")

    async def retrieve_news(
        self,
        query: str,
        max_results: int = 5,
        language: str = "en"
    ) -> Dict[str, Any]:
        """
        Searches recent news articles matching the query.

        Returns:
            Dict containing:
                - evidence: List[EvidenceItem]
                - sources: List[str]
                - is_available: bool
                - limitation: Optional[str]
        """
        if not self.is_available:
            return {
                "evidence": [],
                "sources": [],
                "is_available": False,
                "limitation": "NewsAPI key is not configured. Supplementary news article retrieval skipped."
            }

        # NewsAPI works best with concise keywords rather than 20-word complete sentences
        words = query.strip().split()
        api_query = " ".join(words[:8]) if len(words) > 8 else query

        params = {
            "q": api_query[:100],  # NewsAPI max query length recommended
            "sortBy": "publishedAt",  # Prioritize most recent coverage for latest news
            "pageSize": max_results,
            "language": language,
            "apiKey": self.api_key
        }

        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(self.API_ENDPOINT, params=params, timeout=10.0)

            if response.status_code == 200:
                data = response.json()
                articles = data.get("articles", [])
                evidence_items: List[EvidenceItem] = []
                sources: List[str] = []

                for art in articles:
                    raw_url = art.get("url", "").strip()
                    if not raw_url:
                        continue

                    # NewsAPI source object contains publisher name
                    source_name = art.get("source", {}).get("name") or extract_domain(raw_url)
                    title = art.get("title", "") or "Untitled News Article"
                    # Combine description and content for a fuller snippet
                    content_parts = [art.get("description") or "", art.get("content") or ""]
                    content = "\n".join([p for p in content_parts if p]).strip()

                    item = EvidenceItem(
                        source_name=source_name,
                        title=title,
                        url=raw_url,
                        published_date=art.get("publishedAt"),
                        content=content,
                        relevance_score=0.85,  # High baseline for curated journalism
                        evidence_relationship=EvidenceRelationship.NEUTRAL
                    )
                    evidence_items.append(item)
                    sources.append(raw_url)

                return {
                    "evidence": evidence_items,
                    "sources": sources,
                    "is_available": True,
                    "limitation": None
                }
            elif response.status_code == 401:
                return {
                    "evidence": [],
                    "sources": [],
                    "is_available": False,
                    "limitation": "NewsAPI key is invalid or unauthorized."
                }
            elif response.status_code == 429:
                return {
                    "evidence": [],
                    "sources": [],
                    "is_available": False,
                    "limitation": "NewsAPI request limit exceeded (rate limited)."
                }
            else:
                logger.warning(f"NewsAPI error {response.status_code}: {response.text}")
                return {
                    "evidence": [],
                    "sources": [],
                    "is_available": False,
                    "limitation": f"NewsAPI returned HTTP {response.status_code}."
                }
        except Exception as e:
            logger.error(f"Error querying NewsAPI: {e}")
            return {
                "evidence": [],
                "sources": [],
                "is_available": False,
                "limitation": f"Failed to connect to NewsAPI: {str(e)}"
            }
