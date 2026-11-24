import { extractTextFromImage } from '../services/ocrService.js';
import { extractTextFromPdf } from '../services/pdfService.js';
import { extractClaimsFromText } from '../services/claimExtractor.js';
import { verifyClaimWithPythonService } from '../services/pythonClient.js';
import { saveVerification } from '../services/historyService.js';

/**
 * Controller handling multimodal verification of uploaded images and PDF documents.
 */
export const verifyFile = async (req, res, next) => {
  try {
    const file = req.file;
    const { auto_verify = true, context = null } = req.validatedFileOptions;

    const isPdf = file.mimetype === 'application/pdf';
    let extractionMeta = {};
    let extractedText = '';

    // Stage 1: Multimodal Text Extraction (OCR / PDF Parser)
    if (isPdf) {
      const pdfResult = await extractTextFromPdf(file.buffer);
      extractedText = pdfResult.text;
      extractionMeta = {
        type: 'pdf',
        pages: pdfResult.num_pages,
        info: pdfResult.info
      };
    } else {
      const ocrResult = await extractTextFromImage(file.buffer, file.mimetype);
      extractedText = ocrResult.text;
      extractionMeta = {
        type: 'image',
        engine: ocrResult.engine_used,
        confidence: ocrResult.confidence
      };
    }

    // Check if extracted text is too sparse or empty
    if (!extractedText || extractedText.length < 10) {
      return res.status(422).json({
        success: false,
        error: {
          message:
            'Could not extract sufficient readable text from the uploaded file. ' +
            'Ensure the image or PDF is legible and not completely blank or blurry.',
          code: 'UNEXTRACTABLE_TEXT',
          details: {
            charactersExtracted: extractedText ? extractedText.length : 0,
            fileMimeType: file.mimetype
          }
        }
      });
    }

    // Stage 2: Claim Extraction via Gemini
    const claimExtraction = await extractClaimsFromText(extractedText);

    // If no verifiable factual claims were found in the document
    if (!claimExtraction.has_verifiable_claims) {
      return res.status(200).json({
        success: true,
        stage: 'EXTRACTING_CLAIMS',
        is_verifiable: false,
        message: 'No verifiable factual claims detected in the uploaded document.',
        reason: claimExtraction.reason_if_not_verifiable,
        file: {
          original_name: file.originalname,
          mimetype: file.mimetype,
          size_bytes: file.size,
          extraction_meta: extractionMeta
        },
        extracted_text: extractedText,
        extraction: claimExtraction
      });
    }

    // If caller requested extraction only without auto-verification
    if (!auto_verify) {
      return res.status(200).json({
        success: true,
        stage: 'EXTRACTING_CLAIMS',
        is_verifiable: true,
        file: {
          original_name: file.originalname,
          mimetype: file.mimetype,
          size_bytes: file.size,
          extraction_meta: extractionMeta
        },
        extracted_text: extractedText,
        extraction: claimExtraction
      });
    }

    // Stage 3: Dispatch Primary Claim to Python Verification Microservice
    const verificationResult = await verifyClaimWithPythonService(
      claimExtraction.primary_claim,
      context || extractedText
    );

    // Stage 4: Asynchronously Persist to MongoDB
    saveVerification({
      original_input: file.originalname,
      input_type: isPdf ? 'PDF' : 'IMAGE',
      extracted_text: extractedText,
      extracted_claims: claimExtraction.all_claims || [],
      primary_claim: claimExtraction.primary_claim,
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
      file: {
        original_name: file.originalname,
        mimetype: file.mimetype,
        size_bytes: file.size,
        extraction_meta: extractionMeta
      },
      extracted_text: extractedText,
      extraction: claimExtraction,
      verification: verificationResult
    });
  } catch (err) {
    next(err);
  }
};