import { Router } from 'express';
import { verifyClaim } from '../controllers/verifyController.js';
import { verifyText } from '../controllers/textVerifyController.js';
import { verifyFile } from '../controllers/fileVerifyController.js';
import { verifyUrl } from '../controllers/urlVerifyController.js';
import { validateClaimRequest } from '../validators/claimValidator.js';
import { validateTextVerifyRequest } from '../validators/textValidator.js';
import { validateUrlVerifyRequest } from '../validators/urlValidator.js';
import { uploadSingleFile } from '../middleware/uploadMiddleware.js';
import { validateFileUpload } from '../validators/fileValidator.js';

const router = Router();

// Direct claim verification (supports both /verify and /verify/claim)
router.post('/verify', validateClaimRequest, verifyClaim);
router.post('/verify/claim', validateClaimRequest, verifyClaim);

// Raw text ingestion & AI claim extraction workflow
router.post('/verify/text', validateTextVerifyRequest, verifyText);

// Multimodal file ingestion (Image OCR / PDF Document Parsing)
router.post('/verify/file', uploadSingleFile('file'), validateFileUpload, verifyFile);

// URL ingestion & article scraping with SSRF guard
router.post('/verify/url', validateUrlVerifyRequest, verifyUrl);

export default router;
