# Trutify: Development & Learning Log

This log tracks every development phase, files created, architectural decisions, concepts learned, and verification tests performed.

---

## Phase 1: Architecture, Systems Design & Repository Foundation

- **Status**: COMPLETED
- **Date**: 2026-11-18
- **Goal**: Establish the microservice boundaries, folder layout, communication contracts, security baselines, and architectural blueprints for Trutify.

### Files Created:
- `trutify/README.md`: Project overview, features, microservices summary, and environment variables.
- `trutify/PROJECT_GUIDE.md`: Deep architectural documentation, lifecycle states, verdict matrix, and security policies.
- `trutify/DEVELOPMENT_LOG.md`: Running log of all engineering phases, tests, and learning checkpoints.
- Directory skeletons created:
  - `trutify/backend/node-backend/src/` (`config`, `controllers`, `routes`, `services`, `middleware`, `models`, `validators`, `utils`)
  - `trutify/backend/verification-service/app/` (`api`, `core`, `evidence`, `analysis`, `verdict`, `correction`, `schemas`, `utils`)

### Concepts & Technologies Covered:
1. **Two-Tier Microservices Architecture**: Decoupling the high-throughput I/O gateway (Node.js) from the compute- and search-heavy reasoning service (Python FastAPI).
2. **Strict Data Contracts**: How Pydantic in Python and Zod in Node.js eliminate runtime bugs and schema mismatches across services.
3. **SSRF (Server-Side Request Forgery) Prevention**: The necessity of validating URLs against private/loopback IP blocks before fetching third-party content.
4. **Prompt Injection Defense**: Treating evidence retrieved from the live web as untrusted strings rather than system instructions.

### Next Steps:
- **Phase 2**: Set up the Node.js + Express backend with environment configuration, CORS, Zod validation, error-handling middleware, and the baseline health check endpoint (`GET /api/health`).

---

## Phase 2: Node.js & Express API Gateway Foundation

- **Status**: COMPLETED
- **Date**: 2026-11-18
- **Goal**: Implement the core Express API Gateway with environment variable validation, HTTP security headers, CORS protection, centralized error handling, and health inspection.

### Files Created:
- `backend/node-backend/package.json`: ES modules configuration (`"type": "module"`), development and start scripts, dependency declarations.
- `backend/node-backend/.env.example`: Environment variable schema template.
- `backend/node-backend/.env`: Local development runtime configuration.
- `backend/node-backend/src/config/env.js`: Fail-fast environment variable parser and validator using Zod.
- `backend/node-backend/src/middleware/notFoundHandler.js`: Consistent 404 handler returning structured JSON (`ROUTE_NOT_FOUND`).
- `backend/node-backend/src/middleware/errorHandler.js`: Centralized error-handling middleware with JSON parse protection, Zod schema validation formatting, and production error masking.
- `backend/node-backend/src/controllers/healthController.js`: Healthcheck endpoint handler returning server status, uptime, and metadata.
- `backend/node-backend/src/routes/healthRoutes.js`: Express router mounting `/health`.
- `backend/node-backend/src/app.js`: Express application assembling Helmet, CORS, Morgan, JSON parsers, routes, and middleware.
- `backend/node-backend/src/server.js`: Server entrypoint with graceful shutdown handling for `SIGTERM` and `SIGINT`.
- `backend/node-backend/tests/health.test.js`: Automated integration test suite testing root, healthcheck, 404 handling, and malformed JSON handling.

### Technologies & Concepts Learned:
1. **Fail-Fast Environment Validation**: Validating critical configuration (ports, URLs, secrets) on server boot using Zod rather than discovering runtime errors mid-execution.
2. **Graceful Shutdown**: Intercepting process signals (`SIGTERM`, `SIGINT`) to close HTTP listeners cleanly, ensuring in-flight requests finish before process termination.
3. **Defense-in-Depth Middleware Pipeline**: Order of middleware execution (`helmet` -> `cors` -> `morgan` -> `json parser` -> `routes` -> `notFoundHandler` -> `errorHandler`).
4. **Resilient JSON Error Handling**: Intercepting malformed JSON payloads before unhandled SyntaxErrors can terminate the Node process.

### Test Results:
- Ran automated test suite `npm test` covering 10 assertion checkpoints.
- All 10 tests passed with 0 failures:
  - Root endpoint (`GET /`)
  - Healthcheck (`GET /api/health`)
  - 404 Route Not Found (`GET /api/non-existent-route`)
  - Malformed JSON handling (`POST /api/health` with corrupted JSON string)

### Next Steps:
- **Phase 3**: Set up the Python FastAPI Verification Service (`backend/verification-service`), configure Pydantic settings, establish virtual environment, create FastAPI application, and build `GET /health` with automated tests.

---

## Phase 3: Python FastAPI Verification Microservice Foundation

- **Status**: COMPLETED
- **Date**: 2026-11-18
- **Goal**: Implement the Python FastAPI microservice responsible for evidence gathering, verdict generation, and news corrections. Establish strict data contracts with Pydantic, configure CORS, and build `GET /health` and `POST /api/verify` baseline endpoints.

### Files Created:
- `backend/verification-service/requirements.txt`: Python package dependencies (FastAPI, Uvicorn, Pydantic, Pydantic-Settings, HTTPX, Python-Dotenv, Pytest).
- `backend/verification-service/.env.example`: Python service environment variables schema.
- `backend/verification-service/.env`: Local environment configuration.
- `backend/verification-service/app/__init__.py`: Package initialization.
- `backend/verification-service/app/core/config.py`: Centralized type-safe settings management using `pydantic-settings.BaseSettings`.
- `backend/verification-service/app/schemas/verification.py`: Strict Pydantic models: `VerdictEnum`, `EvidenceRelationship`, `EvidenceItem`, `ClaimRequest`, and `VerificationResponse`.
- `backend/verification-service/app/api/health.py`: Health inspection route returning service status, environment, and ISO timestamps.
- `backend/verification-service/app/api/verify.py`: Baseline `/api/verify` route accepting extracted claims, validating input, and returning structured verification payloads.
- `backend/verification-service/app/main.py`: Main FastAPI application mounting routers, OpenAPI documentation (`/docs`, `/redoc`), and CORS middleware.
- `backend/verification-service/tests/test_direct.py`: Comprehensive test runner covering root, health, valid claim verification, and Pydantic validation edge cases.

### Technologies & Concepts Learned:
1. **Pydantic Data Contracts**: Enforcing strict types and constraints (e.g. `min_length=5` on claims, `0 <= confidence <= 100`, enumerated verdicts) to guarantee data integrity between Node.js and Python.
2. **FastAPI & Starlette ASGI Pipeline**: High-performance asynchronous API architecture with automatic interactive OpenAPI / Swagger UI documentation generation.
3. **CORS on Internal Microservices**: Ensuring that while the Python service can communicate with Node.js, it is also protected against cross-origin browser abuse.
4. **Graceful Schema Validation (HTTP 422 vs 400)**: Understanding how FastAPI automatically surfaces detailed validation error breakdowns when incoming JSON violates Pydantic constraints.

### Test Results:
- Ran automated test suite `tests/test_direct.py` verifying 5 checkpoints:
  - Root endpoint (`GET /` -> 200 OK)
  - Health endpoint (`GET /health` -> 200 OK)
  - Verify endpoint with valid claim (`POST /api/verify` -> 200 OK, full schema verified)
  - Short claim validation rejection (`POST /api/verify` with `"hi"` -> 422 Unprocessable Entity)
  - Missing field validation rejection (`POST /api/verify` with `{}` -> 422 Unprocessable Entity)
- Result: 5 passed, 0 failed.

### Next Steps:
- **Phase 4**: Create and test end-to-end communication between the Node.js API Gateway and the Python FastAPI verification service over internal HTTP.

---

## Phase 4: Node.js ↔ Python Microservices Communication

- **Status**: COMPLETED
- **Date**: 2026-11-18
- **Goal**: Implement resilient inter-service communication between the Node.js API Gateway and the Python FastAPI Verification Service over internal HTTP, with timeout management, downtime circuit handling, Zod validation, and end-to-end integration tests.

### Files Created:
- `backend/node-backend/src/validators/claimValidator.js`: Zod schema validating incoming claims (`min_length: 5`, `max_length: 1500`, context sanitization) returning structured 422 errors.
- `backend/node-backend/src/services/pythonClient.js`: Resilient HTTP client for Python microservice communication with `AbortController` timeouts, connection failure handling, and health inspection.
- `backend/node-backend/src/controllers/verifyController.js`: Express controller coordinating claim verification requests between client and Python service.
- `backend/node-backend/src/routes/verifyRoutes.js`: Express router mounting `POST /api/verify/claim`.
- `backend/node-backend/tests/node_python_integration.test.js`: Comprehensive integration test suite covering offline degradation, service recovery, cross-service payload serialization, and validation rejections.

### Files Modified:
- `backend/node-backend/src/app.js`: Mounted `verifyRoutes` on `/api`.
- `backend/node-backend/src/controllers/healthController.js`: Enhanced healthcheck to probe and report downstream Python microservice connectivity status.
- `backend/node-backend/package.json`: Added `test:integration` script.

### Technologies & Concepts Learned:
1. **Microservice Resilience & Graceful Degradation**: Preventing cascading failures by catching downstream `ECONNREFUSED` and returning HTTP 503 (`SERVICE_UNAVAILABLE`) with structured diagnostics rather than crashing the gateway.
2. **Timeout Enforcements**: Using `AbortController` with explicit millisecond limits to prevent thread/connection starvation when backend AI reasoning services take long.
3. **Multi-Status Health Reporting (HTTP 207 vs 200)**: Returning HTTP 207 / Degraded state when auxiliary services are offline while keeping the primary API accessible.
4. **Pre-flight Validation Optimization**: Using Zod on the Node.js gateway to catch invalid or empty inputs early, avoiding unnecessary network hops to internal microservices.

### Test Results:
- Executed `npm run test:integration` covering 15 assertion checkpoints across 5 stages:
  1. Offline resilience: Healthcheck returned 207 Degraded; verify endpoint returned 503 `SERVICE_UNAVAILABLE`.
  2. Python FastAPI service auto-booted and reached readiness.
  3. Connected health: Node reported `pythonVerificationService: healthy` and returned HTTP 200.
  4. End-to-end flow: Dispatched claim through Node to Python, validated Pydantic schema return (`original_claim`, `UNVERIFIED` verdict, confidence score, evidence arrays), returned HTTP 200 to caller.
  5. Schema rejection: Short input rejected with 422 `VALIDATION_ERROR`.
- Result: 15 passed, 0 failed.

### Next Steps:
- **Phase 5**: Implement text input handling and AI-assisted claim extraction using the Google Gemini API.

---

## Phase 5: Text Input Ingestion & AI Claim Extraction (Gemini)

- **Status**: COMPLETED
- **Date**: 2026-11-18
- **Goal**: Implement raw text ingestion and AI-assisted claim extraction using the Google Gemini API. Support isolating verifiable factual claims from subjective opinions, extracting named entities, dates, locations, search keywords, and coordinating with the verification pipeline.

### Files Created:
- `backend/node-backend/src/validators/textValidator.js`: Zod schema validating incoming text verification requests (`min_length: 10`, `max_length: 25,000`, `auto_verify` boolean flag).
- `backend/node-backend/src/services/claimExtractor.js`: Gemini-powered NLP extraction service using `@google/genai` with strict prompt isolation, entity extraction, opinion filtering, and missing API key error diagnostics.
- `backend/node-backend/src/controllers/textVerifyController.js`: Controller orchestrating the claim extraction lifecycle, opinion fast-path exit, and primary claim dispatch to the Python verification microservice.
- `backend/node-backend/tests/text_claim_extraction.test.js`: Test suite covering Zod input validations, missing API key diagnostics, extraction contracts, and non-verifiable opinion handling.

### Files Modified:
- `backend/node-backend/package.json`: Installed `@google/genai` dependency and added `test:phase5` script.
- `backend/node-backend/src/routes/verifyRoutes.js`: Mounted `POST /api/verify/text`.

### Technologies & Concepts Learned:
1. **Factual Claim vs Opinion Filtering**: Directing LLMs to distinguish verifiable assertions (dates, figures, public events) from non-verifiable personal statements (feelings, tastes, greetings) to avoid wasting search quotas on non-factual inputs.
2. **Entity & Temporal Disambiguation**: Extracting named entities (people, organizations) and temporal anchors (dates, relative time words) as retrieval metadata.
3. **Structured JSON Mode with Gemini (`responseMimeType: 'application/json'`)**: Eliminating markdown formatting inconsistencies and guaranteeing parseable JSON from LLMs.
4. **Graceful Dependency Reporting**: Explaining missing credentials via `API_KEY_MISSING` (HTTP 503) rather than throwing cryptic crashes.

### Test Results:
- Executed `npm run test:phase5` covering 12 test assertions:
  - Short text input (< 10 chars) rejected with HTTP 422 `VALIDATION_ERROR`.
  - Missing text body rejected with HTTP 422.
  - Missing/unconfigured `GEMINI_API_KEY` returns clear HTTP 503 `API_KEY_MISSING`.
  - Claim extraction correctly captures `primary_claim`, `entities`, `dates`, and `search_keywords`.
  - Subjective opinions flagged with `has_verifiable_claims: false` and explanatory reason.
- Result: 12 passed, 0 failed.

### Next Steps:
- **Phase 6**: Implement multi-query evidence retrieval in Python using the Tavily Search API.

---

## Phase 6: Multi-Query Evidence Retrieval (Tavily API)

- **Status**: COMPLETED
- **Date**: 2026-11-18
- **Goal**: Implement multi-angle evidence retrieval using the Tavily Search API in Python. Generate direct, fact-check, and debunk search angles, execute concurrent async searches, strip URL tracking parameters, deduplicate sources, and enforce the `EvidenceItem` Pydantic data contract.

### Files Created:
- `backend/verification-service/app/evidence/__init__.py`: Evidence package initialization.
- `backend/verification-service/app/evidence/query_generator.py`: Generates diverse fact-checking search queries (direct claim, fact-check targeted, debunk/hoax counter-queries, entity core keywords).
- `backend/verification-service/app/evidence/tavily_retriever.py`: High-throughput async Tavily client with concurrent query execution (`asyncio.gather`), URL normalization (stripping `utm_*`, `fbclid`), domain extraction, canonical URL deduplication, and `EvidenceItem` mapping.
- `backend/verification-service/tests/test_tavily_retriever.py`: Automated test suite testing query formulation, URL normalization, deduplication, missing key detection, and verify route integration.

### Files Modified:
- `backend/verification-service/app/api/verify.py`: Integrated `TavilyRetriever` into `POST /api/verify` to retrieve live evidence and populate `sources` and `limitations`.
- `backend/node-backend/tests/health.test.js`: Updated health assertion to accommodate both standalone and multi-service decoupled states.

### Technologies & Concepts Learned:
1. **Multi-Query Triangulation**: Why searching once with raw claim text is insufficient: false claims must be queried against debunking keywords (`"hoax"`, `"debunked"`) and official fact-check portals to catch existing corrections.
2. **Canonical URL Deduplication**: Stripping tracking parameters (`utm_source`, `fbclid`, anchor fragments) and canonicalizing domains to prevent duplicate evidence from artificially skewing source counts.
3. **High-Concurrency Async Search (`httpx.AsyncClient` & `asyncio.gather`)**: Querying multiple search variations in parallel rather than sequentially, reducing network latency by 60-70%.
4. **Honest Source Attribution**: Ensuring every URL and evidence snippet originated strictly from verified search results, forbidding invented links.

### Test Results:
- Executed `tests/test_tavily_retriever.py` covering 6 test checkpoints:
  - Search term punctuation cleaning.
  - Multi-query generation (direct, fact-check, debunk angles).
  - Tracking tag removal & domain extraction.
  - Graceful handling of unconfigured `TAVILY_API_KEY`.
  - Canonical URL deduplication across multiple search results.
  - `POST /api/verify` integration returning valid `VerificationResponse` with sources.
- Result: 6 passed, 0 failed.

### Next Steps:
- **Phase 7**: Add NewsAPI and Google Fact Check Tools API integration as supplementary evidence providers alongside Tavily.

---

## Phase 7: NewsAPI & Google Fact Check Tools API Integration

- **Status**: COMPLETED
- **Date**: 2026-11-18
- **Goal**: Integrate NewsAPI for curated news journalism and Google Fact Check Tools API for accredited IFCN fact-checks into a unified, parallel evidence aggregation pipeline with cross-provider deduplication and authority prioritization.

### Files Created:
- `backend/verification-service/app/evidence/newsapi_retriever.py`: Async NewsAPI client searching curated journalism, extracting publisher domains, and handling rate limits (HTTP 429) and invalid keys.
- `backend/verification-service/app/evidence/factcheck_retriever.py`: Async Google Fact Check Tools client with textual rating classifier (`CONTRADICTS`, `SUPPORTS`, `CONTEXTUALIZES`, `NEUTRAL`) and high relevance score weighting (`0.98`).
- `backend/verification-service/app/evidence/evidence_aggregator.py`: Multi-source orchestrator executing parallel queries across Tavily, NewsAPI, and Fact Check Tools via `asyncio.gather`, canonical URL deduplication, and authority-first sorting.
- `backend/verification-service/tests/test_evidence_aggregator.py`: Comprehensive test suite verifying textual rating classifications, unconfigured credential limitations, cross-provider deduplication, and `POST /api/verify` responses.

### Files Modified:
- `backend/verification-service/app/api/verify.py`: Wired `EvidenceAggregator` as the primary evidence retrieval provider.

### Technologies & Concepts Learned:
1. **Triangulating Fact-Checks vs General Search**: Why accredited fact-check repositories (Snopes, Reuters, PolitiFact) provide direct ground truth (`textualRating: False`) that supersedes noisy general web content.
2. **Textual Rating Mapping**: Translating human editorial labels ("Pants on fire", "Misleading context", "Accurate") into standardized enum relationships (`CONTRADICTS`, `CONTEXTUALIZES`, `SUPPORTS`).
3. **Cross-Engine URL Deduplication**: Merging search outputs from 3 completely different APIs into a unified source list without duplicate entries.
4. **Authority-First Relevance Sorting**: Prioritizing established fact-checks and reputable news coverage at the head of the evidence array to optimize downstream LLM attention.

### Test Results:
- Executed `tests/test_evidence_aggregator.py` covering 4 checkpoints:
  - Fact-check rating classification.
  - Unconfigured API keys gracefully noted in limitations without crashing.
  - Multi-source aggregation with deduplication and Snopes priority sorting.
  - End-to-end `POST /api/verify` integration with multi-source metadata.
- Result: 4 passed, 0 failed.

### Next Steps:
- **Phase 8**: Implement evidence processing, source reliability scoring, and evidence relationship categorization.

---

## Phase 8: Source Credibility Evaluation & Evidence Categorization

- **Status**: COMPLETED
- **Date**: 2026-11-18
- **Goal**: Implement a 4-tier domain authority hierarchy and evidence processing engine that evaluates publisher credibility, detects contextual/refuting/supporting signals, and computes aggregate authority weights.

### Files Created:
- `backend/verification-service/app/analysis/source_evaluator.py`: 4-tier domain credibility scoring system (Tier 1: .gov, .edu, IFCN fact-checkers; Tier 2: mainstream news agencies; Tier 3: standard web; Tier 4: social/unverified media).
- `backend/verification-service/app/analysis/evidence_processor.py`: Evidence processor performing regex relationship classification (`CONTRADICTS`, `CONTEXTUALIZES`, `SUPPORTS`), authority-adjusted relevance formula `(0.4 * base) + (0.6 * auth)`, Tier 4 capping, and dominant direction resolution.
- `backend/verification-service/tests/test_evidence_analysis.py`: 4 unit tests verifying tier classification, snippet regex stance tagging, bucketing, and endpoint integration.

### Files Modified:
- `backend/verification-service/app/api/verify.py`: Integrated `EvidenceProcessor` into verification pipeline.

---

## Phase 9: AI Evidence Analysis & Verdict Generation Engine

- **Status**: COMPLETED
- **Date**: 2026-11-18
- **Goal**: Implement an AI-powered verdict generation engine utilizing Google Gemini with model fallbacks (`gemini-3.5-flash-lite`, `gemini-flash-lite-latest`, `gemini-3.8-flash`), injection-resistant evidence formatting, calibrated confidence scoring, structured JSON reasoning breakdown, and a rule-based deterministic fallback.

### Files Created:
- `backend/verification-service/app/verdict/__init__.py`: Package export for `VerdictEngine`.
- `backend/verification-service/app/verdict/verdict_engine.py`: Core reasoning engine querying Google Gemini REST endpoint with temperature 0.1, strict JSON schema output, prompt injection defense, and heuristic fallback.
- `backend/verification-service/tests/test_verdict_engine.py`: Test suite verifying prompt construction, rule-based fallback behavior across stance buckets, mock Gemini synthesis, and `/api/verify` contract adherence.

### Files Modified:
- `backend/verification-service/app/schemas/verification.py`: Added optional `metadata` field to `EvidenceItem`.
- `backend/verification-service/app/api/verify.py`: Wired `VerdictEngine` to replace the placeholder verdict with synthesized, evidence-backed verdicts.
- `backend/verification-service/tests/test_evidence_aggregator.py`: Updated assertion to check valid `VerdictEnum`.
- `backend/verification-service/tests/test_evidence_analysis.py`: Updated assertion to validate synthesized summary and verdict.
- `backend/node-backend/tests/text_claim_extraction.test.js`: Added graceful handling of live API key in environment.
- `backend/node-backend/tests/node_python_integration.test.js`: Handled dynamic verdicts from Python microservice.

### Technologies & Concepts Learned:
1. **Prompt Injection Defense in RAG**: Wrapping retrieved third-party text in labeled excerpt blocks and explicitly instructing the model to treat all external evidence as untrusted third-party quotes.
2. **Model Fallback Cascade**: Architecting fallback chains (`gemini-3.5-flash-lite` -> `gemini-flash-lite-latest` -> `gemini-3.8-flash`) to guarantee system availability during high demand spikes (HTTP 503).
3. **Deterministic Fallback (Graceful Degradation)**: Ensuring the verification microservice never fails completely if LLM quotas are exhausted; authority weights from Phase 8 automatically calculate a rule-based verdict.
4. **Calibrated Confidence Scoring**: Combining source tier weights, consensus ratio, and LLM certainty into an integer score (0-100).

### Test Results:
- Verification Service Pytest: 25 passed, 0 failed (100% pass rate).
- Verification Service Direct Tests: 5 passed, 0 failed.
- Node Backend Health Tests: 10 passed, 0 failed.
- Node Backend Phase 5 Tests: 12 passed, 0 failed.
- Node <-> Python Integration Tests: 15 passed, 0 failed.
- Total Active Automated Tests: 67 passed, 0 failed.

### Next Steps:
- **Phase 10**: Implement the News Correction Engine to formulate verified corrections and factual summaries for false or misleading claims.

---

## Phase 10: News Correction Engine

- **Status**: COMPLETED
- **Date**: 2026-11-18
- **Goal**: Implement the AI-powered News Correction Engine (`CorrectionEngine`) that analyzes debunked or distorted claims and generates an objective corrected headline, a cohesive factual news summary, and an itemized explanation of the specific misconceptions corrected.

### Files Created:
- `backend/verification-service/app/correction/__init__.py`: Package export for `CorrectionEngine`.
- `backend/verification-service/app/correction/correction_engine.py`: Factual rewrite engine with strict evidence-grounding instructions, Gemini REST caller (temperature 0.2), and deterministic template-based fallback.
- `backend/verification-service/tests/test_correction_engine.py`: Unit and integration test suite (7 tests) verifying fallback behavior across FALSE, MISLEADING, VERIFIED, and UNVERIFIED claims, prompt construction, mock Gemini parsing, and `/api/verify` payload adherence.

### Files Modified:
- `backend/verification-service/app/api/verify.py`: Wired `CorrectionEngine.generate_correction(...)` into the main verification pipeline, replacing null correction fields with synthesized journalistic corrections.

### Technologies & Concepts Learned:
1. **Journalistic AP Style Factual Rewrites**: Instructing the LLM to rewrite viral distortions into calm, neutral, objective news reports without sensationalism or scolding tone.
2. **Strict Evidence Grounding (Hallucination Prevention)**: Forbidding the model from inventing dates, institutions, or quotes; every factual assertion in `corrected_news` must trace directly back to retrieved evidence excerpts.
3. **Verdict-Tailored Correction Schema**:
   - `FALSE`: Debunking headline, 2-3 paragraph breakdown of the actual facts, and itemized list of disproven assertions.
   - `MISLEADING / PARTIALLY TRUE`: Clarification headline, context-restoring narrative, and itemized missing context.
   - `VERIFIED`: Affirmative headline, corroboration summary, and no-correction-needed confirmation.
   - `UNVERIFIED`: Null headline, caution narrative noting absence of corroboration, and limitation explanation.
4. **Deterministic Template Fallback**: Guaranteeing that even during severe API outages, users always receive structured, readable corrections derived from the verified evidence snippets.

### Test Results:
- Verification Service Pytest: 32 passed, 0 failed (100% pass rate).
- Verification Service Direct Tests: 5 passed, 0 failed.
- Node Backend Health Tests: 10 passed, 0 failed.
- Node Backend Phase 5 Tests: 12 passed, 0 failed.
- Node <-> Python Integration Tests: 15 passed, 0 failed.
- Total Active Automated Tests: 74 passed, 0 failed.

### Next Steps:
- **Phase 11**: MongoDB integration & verification history persistence in the Node.js API Gateway.

---

## Phase 11: MongoDB Integration & Verification History Persistence

- **Status**: COMPLETED
- **Date**: 2026-11-19
- **Goal**: Implement MongoDB Atlas integration, Mongoose schema modeling, automatic asynchronous verification persistence, non-blocking connection lifecycle with safe offline degradation, and paginated history browsing APIs.

### Files Created:
- `backend/node-backend/src/config/database.js`: Non-blocking Mongoose connection module with automatic reconnect, diagnostic logging for Atlas IP whitelist policies, connection state reporter, and graceful shutdown hook.
- `backend/node-backend/src/models/Verification.js`: Comprehensive Mongoose schema tracking original input, input type (`TEXT`, `CLAIM`, `IMAGE`, `PDF`, `URL`), extracted claims, primary claim, verdict, confidence (0-100), summary, explanation, categorized evidence arrays, correction outputs, sources, limitations, processing status (`RECEIVED` through `COMPLETED`/`FAILED`), and compound indexes for fast sorting and filtering.
- `backend/node-backend/src/services/historyService.js`: Safe persistence service encapsulating document creation, paginated queries with verdict and input-type filters, single-record lookup, and record deletion without crashing during database disconnections.
- `backend/node-backend/src/controllers/historyController.js`: History API controller implementing `GET /api/history` (paginated), `GET /api/history/:id`, and `DELETE /api/history/:id`.
- `backend/node-backend/src/routes/historyRoutes.js`: Express router mounting history endpoints.
- `backend/node-backend/tests/history.test.js`: Comprehensive test suite (21 assertions) verifying schema validation, invalid verdict rejection, safe offline degradation, paginated listing, query filtering, and 404 handling.

### Files Modified:
- `backend/node-backend/.env`: Fixed MongoDB Atlas URI by removing literal angle brackets `<>` and URL-encoding the password `@` character as `%40`, appending the dedicated `/trutify` database name.
- `backend/node-backend/src/app.js`: Mounted `/api/history` router.
- `backend/node-backend/src/server.js`: Initialized database connection on boot and wired graceful disconnect to `SIGTERM`/`SIGINT`.
- `backend/node-backend/src/controllers/healthController.js`: Added database connection state to `/api/health` dependency checks.
- `backend/node-backend/src/controllers/verifyController.js`: Wired automatic asynchronous persistence to MongoDB upon successful verification.
- `backend/node-backend/src/controllers/textVerifyController.js`: Wired automatic asynchronous persistence to MongoDB for text inputs.
- `backend/node-backend/package.json`: Added `test:phase11` script.

### Technologies & Concepts Learned:
1. **URI Encoding in Connection Strings**: Why special characters in database credentials (such as `@`) must be URL-encoded (`%40`) to prevent URI parser misinterpretations.
2. **Non-Blocking Database Booting & Graceful Degradation**: Preventing database network latency or IP whitelisting errors from blocking the Node.js Express process, allowing core verification features to continue running in memory.
3. **Compound Indexing in MongoDB**: Designing indexes on `{ createdAt: -1 }` and `{ verdict: 1, createdAt: -1 }` to optimize high-volume history listing and filtering queries.
4. **Lean Queries with Virtual Transformation**: Using Mongoose `.lean({ virtuals: true })` and JSON transform rules to map `_id` to `id` and remove internal `__v` metadata.

### Test Results:
- Node Backend History Tests (`npm run test:phase11`): 21 passed, 0 failed.
- Node Backend Health Tests (`npm test`): 10 passed, 0 failed.
- Node Backend Phase 5 Tests (`npm run test:phase5`): 12 passed, 0 failed.
- Node <-> Python Integration Tests (`npm run test:integration`): 15 passed, 0 failed.
- Verification Service Pytest: 32 passed, 0 failed.
- Verification Service Direct Tests: 5 passed, 0 failed.
- Total Active Automated Tests: 95 passed, 0 failed (100% pass rate).

### Next Steps:
- **Phase 12**: Image OCR & PDF document processing (Multer upload handling, Tesseract OCR for news screenshots, PDF text extraction).

---

## Phase 12: Image OCR & PDF Document Processing

- **Status**: COMPLETED
- **Date**: 2026-11-19
- **Goal**: Implement multimodal file ingestion handling images (JPEG, PNG, WebP, GIF) and PDF documents via Multer memory storage, Tesseract.js OCR with Gemini Vision fallback, digital PDF stream extraction via `pdf-parse`, and full pipeline integration into `POST /api/verify/file`.

### Files Created:
- `backend/node-backend/src/middleware/uploadMiddleware.js`: Multer memory storage configuration with 10MB file limit, MIME type whitelist, and custom error interceptor for `LIMIT_FILE_SIZE` and `UNSUPPORTED_FILE_TYPE`.
- `backend/node-backend/src/services/ocrService.js`: OCR service utilizing `tesseract.js` WebAssembly worker with automatic fallback to Gemini Multimodal Vision (`gemini-3.5-flash-lite`) for complex or stylized memes, plus text cleaning utilities.
- `backend/node-backend/src/services/pdfService.js`: PDF parser extracting text streams across single and multi-page documents, supporting both v1 and v2 `pdf-parse` signatures.
- `backend/node-backend/src/validators/fileValidator.js`: Validator ensuring a file was uploaded in `req.file` with optional `auto_verify` and `context` parameters.
- `backend/node-backend/src/controllers/fileVerifyController.js`: Controller orchestrating multimodal file ingestion $\rightarrow$ OCR/PDF text extraction $\rightarrow$ Gemini claim extraction $\rightarrow$ Python verification $\rightarrow$ MongoDB persistence.
- `backend/node-backend/tests/file_verification.test.js`: Integration test suite (16 assertions) covering text cleaners, PDF extraction, OCR bounds, upload middleware validation, unsupported MIME rejection, unextractable document detection, and end-to-end multimodal verification.

### Files Modified:
- `backend/node-backend/package.json`: Installed `multer`, `pdf-parse`, `tesseract.js`; added `test:phase12` script.
- `backend/node-backend/src/routes/verifyRoutes.js`: Mounted `POST /api/verify/file` with `uploadSingleFile('file')` and `validateFileUpload`.

### Technologies & Concepts Learned:
1. **Memory Storage vs Disk Buffers in Multer**: Storing incoming files in RAM buffers for immediate passing into Tesseract and PDF parsers without creating orphan files or disk I/O bottlenecks.
2. **Hybrid OCR (Tesseract + Multimodal LLM Vision)**: Combining fast local WASM OCR for standard text with Gemini Vision fallback for complex viral images, skewed memes, or handwritten content.
3. **Streamlined PDF Parsing Across Versions**: Supporting both function-based and class-based `pdf-parse` architectures while stripping document pagination artifacts.
4. **End-to-End Multimodal Pipeline**: Transforming an unstructured image or PDF into extracted text, isolating verifiable claims, evaluating evidence, generating corrections, and saving to MongoDB under `IMAGE` or `PDF` input types.

### Test Results:
- Node Backend File Verification Tests (`npm run test:phase12`): 16 passed, 0 failed.
- Node Backend History Tests (`npm run test:phase11`): 21 passed, 0 failed.
- Node Backend Health Tests (`npm test`): 10 passed, 0 failed.
- Node Backend Phase 5 Tests (`npm run test:phase5`): 12 passed, 0 failed.
- Node <-> Python Integration Tests (`npm run test:integration`): 15 passed, 0 failed.
- Verification Service Pytest: 32 passed, 0 failed.
- Verification Service Direct Tests: 5 passed, 0 failed.
- Total Active Automated Tests: 111 passed, 0 failed (100% pass rate).

### Next Steps:
- **Phase 13**: URL extraction with Server-Side Request Forgery (SSRF) protection and article parsing.

---

## Phase 13: URL Ingestion, SSRF Defense & News Article Scraping

- **Status**: COMPLETED
- **Date**: 2026-11-19
- **Goal**: Implement URL ingestion with multi-layered Server-Side Request Forgery (SSRF) defense, safe redirect handling, Cheerio-powered news article extraction, boilerplate cleaning, Gemini claim extraction, Python microservice verification dispatch, and MongoDB persistence under `input_type: 'URL'`.

### Files Created:
- `backend/node-backend/src/utils/ssrfGuard.js`: Comprehensive SSRF defense engine with IPv4 and IPv6 private/reserved IP detection (`127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.0.0/16` AWS metadata, carrier-grade NAT, multicast, `::1`, unique local `fc00::/7`, link-local `fe80::/10`, IPv4-mapped IPv6), hostname filtering, protocol whitelisting (HTTP/HTTPS only), embedded credentials rejection, and DNS pre-resolution checks to eliminate DNS rebinding bypasses.
- `backend/node-backend/src/services/urlScraperService.js`: Cheerio-based web article extraction service with safe redirect tracking (up to 3 hops with per-hop SSRF validation), 10s request timeouts, 5MB response size protection, Content-Type verification, boilerplate stripping (ads, scripts, styles, navs, footers, comments), and metadata extraction (title, site name, author, published date, clean text, word count).
- `backend/node-backend/src/validators/urlValidator.js`: Zod schema validator ensuring valid, fully qualified HTTP/HTTPS URLs.
- `backend/node-backend/src/controllers/urlVerifyController.js`: Full-pipeline controller orchestrating URL ingestion $\rightarrow$ SSRF guard $\rightarrow$ Cheerio scraping $\rightarrow$ Gemini claim extraction $\rightarrow$ Python verification $\rightarrow$ MongoDB history persistence.
- `backend/node-backend/tests/url_verification.test.js`: 46-assertion automated test suite covering private IP detection, SSRF protection, Cheerio scraping, Zod validation, controller HTTP 403 interception, and safe redirect handling.

### Files Modified:
- `backend/node-backend/package.json`: Added `test:phase13` script.
- `backend/node-backend/src/routes/verifyRoutes.js`: Mounted `POST /api/verify/url` with `validateUrlVerifyRequest`.

### Technologies & Concepts Learned:
1. **Multi-Layered SSRF Protection in Web Scrapers**: Combining protocol whitelisting, basic auth credential blocking, hostname filtering, and pre-fetch DNS resolution to prevent attacks against private cloud metadata (`169.254.169.254`) and internal services.
2. **Safe Redirect Traversal**: Manually intercepting 301/302/307 redirects to ensure every hop in the redirection chain is independently re-validated against SSRF before issuing the next fetch.
3. **Cheerio Boilerplate Cleaning**: Using CSS selector stripping to isolate main journalistic content from advertisements, cookie banners, navigation menus, and scripts.
4. **End-to-End Multimodal Ingestion Matrix**: Trutify now supports 4 distinct multimodal entry paths: raw claims (`/api/verify/claim`), long-form text (`/api/verify/text`), image/PDF documents (`/api/verify/file`), and web URLs (`/api/verify/url`).

### Test Results:
- Node Backend URL Verification Tests (`npm run test:phase13`): 46 passed, 0 failed.
- Total Active Automated Backend Tests: 157 passed, 0 failed (100% pass rate).

### Next Steps:
- **Phase 14**: Frontend Foundation (React/Next.js/Vite with Tailwind CSS), establishing UI components for multimodal verification (Text, Claim, File Upload, URL submission), results rendering, evidence cards, and verification history timeline.

---

## Phase 14: Modern Frontend Application Foundation (React + Vite + Tailwind CSS)

- **Status**: COMPLETED
- **Date**: 2026-11-19
- **Goal**: Build a modern, responsive, high-fidelity React frontend client for Trutify powered by Vite and Tailwind CSS. Support multimodal input ingestion (Claims, Raw Text, Image OCR / PDF uploads, SSRF-safe URLs), real-time animated verification pipeline tracking, high-impact verdict banners with confidence scoring, grounded news corrections display, categorized evidence cards, microservice health inspection, and a MongoDB verification history audit log.

### Files Created:
- `frontend/package.json`: Frontend package manifest with React 18, Vite 5, Lucide React, and Tailwind CSS.
- `frontend/vite.config.js`: Vite server and build configuration with API reverse proxy mapping `/api` to Node.js gateway `:5000`.
- `frontend/tailwind.config.js`: Tailwind configuration extended with Trutify brand palettes and verdict-specific color tokens (verified, false, misleading, partially true, unverified).
- `frontend/postcss.config.js`: PostCSS pipeline configuration for Tailwind and Autoprefixer.
- `frontend/index.html`: Modern HTML shell with Google Fonts (Plus Jakarta Sans & JetBrains Mono) and custom brand favicon.
- `frontend/src/index.css`: Tailwind base directives, custom sleek dark-mode scrollbars, and pulse-glow animations.
- `frontend/src/services/api.js`: Complete HTTP API client wrapping health checks, direct claim verification, long-form text analysis, image/PDF multipart uploads, URL verification, and paginated history operations.
- `frontend/src/components/Navbar.jsx`: Brand navigation header with live microservices health pill monitoring Node Gateway `:5000`, Python FastAPI Engine `:8000`, and MongoDB Atlas connection state.
- `frontend/src/components/MultimodalInput.jsx`: 4-tab multimodal verification input component with drag-and-drop file upload zone, image preview, SSRF indicators, optional background context, and 1-click preset test examples.
- `frontend/src/components/LoadingState.jsx`: Animated pipeline progress indicator showing stage-by-stage execution (`Preprocessing` $\rightarrow$ `Claim Extraction` $\rightarrow$ `Evidence Triangulation` $\rightarrow$ `Verdict Synthesis`).
- `frontend/src/components/VerificationResult.jsx`: Comprehensive fact-check result display with color-coded verdict banner, animated confidence gauge, AP-style grounded news correction box, AI reasoning breakdown, categorized evidence cards (supporting, refuting, contextual), and transparency notes.
- `frontend/src/components/HistoryView.jsx`: Audit log dashboard displaying persisted MongoDB verification records with verdict and input-type filters, pagination, and detail inspection.
- `frontend/src/App.jsx`: Main state orchestrator coordinating tabs, verification flows, error banners, and history drill-downs.
- `frontend/src/main.jsx`: React 18 application root entrypoint.

### Technologies & Concepts Learned:
1. **Multimodal User Interface Design**: Providing specialized, intuitive UI ergonomics for 4 drastically different input modalities (single-line claims, raw prose, files with preview, and web links) in a single unified cockpit.
2. **Asynchronous Progress Transparency**: Mitigating perceived latency of deep multi-source RAG search and AI reasoning through staged visual milestones.
3. **Journalistic Fact-Check Presentation**: Designing prominent, accessible presentation for corrected headlines and fact-based rewrites, clearly delineating official falsehoods from verified facts.
4. **Resilient Local Reverse Proxying**: Using Vite's dev server proxy to seamlessly route `/api` requests to Express on port 5000, preventing cross-origin CORS barriers in local development.

### Build Verification:
- Production bundle compiled with `vite build` in 2.20s:
  - `dist/index.html` (1.06 kB)
  - `dist/assets/index.css` (27.14 kB)
  - `dist/assets/index.js` (194.72 kB)
- Zero syntax, CSS, or import errors.

### Next Steps:
- **Phase 15**: End-to-End System Testing & User Experience Polish (running concurrent live requests across frontend, Node gateway, and Python reasoning microservice).
