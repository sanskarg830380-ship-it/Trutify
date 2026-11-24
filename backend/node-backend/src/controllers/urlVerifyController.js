import { scrapeArticleFromUrl } from '../services/urlScraperService.js';
import { extractClaimsFromText } from '../services/claimExtractor.js';
import { verifyClaimWithPythonService } from '../services/pythonClient.js';
import { saveVerification } from '../services/historyService.js';

/**
 * Controller handling news article URL ingestion, SSRF-safe scraping,
 * claim extraction, and end-to-end verification.
 */
export const verifyUrl = async (req, res, next) => {
  try {
    const { url, auto_verify = true, context = null } = req.validatedBody;

    // Stage 1: Safe Article Fetching & Extraction (with SSRF Guard)
    let article;
    try {
      article = await scrapeArticleFromUrl(url);
    } catch (scrapeErr) {
      const isSsrf = [
        'SSRF_BLOCKED',
        'FORBIDDEN_PROTOCOL',
        'SSRF_CREDENTIALS_DISALLOWED'
      ].includes(scrapeErr.code);

      const status = isSsrf ? 403 : 422;
      return res.status(status).json({
        success: false,
        error: {
          code: scrapeErr.code || 'URL_SCRAPE_FAILED',
          message: scrapeErr.message,
          target_url: url
        }
      });
    }

    // Check if readable article text was discovered
    if (!article.text || article.text.length < 15) {
      return res.status(422).json({
        success: false,
        error: {
          code: 'UNEXTRACTABLE_ARTICLE',
          message:
            'Could not extract sufficient readable text from the provided URL. ' +
            'The target page may be behind a paywall, require JavaScript to render, or contain no body text.',
          article_metadata: {
            title: article.title,
            site_name: article.site_name,
            characters_extracted: article.text ? article.text.length : 0
          }
        }
      });
    }

    // Stage 2: Claim Extraction via Google Gemini
    const textToAnalyze = article.title
      ? `Article Title: ${article.title}\n\n${article.text}`
      : article.text;

    const claimExtraction = await extractClaimsFromText(textToAnalyze);

    const articleInfo = {
      url: article.url,
      title: article.title,
      site_name: article.site_name,
      author: article.author,
      published_date: article.published_date,
      word_count: article.word_count
    };

    // If no verifiable factual claims were found (opinion piece, personal blog, lifestyle)
    if (!claimExtraction.has_verifiable_claims) {
      return res.status(200).json({
        success: true,
        stage: 'EXTRACTING_CLAIMS',
        is_verifiable: false,
        message: 'No verifiable factual claims detected in the scraped article.',
        reason: claimExtraction.reason_if_not_verifiable,
        article: articleInfo,
        extracted_text: article.text,
        extraction: claimExtraction
      });
    }

    // If client requested extraction only without auto-verification
    if (!auto_verify) {
      return res.status(200).json({
        success: true,
        stage: 'EXTRACTING_CLAIMS',
        is_verifiable: true,
        article: articleInfo,
        extracted_text: article.text,
        extraction: claimExtraction
      });
    }

    // Stage 3: Dispatch Primary Claim to Python Verification Microservice
    const verificationContext = context || (article.title ? `Title: ${article.title}` : null);
    const verificationResult = await verifyClaimWithPythonService(
      claimExtraction.primary_claim,
      verificationContext
    );

    // Asynchronously persist verification record to MongoDB
    saveVerification({
      original_input: url,
      input_type: 'URL',
      extracted_text: article.text,
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
      article: articleInfo,
      extracted_text: article.text,
      extraction: claimExtraction,
      verification: verificationResult
    });
  } catch (err) {
    next(err);
  }
};
