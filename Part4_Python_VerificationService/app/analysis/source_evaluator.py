from typing import Dict, Any
from urllib.parse import urlparse


# Accredited Fact-Checking Organizations (IFCN Signatories)
FACT_CHECK_DOMAINS = {
    "snopes.com", "politifact.com", "factcheck.org", "fullfact.org",
    "leadstories.com", "checkyourfact.com", "climatefeedback.org",
    "healthfeedback.org", "afp.com", "reuters.com", "apnews.com",
    "boomlive.in", "altnews.in", "vishvasnews.com"
}

# Tier 2 Reputable Global Independent Journalism & Scientific Publishers
TIER_2_AUTHORITATIVE_DOMAINS = {
    "reuters.com", "apnews.com", "bbc.com", "bbc.co.uk", "afp.com",
    "theguardian.com", "nytimes.com", "washingtonpost.com", "wsj.com",
    "bloomberg.com", "nature.com", "science.org", "scientificamerican.com",
    "thelancet.com", "nejm.org", "npr.org", "aljazeera.com", "dw.com",
    "cnn.com", "nbcnews.com", "cbsnews.com", "abcnews.go.com", "cnbc.com",
    "thehindu.com", "hindustantimes.com", "indianexpress.com", "timesofindia.indiatimes.com",
    "france24.com", "ft.com", "usatoday.com", "techcrunch.com", "theverge.com",
    "wired.com", "axios.com", "politico.com", "news.sky.com", "independent.co.uk"
}

# Low-Trust / Social Media / User-Generated Content
LOW_TRUST_DOMAINS = {
    "twitter.com", "x.com", "facebook.com", "instagram.com", "tiktok.com",
    "reddit.com", "quora.com", "medium.com", "blogspot.com", "wordpress.com",
    "tumblr.com", "pinterest.com", "t.me", "telegram.org", "youtube.com"
}


def clean_domain(url: str) -> str:
    """Extracts base normalized domain from URL."""
    try:
        netloc = urlparse(url).netloc.lower()
        if netloc.startswith("www."):
            netloc = netloc[4:]
        return netloc or "unknown"
    except Exception:
        return "unknown"


def evaluate_source_authority(url: str) -> Dict[str, Any]:
    """
    Evaluates source credibility based on domain TLD, primary source indicators,
    journalistic reputation, and fact-checking credentials.

    Returns:
        Dict containing:
            - domain: str
            - tier: int (1 = Highest, 4 = Lowest)
            - authority_score: float (0.0 to 1.0)
            - is_fact_checker: bool
            - is_primary_source: bool
            - description: str
    """
    domain = clean_domain(url)
    url_lower = url.lower()

    # Rule 1: Official Government, Military, or International Public Health (.gov, .mil, who.int, nasa.gov)
    if (domain.endswith(".gov") or domain.endswith(".gov.in") or domain.endswith(".gov.uk") or
        domain in {"who.int", "nasa.gov", "un.org", "cdc.gov", "nih.gov"} or domain.endswith(".mil")):
        return {
            "domain": domain,
            "tier": 1,
            "authority_score": 0.98,
            "is_fact_checker": False,
            "is_primary_source": True,
            "description": "Official government, international agency, or primary institutional source."
        }

    # Rule 2: Accredited Academic & Scientific Research (.edu, .ac.uk, nature.com)
    if domain.endswith(".edu") or domain.endswith(".ac.uk") or domain in {"nature.com", "science.org", "thelancet.com"}:
        return {
            "domain": domain,
            "tier": 1,
            "authority_score": 0.95,
            "is_fact_checker": False,
            "is_primary_source": True,
            "description": "Peer-reviewed scientific or academic research institution."
        }

    # Rule 3: Accredited Fact-Checking Organizations or dedicated fact-check paths
    if domain in FACT_CHECK_DOMAINS and any(fc in url_lower for fc in ["fact-check", "factcheck", "claims", "reality-check"]):
        return {
            "domain": domain,
            "tier": 1,
            "authority_score": 0.96,
            "is_fact_checker": True,
            "is_primary_source": False,
            "description": "Accredited independent fact-checking review."
        }

    # Rule 4: Tier 2 Major Reputable Global Journalism Agencies
    if domain in TIER_2_AUTHORITATIVE_DOMAINS:
        return {
            "domain": domain,
            "tier": 2,
            "authority_score": 0.88,
            "is_fact_checker": False,
            "is_primary_source": False,
            "description": "Reputable international news agency or investigative publication."
        }

    # Rule 5: Low-Trust, Social Media, or User-Generated Content
    if domain in LOW_TRUST_DOMAINS:
        return {
            "domain": domain,
            "tier": 4,
            "authority_score": 0.30,
            "is_fact_checker": False,
            "is_primary_source": False,
            "description": "Social media or unverified user-generated platform."
        }

    # Rule 6: General Web & Regional News (Default Tier 3)
    return {
        "domain": domain,
        "tier": 3,
        "authority_score": 0.65,
        "is_fact_checker": False,
        "is_primary_source": False,
        "description": "General web publication or regional media outlet."
    }
