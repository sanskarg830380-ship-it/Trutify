// Base API route. Can be overridden with VITE_API_BASE_URL (e.g. 'http://localhost:5000/api')
const getApiBase = () => {
  try {
    if (typeof window !== 'undefined' && window.__VITE_API_URL__) {
      return window.__VITE_API_URL__.replace(/\/$/, '') + '/api';
    }
    if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) {
      return import.meta.env.VITE_API_URL.replace(/\/$/, '') + '/api';
    }
  } catch {
    // Fallback if import.meta is not defined
  }
  return '/api';
};

export const API_BASE = getApiBase();

/**
 * Resiliently parses HTTP responses, extracting descriptive error messages from JSON payloads,
 * handling HTML/502/504 proxy errors gracefully, and avoiding JSON parse crashes.
 */
export async function parseResponse(res, defaultErrorMsg = 'Request failed') {
  const contentType = (res.headers.get('content-type') || '').toLowerCase();
  let jsonBody = null;

  if (contentType.includes('application/json')) {
    try {
      jsonBody = await res.json();
    } catch {
      jsonBody = null;
    }
  }

  if (!res.ok) {
    // 1. If backend returned a structured error payload
    if (jsonBody?.error) {
      const mainMsg = jsonBody.error.message || defaultErrorMsg;
      const detailMsg = jsonBody.error.details?.[0]?.message;
      const fullMsg = detailMsg ? `${mainMsg} (${detailMsg})` : mainMsg;
      const error = new Error(fullMsg);
      error.code = jsonBody.error.code || 'API_ERROR';
      error.status = res.status;
      error.details = jsonBody.error.details;
      throw error;
    }

    // 2. Gateway/Proxy error when backend is offline
    if (res.status === 502 || res.status === 504 || res.status === 503) {
      const error = new Error(
        `Backend service unavailable (HTTP ${res.status}). Please make sure the Node.js API Gateway is running on http://localhost:5000.`
      );
      error.code = 'BACKEND_UNAVAILABLE';
      error.status = res.status;
      throw error;
    }

    // 3. Fallback to text body or status code
    let textBody = '';
    if (!jsonBody) {
      try {
        textBody = await res.text();
      } catch {
        textBody = '';
      }
    }

    const error = new Error(
      textBody && textBody.length < 200 ? textBody : `${defaultErrorMsg} (HTTP ${res.status})`
    );
    error.status = res.status;
    throw error;
  }

  return jsonBody;
}

/**
 * Executes a network fetch with connection error interceptors and response parsing.
 */
async function safeFetch(url, options = {}, defaultErrorMsg = 'Request failed', customFetch = null) {
  const fetchImpl = customFetch || fetch;
  let res;
  try {
    res = await fetchImpl(url, options);
  } catch (netErr) {
    const error = new Error(
      `Cannot connect to Trutify backend server at "${url}". Ensure the Node.js API Gateway is running on port 8000. (${netErr.message})`
    );
    error.code = 'NETWORK_ERROR';
    throw error;
  }
  return parseResponse(res, defaultErrorMsg);
}

/**
 * Checks system health and downstream service connectivity.
 */
export async function getHealth(customFetch = null) {
  return safeFetch(`${API_BASE}/health`, { method: 'GET' }, 'Health check failed', customFetch);
}

/**
 * Submits a direct factual claim for multi-source verification.
 */
export async function verifyClaim(claim, context = null, customFetch = null) {
  return safeFetch(
    `${API_BASE}/verify/claim`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ claim, context: context || undefined })
    },
    'Claim verification request failed',
    customFetch
  );
}

/**
 * Submits long-form text for Gemini claim extraction and verification.
 */
export async function verifyText(text, auto_verify = true, context = null, customFetch = null) {
  return safeFetch(
    `${API_BASE}/verify/text`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, auto_verify, context: context || undefined })
    },
    'Text verification request failed',
    customFetch
  );
}

/**
 * Uploads an image or PDF for OCR text extraction and verification.
 */
export async function verifyFile(file, auto_verify = true, context = null, customFetch = null) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('auto_verify', String(auto_verify));
  if (context) formData.append('context', context);

  return safeFetch(
    `${API_BASE}/verify/file`,
    {
      method: 'POST',
      body: formData
    },
    'File verification request failed',
    customFetch
  );
}

/**
 * Submits a web article URL for SSRF-protected scraping and verification.
 */
export async function verifyUrl(url, auto_verify = true, context = null, customFetch = null) {
  return safeFetch(
    `${API_BASE}/verify/url`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, auto_verify, context: context || undefined })
    },
    'URL verification request failed',
    customFetch
  );
}

/**
 * Retrieves paginated verification history with optional filters.
 */
export async function getHistory({ page = 1, limit = 10, verdict = null, input_type = null } = {}, customFetch = null) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (verdict) params.append('verdict', verdict);
  if (input_type) params.append('input_type', input_type);

  return safeFetch(`${API_BASE}/history?${params.toString()}`, { method: 'GET' }, 'Failed to retrieve history', customFetch);
}

/**
 * Deletes a single history document by ID.
 */
export async function deleteHistory(id, customFetch = null) {
  return safeFetch(`${API_BASE}/history/${id}`, { method: 'DELETE' }, 'Failed to delete history record', customFetch);
}
