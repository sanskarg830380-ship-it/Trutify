import {
  parseResponse,
  getHealth,
  verifyClaim,
  verifyText,
  verifyFile,
  verifyUrl,
  getHistory,
  deleteHistory,
  API_BASE
} from '../src/services/api.js';

async function runServicesTests() {
  console.log('🧪 Starting Frontend Services & API Client Tests...\n');

  let passed = 0;
  let failed = 0;

  const assert = (condition, testName) => {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      failed++;
    }
  };

  try {
    // ----------------------------------------------------
    // Test 1: parseResponse JSON error extraction
    // ----------------------------------------------------
    console.log('--- Step 1: Testing Response Parsing & Error Interceptors ---');

    const mockErrorRes = {
      ok: false,
      status: 422,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: [{ path: 'claim', message: 'Claim must be at least 5 chars' }]
        }
      })
    };

    let caughtError = null;
    try {
      await parseResponse(mockErrorRes);
    } catch (e) {
      caughtError = e;
    }
    assert(
      caughtError && caughtError.message.includes('Claim must be at least 5 chars'),
      'parseResponse formats detailed validation errors without losing context'
    );
    assert(caughtError.status === 422, 'Attaches HTTP status to Error object');

    // ----------------------------------------------------
    // Test 2: parseResponse handles 504 / HTML without crashing
    // ----------------------------------------------------
    const mockGatewayTimeout = {
      ok: false,
      status: 504,
      headers: new Headers({ 'content-type': 'text/html' }),
      text: async () => '<html><body>504 Gateway Timeout</body></html>'
    };

    let caughtTimeout = null;
    try {
      await parseResponse(mockGatewayTimeout);
    } catch (e) {
      caughtTimeout = e;
    }
    assert(
      caughtTimeout && caughtTimeout.code === 'BACKEND_UNAVAILABLE',
      'parseResponse catches 504 Gateway Timeout and returns BACKEND_UNAVAILABLE code'
    );
    assert(
      caughtTimeout.message.includes('Node.js API Gateway is running'),
      'Provides user-friendly advice to start backend rather than throwing syntax error'
    );

    // ----------------------------------------------------
    // Test 3: verifyClaim API call
    // ----------------------------------------------------
    console.log('\n--- Step 2: Testing Multimodal API Functions ---');

    let capturedUrl = '';
    let capturedOptions = {};

    const mockFetch = async (url, options) => {
      capturedUrl = url;
      capturedOptions = options;
      return {
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ success: true, data: { verdict: 'VERIFIED', confidence: 95 } })
      };
    };

    const claimRes = await verifyClaim('Fusion reaction net gain', 'Physics news', mockFetch);
    assert(capturedUrl.endsWith('/api/verify/claim'), 'verifyClaim targets /api/verify/claim');
    assert(capturedOptions.method === 'POST', 'verifyClaim uses POST method');
    const claimBody = JSON.parse(capturedOptions.body);
    assert(claimBody.claim === 'Fusion reaction net gain', 'Serializes claim parameter');
    assert(claimBody.context === 'Physics news', 'Serializes context parameter');
    assert(claimRes.data?.verdict === 'VERIFIED', 'Returns verification result payload');

    // ----------------------------------------------------
    // Test 4: verifyText API call
    // ----------------------------------------------------
    const textRes = await verifyText('Article text content that is quite long', true, null, mockFetch);
    assert(capturedUrl.endsWith('/api/verify/text'), 'verifyText targets /api/verify/text');
    const textBody = JSON.parse(capturedOptions.body);
    assert(textBody.text === 'Article text content that is quite long', 'Serializes text input');
    assert(textBody.auto_verify === true, 'Serializes auto_verify flag');

    // ----------------------------------------------------
    // Test 5: verifyFile API call with FormData
    // ----------------------------------------------------
    const mockFile = new Blob(['sample pdf content'], { type: 'application/pdf' });
    mockFile.name = 'test-report.pdf';

    await verifyFile(mockFile, true, 'Report notes', mockFetch);
    assert(capturedUrl.endsWith('/api/verify/file'), 'verifyFile targets /api/verify/file');
    assert(capturedOptions.body instanceof FormData, 'verifyFile packages payload as multipart/form-data FormData');

    // ----------------------------------------------------
    // Test 6: verifyUrl API call
    // ----------------------------------------------------
    await verifyUrl('https://example.com/article', false, null, mockFetch);
    assert(capturedUrl.endsWith('/api/verify/url'), 'verifyUrl targets /api/verify/url');
    const urlBody = JSON.parse(capturedOptions.body);
    assert(urlBody.url === 'https://example.com/article', 'Serializes target URL');
    assert(urlBody.auto_verify === false, 'Serializes auto_verify option');

    // ----------------------------------------------------
    // Test 7: getHistory API call with query parameters
    // ----------------------------------------------------
    console.log('\n--- Step 3: Testing History Operations ---');

    await getHistory({ page: 2, limit: 15, verdict: 'FALSE', input_type: 'URL' }, mockFetch);
    assert(capturedUrl.includes('/api/history?'), 'getHistory targets /api/history with queries');
    assert(capturedUrl.includes('page=2'), 'Sets page parameter');
    assert(capturedUrl.includes('limit=15'), 'Sets limit parameter');
    assert(capturedUrl.includes('verdict=FALSE'), 'Sets verdict parameter');
    assert(capturedUrl.includes('input_type=URL'), 'Sets input_type parameter');

    // ----------------------------------------------------
    // Test 8: deleteHistory API call
    // ----------------------------------------------------
    await deleteHistory('rec_12345', mockFetch);
    assert(capturedUrl.endsWith('/api/history/rec_12345'), 'deleteHistory targets ID path');
    assert(capturedOptions.method === 'DELETE', 'deleteHistory uses DELETE method');

    // ----------------------------------------------------
    // Test 9: getHealth API call
    // ----------------------------------------------------
    console.log('\n--- Step 4: Testing Health Checks ---');

    await getHealth(mockFetch);
    assert(capturedUrl.endsWith('/api/health'), 'getHealth targets /api/health');
    assert(capturedOptions.method === 'GET', 'getHealth uses GET method');

  } catch (err) {
    console.error(`💥 Unexpected test failure: ${err.message}`, err);
    failed++;
  }

  console.log('\n====================================================');
  console.log(`📊 Frontend Services Test Summary: ${passed} passed, ${failed} failed`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runServicesTests();
