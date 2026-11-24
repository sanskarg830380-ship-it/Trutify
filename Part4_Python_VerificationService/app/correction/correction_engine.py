import logging
import json
from typing import List, Dict, Any, Optional
import httpx

from app.core.config import settings
from app.schemas.verification import EvidenceItem, VerdictEnum

logger = logging.getLogger(__name__)


class CorrectionEngine:
    """
    AI-powered news correction and factual rewrite engine.
    When a claim is determined to be FALSE, MISLEADING, or PARTIALLY TRUE,
    this engine generates an objective corrected headline, a factual news summary,
    and an itemized explanation of the misconceptions corrected.
    Includes a deterministic fallback if the LLM API is unavailable.
    """

    MODELS = [
        "gemini-2.5-flash",
        "gemini-2.0-flash",
        "gemini-1.5-flash",
        "gemini-2.5-flash-lite",
        "gemini-1.5-flash-8b",
        "gemini-3.5-flash-lite"
    ]
    GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key if api_key is not None else settings.GEMINI_API_KEY

    @property
    def is_available(self) -> bool:
        return bool(self.api_key and self.api_key != "your_gemini_api_key_here")

    def _build_prompt(
        self,
        claim: str,
        verdict: VerdictEnum,
        verdict_summary: str,
        verdict_explanation: str,
        supporting: List[EvidenceItem],
        contradicting: List[EvidenceItem],
        contextual: List[EvidenceItem]
    ) -> str:
        """Constructs a factual rewrite prompt grounded strictly in the retrieved evidence."""
        def format_excerpts(items: List[EvidenceItem], limit: int = 4) -> str:
            if not items:
                return "None."
            lines = []
            for idx, item in enumerate(items[:limit], 1):
                lines.append(
                    f"[{idx}] Source: {item.source_name}\n"
                    f"    Title: {item.title}\n"
                    f"    Fact: \"{item.content[:350]}\""
                )
            return "\n\n".join(lines)

        evidence_text = (
            f"--- DEBUNKING / CONTRADICTING SOURCES ---\n{format_excerpts(contradicting)}\n\n"
            f"--- CORROBORATING / SUPPORTING SOURCES ---\n{format_excerpts(supporting)}\n\n"
            f"--- CONTEXTUAL SOURCES ---\n{format_excerpts(contextual)}"
        )

        return f"""You are Trutify's Lead News Editor and Misinformation Correction Specialist.
Your task is to write an accurate, objective, journalistic correction for a verified claim.

=== ORIGINAL CLAIM ===
"{claim}"

=== VERDICT RENDERED ===
Verdict: {verdict.value}
Summary: {verdict_summary}
Explanation: {verdict_explanation}

=== RETRIEVED VERIFIED EVIDENCE ===
{evidence_text}

=== EDITORIAL RULES & INSTRUCTIONS ===
1. Truth Grounding: Base all statements ONLY on the verified evidence above. Never fabricate facts, dates, names, or quotes.
2. Tone: Objective, calm, authoritative, and non-judgmental (neutral journalistic AP style).
3. Requirements based on verdict:
   - For FALSE: Write a clear corrected headline debunking the claim, followed by 2-3 concise paragraphs explaining what the actual reality is and how the falsehood spread.
   - For MISLEADING / PARTIALLY TRUE: Clarify what specific details are accurate, what was omitted or taken out of context, and present the complete, accurate picture.
   - For VERIFIED: Provide a confirming headline, a 1-2 paragraph factual summary, and note that the claim is accurate.
   - For UNVERIFIED: Set corrected_headline to null, explain in corrected_news that external evidence is lacking, and caution readers about unconfirmed viral reports.
4. Output Format: Return ONLY a valid JSON object matching this schema:
{{
  "corrected_headline": "An accurate, factual, neutral headline (or null if UNVERIFIED)",
  "corrected_news": "A cohesive 2-3 paragraph objective article stating the true facts.",
  "correction_explanation": "Bullet-point style explanation highlighting specifically what was false, misleading, or omitted in the original claim."
}}"""

    async def _call_gemini(self, prompt: str) -> Optional[Dict[str, Any]]:
        """Invokes Gemini with fallback models to generate structured correction JSON."""
        if not self.is_available:
            logger.warning("Gemini API key is not configured for CorrectionEngine.")
            return None

        async with httpx.AsyncClient(timeout=25.0) as client:
            payload = {
                "contents": [
                    {
                        "parts": [{"text": prompt}]
                    }
                ],
                "generationConfig": {
                    "temperature": 0.2,
                    "response_mime_type": "application/json"
                }
            }

            for model in self.MODELS:
                url = f"{self.GEMINI_API_URL.format(model=model)}?key={self.api_key}"
                try:
                    logger.info(f"CorrectionEngine querying model '{model}'...")
                    response = await client.post(url, json=payload)

                    if response.status_code == 200:
                        data = response.json()
                        candidates = data.get("candidates", [])
                        if not candidates:
                            continue
                        parts = candidates[0].get("content", {}).get("parts", [])
                        if not parts:
                            continue
                        raw_text = parts[0].get("text", "").strip()
                        parsed = json.loads(raw_text)
                        return parsed
                    else:
                        logger.warning(
                            f"Model '{model}' failed with HTTP {response.status_code}: {response.text[:200]}"
                        )
                except json.JSONDecodeError as jde:
                    logger.error(f"Failed to decode correction JSON from model '{model}': {jde}")
                    continue
                except Exception as e:
                    logger.warning(f"Error querying model '{model}' for correction: {e}")
                    continue

        return None

    def _fallback_correction(
        self,
        claim: str,
        verdict: VerdictEnum,
        verdict_summary: str,
        supporting: List[EvidenceItem],
        contradicting: List[EvidenceItem],
        contextual: List[EvidenceItem]
    ) -> Dict[str, Optional[str]]:
        """
        Deterministic, rule-based fallback when Gemini API is unavailable or times out.
        Ensures the API contract is always satisfied without runtime crashes.
        """
        if verdict == VerdictEnum.FALSE:
            top_debunk = contradicting[0].source_name if contradicting else "Verified fact-checkers"
            headline = f"Fact Check: Reports Disprove Claim Regarding '{claim[:75]}...'"
            news = (
                f"Independent fact-checking investigations and reporting from {top_debunk} have "
                f"refuted the viral claim: \"{claim}\".\n\n"
                f"Primary evidence indicates that the assertions are unsupported by official documentation "
                f"or empirical records. {verdict_summary}"
            )
            explanation = (
                f"- The stated events or declarations did not occur according to primary sources.\n"
                f"- Refuting evidence from {top_debunk} confirms the claim is unfounded."
            )
        elif verdict in {VerdictEnum.MISLEADING, VerdictEnum.PARTIALLY_TRUE}:
            headline = f"Clarification: Understanding the Context Behind '{claim[:75]}...'"
            news = (
                f"Recent reporting on the claim \"{claim}\" requires critical context.\n\n"
                f"While certain elements of the statement reflect real developments, key details have been "
                f"omitted, exaggerated, or framed out of chronological sequence. {verdict_summary}"
            )
            explanation = (
                "- The original statement combined verified details with distorted or unconfirmed interpretations.\n"
                "- Critical chronological or institutional context was omitted."
            )
        elif verdict == VerdictEnum.VERIFIED:
            top_source = supporting[0].source_name if supporting else "Authoritative reports"
            headline = f"Verified: Documentation Confirms '{claim[:75]}...'"
            news = (
                f"Authoritative reporting and primary documentation from {top_source} corroborate the claim "
                f"that \"{claim}\".\n\n"
                f"{verdict_summary}"
            )
            explanation = "The claim accurately reflects documented facts and official statements without distortion."
        else:
            # UNVERIFIED
            headline = None
            news = (
                f"There is currently insufficient public evidence or official documentation to confirm or refute "
                f"the claim: \"{claim}\". Readers should exercise caution before sharing unverified claims."
            )
            explanation = "No accredited news agencies or verified fact-checking organizations have validated this assertion."

        return {
            "corrected_headline": headline,
            "corrected_news": news,
            "correction_explanation": explanation
        }

    async def generate_correction(
        self,
        claim: str,
        verdict: VerdictEnum,
        verdict_summary: str,
        verdict_explanation: str,
        supporting: List[EvidenceItem],
        contradicting: List[EvidenceItem],
        contextual: List[EvidenceItem]
    ) -> Dict[str, Optional[str]]:
        """
        Primary entrypoint for generating news corrections and factual explanations.
        Attempts Gemini AI synthesis first; falls back gracefully to deterministic templates.
        """
        # If unverified and no evidence at all, use immediate fallback without calling LLM
        if verdict == VerdictEnum.UNVERIFIED and not supporting and not contradicting and not contextual:
            return self._fallback_correction(
                claim=claim,
                verdict=verdict,
                verdict_summary=verdict_summary,
                supporting=supporting,
                contradicting=contradicting,
                contextual=contextual
            )

        prompt = self._build_prompt(
            claim=claim,
            verdict=verdict,
            verdict_summary=verdict_summary,
            verdict_explanation=verdict_explanation,
            supporting=supporting,
            contradicting=contradicting,
            contextual=contextual
        )

        ai_response = await self._call_gemini(prompt)

        if ai_response and isinstance(ai_response, dict):
            raw_headline = ai_response.get("corrected_headline")
            headline = str(raw_headline).strip() if raw_headline else None
            # For UNVERIFIED, headline should be None
            if verdict == VerdictEnum.UNVERIFIED or headline in {"null", "None", ""}:
                headline = None

            news = str(ai_response.get("corrected_news", "")).strip() or None
            explanation = str(ai_response.get("correction_explanation", "")).strip() or None

            return {
                "corrected_headline": headline,
                "corrected_news": news,
                "correction_explanation": explanation
            }

        # Fallback if Gemini unavailable or returned malformed data
        logger.info("Falling back to deterministic rule-based news correction.")
        return self._fallback_correction(
            claim=claim,
            verdict=verdict,
            verdict_summary=verdict_summary,
            supporting=supporting,
            contradicting=contradicting,
            contextual=contextual
        )
