import { extractClaimsFromText } from '../services/claimExtractor.js';
import { verifyClaimWithPythonService } from '../services/pythonClient.js';
import { saveVerification } from '../services/historyService.js';

export const verifyText = async (req, res, next) => {
  try {
    const { text, auto_verify = true, context = null } = req.validatedBody;

    // Stage 1: Claim Extraction via Gemini
    const extractionResult = await extractClaimsFromText(text);

    // If input has no verifiable claims (opinions, feelings, non-factual chat)
    if (!extractionResult.has_verifiable_claims) {
      return res.status(200).json({
        success: true,
        stage: 'EXTRACTING_CLAIMS',
        is_verifiable: false,
        message: 'No verifiable factual claims detected in the submitted text.',
        reason: extractionResult.reason_if_not_verifiable,
        extraction: extractionResult
      });
    }

    // If caller only requested claim extraction without auto-verification
    if (!auto_verify) {
      return res.status(200).json({
        success: true,
        stage: 'EXTRACTING_CLAIMS',
        is_verifiable: true,
        extraction: extractionResult
      });
    }

    // Stage 2: Dispatch Primary Claim to Python Verification Service
    const verificationResult = await verifyClaimWithPythonService(
      extractionResult.primary_claim,
      context || text
    );

    // Asynchronously persist verification record to MongoDB
    saveVerification({
      original_input: text,
      input_type: 'TEXT',
      extracted_text: text,
      extracted_claims: extractionResult.all_claims || [],
      primary_claim: extractionResult.primary_claim,
      verdict: verificationResult.verdict,
      confidence: verificationResult.confidence,
      summary: verificationResult.summary,
      explanation: verificationResult.explanation,
      supporting_evidence: verificationResult.supporting_evidence || [],
      contradicting_evidence: verificationResult.contradicting_evidence || [],
      contextual_evidence: verificationResult.contextual_evidence || [],
      corrected_headline: verificationResult.corrected_headline || null,
      corrected_news: verificationResult.corrected_news || null,
      correction_explanation: verificationResult.correction_explanation || null,
      sources: verificationResult.sources || [],
      limitations: verificationResult.limitations || [],
      processing_status: 'COMPLETED'
    }).catch((err) => console.warn(`History save warning: ${err.message}`));

    return res.status(200).json({
      success: true,
      stage: 'COMPLETED',
      is_verifiable: true,
      extraction: extractionResult,
      verification: verificationResult
    });
  } catch (err) {
    next(err);
  }
};
