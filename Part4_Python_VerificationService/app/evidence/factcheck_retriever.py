import logging
from typing import List, Dict, Any, Optional
import httpx

from app.core.config import settings
from app.schemas.verification import EvidenceItem, EvidenceRelationship
from app.evidence.tavily_retriever import extract_domain

logger = logging.getLogger(__name__)


def map_textual_rating_to_relationship(rating: str) -> EvidenceRelationship:
    """Classifies an established fact-checker's verdict rating into an EvidenceRelationship."""
    r = rating.lower()
    # Check nuanced/contextual/mixed ratings first
    if any(ctx in r for ctx in ["misleading", "partly", "half", "mixture", "context", "exaggerated", "distorted"]):
        return EvidenceRelationship.CONTEXTUALIZES
    elif any(neg in r for neg in ["false", "pants on fire", "incorrect", "hoax", "fake", "disproven", "untrue"]):
        return EvidenceRelationship.CONTRADICTS
    elif any(pos in r for pos in ["true", "correct", "accurate", "confirmed", "verified"]):
        return EvidenceRelationship.SUPPORTS
    return EvidenceRelationship.NEUTRAL


class GoogleFactCheckRetriever:
    """Async client for querying accredited fact-check reviews via Google Fact Check Tools API."""

    API_ENDPOINT = "https://factchecktools.googleapis.com/v1alpha1/claims:search"

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key if api_key is not None else settings.GOOGLE_FACT_CHECK_API_KEY

    @property
    def is_available(self) -> bool:
        return bool(self.api_key and self.api_key != "your_google_fact_check_key_here")

    async def retrieve_fact_checks(
        self,
        query: str,
        language_code: str = "en"
    ) -> Dict[str, Any]:
        """
        Searches existing fact-checks conducted by IFCN (International Fact-Checking Network) signatories.

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
                "limitation": "Google Fact Check Tools API key is not configured. Existing fact-check database search skipped."
            }

        params = {
            "query": query,
            "languageCode": language_code,
            "key": self.api_key
        }

        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(self.API_ENDPOINT, params=params, timeout=10.0)

            if response.status_code == 200:
                data = response.json()
                claims = data.get("claims", [])
                evidence_items: List[EvidenceItem] = []
                sources: List[str] = []

                for c in claims:
                    claim_text = c.get("text", "")
                    claimant = c.get("claimant")
                    reviews = c.get("claimReview", [])

                    for review in reviews:
                        raw_url = review.get("url", "").strip()
                        if not raw_url:
                            continue

                        publisher = review.get("publisher", {}).get("name") or extract_domain(raw_url)
                        title = review.get("title") or f"Fact Check by {publisher}"
                        rating = review.get("textualRating", "Reviewed")

                        relationship = map_textual_rating_to_relationship(rating)

                        content_summary = (
                            f"Accredited Fact Check by {publisher}. "
                            f"Evaluated Claim: '{claim_text}' (Claimant: {claimant or 'Public'}). "
                            f"Official Rating: {rating}."
                        )

                        item = EvidenceItem(
                            source_name=publisher,
                            title=title,
                            url=raw_url,
                            published_date=review.get("reviewDate"),
                            content=content_summary,
                            relevance_score=0.98,  # Established fact-checks are given top authority
                            evidence_relationship=relationship
                        )
                        evidence_items.append(item)
                        sources.append(raw_url)

                return {
                    "evidence": evidence_items,
                    "sources": sources,
                    "is_available": True,
                    "limitation": None
                }
            elif response.status_code == 400:
                return {
                    "evidence": [],
                    "sources": [],
                    "is_available": False,
                    "limitation": "Invalid query or parameters for Google Fact Check API."
                }
            elif response.status_code == 403:
                return {
                    "evidence": [],
                    "sources": [],
                    "is_available": False,
                    "limitation": "Google Fact Check Tools API key is invalid or lacks required permissions."
                }
            else:
                logger.warning(f"Google Fact Check API error {response.status_code}: {response.text}")
                return {
                    "evidence": [],
                    "sources": [],
                    "is_available": False,
                    "limitation": f"Google Fact Check API returned HTTP {response.status_code}."
                }
        except Exception as e:
            logger.error(f"Error querying Google Fact Check API: {e}")
            return {
                "evidence": [],
                "sources": [],
                "is_available": False,
                "limitation": f"Failed to connect to Google Fact Check API: {str(e)}"
            }
