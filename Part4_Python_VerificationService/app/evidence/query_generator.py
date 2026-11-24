import re
from typing import List


def clean_search_term(text: str) -> str:
    """Removes punctuation and extra whitespace for cleaner search queries."""
    cleaned = re.sub(r'[^\w\s-]', ' ', text)
    return " ".join(cleaned.split())


def generate_search_queries(claim: str, max_queries: int = 4) -> List[str]:
    """
    Generates diverse search queries from a factual claim to discover
    direct reporting, alternative wording, existing fact-checks, and debunking evidence.

    Args:
        claim: The normalized claim string.
        max_queries: Maximum number of search queries to return.

    Returns:
        List of optimized search query strings.
    """
    cleaned_claim = clean_search_term(claim)
    words = cleaned_claim.split()

    queries = []

    # 1. Direct claim query
    queries.append(cleaned_claim)

    # 2. Fact-check targeted query (to catch debunks or IFCN fact checks)
    queries.append(f"{cleaned_claim} fact check")

    # 3. Debunk / contradiction query (critical for detecting hoaxes and fabricated claims)
    queries.append(f"{cleaned_claim} hoax debunked")

    # 4. Latest news reporting / entity query for breaking news coverage
    if len(words) > 4:
        core_keywords = " ".join(words[:min(len(words), 8)])
        queries.append(f"{core_keywords} latest news")
    else:
        queries.append(f"{cleaned_claim} news")

    # 5. Additional news fallback
    queries.append(f"{cleaned_claim} news")

    # Deduplicate while preserving order
    seen = set()
    unique_queries = []
    for q in queries:
        q_norm = q.lower().strip()
        if q_norm not in seen:
            seen.add(q_norm)
            unique_queries.append(q)

    return unique_queries[:max_queries]

