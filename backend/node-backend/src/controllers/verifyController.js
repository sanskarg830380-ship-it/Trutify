import { verifyClaimWithPythonService } from '../services/pythonClient.js';
import { saveVerification } from '../services/historyService.js';

export const verifyClaim = async (req, res, next) => {
  try {
    const { claim, context } = req.validatedBody;

    // Dispatch to Python FastAPI Evidence & Verification Service
    const verificationResult = await verifyClaimWithPythonService(claim, context);

    // Asynchronously persist verification record to MongoDB
    saveVerification({
      original_input: claim,
      input_type: 'CLAIM',
      primary_claim: claim,
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

    res.status(200).json({
      success: true,
      data: verificationResult
    });
  } catch (err) {
    next(err);
  }
};
