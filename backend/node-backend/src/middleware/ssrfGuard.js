import dns from 'dns/promises';
import { URL } from 'url';

/**
 * Checks whether an IPv4 address belongs to a private, loopback, link-local,
 * or cloud metadata IP range.
 */
export const isPrivateOrInternalIPv4 = (ip) => {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(isNaN)) return true;

  const [p0, p1, p2, p3] = parts;

  // 0.0.0.0/8 - Current network
  if (p0 === 0) return true;

  // 127.0.0.0/8 - Loopback
  if (p0 === 127) return true;

  // 10.0.0.0/8 - Private Class A
  if (p0 === 10) return true;

  // 172.16.0.0/12 - Private Class B (172.16.0.0 - 172.31.255.255)
  if (p0 === 172 && p1 >= 16 && p1 <= 31) return true;

  // 192.168.0.0/16 - Private Class C
  if (p0 === 192 && p1 === 168) return true;

  // 169.254.0.0/16 - Link-Local / Cloud Provider Metadata (e.g., 169.254.169.254)
  if (p0 === 169 && p1 === 254) return true;

  // 100.64.0.0/10 - Carrier-Grade NAT
  if (p0 === 100 && p1 >= 64 && p1 <= 127) return true;

  // 192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24 - Documentation (TEST-NET)
  if (p0 === 192 && p1 === 0 && p2 === 2) return true;
  if (p0 === 198 && p1 === 51 && p2 === 100) return true;
  if (p0 === 203 && p1 === 0 && p2 === 113) return true;

  // 224.0.0.0/4 - Multicast
  if (p0 >= 224 && p0 <= 239) return true;

  // 240.0.0.0/4 - Reserved
  if (p0 >= 240) return true;

  return false;
};

/**
 * Checks whether an IPv6 address belongs to a private, loopback, or local block.
 */
export const isPrivateOrInternalIPv6 = (ip) => {
  const normalized = ip.toLowerCase();

  // ::1 - Loopback
  if (normalized === '::1' || normalized === '0:0:0:0:0:0:0:1') return true;

  // :: - Unspecified
  if (normalized === '::' || normalized === '0:0:0:0:0:0:0:0') return true;

  // IPv4-mapped IPv6 (e.g. ::ffff:127.0.0.1 or ::ffff:7f00:1)
  if (normalized.startsWith('::ffff:')) {
    const v4Part = normalized.replace('::ffff:', '');
    if (v4Part.includes('.')) {
      return isPrivateOrInternalIPv4(v4Part);
    }
    return true;
  }

  // fc00::/7 - Unique Local Addresses (ULA)
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;

  // fe80::/10 - Link-Local Unicast
  if (normalized.startsWith('fe8') || normalized.startsWith('fe9') ||
      normalized.startsWith('fea') || normalized.startsWith('feb')) {
    return true;
  }

  return false;
};

/**
 * Validates a target URL against SSRF vulnerabilities:
 * - Ensures scheme is strictly http or https
 * - Disallows localhost, internal domains, and octal/hex IP notations
 * - Resolves hostname via DNS and checks all resulting IPs against private/internal blocks
 */
export const validateSafeUrl = async (rawUrl) => {
  let parsedUrl;
  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    return {
      isSafe: false,
      reason: 'Invalid URL format.',
      code: 'INVALID_URL_FORMAT'
    };
  }

  // 1. Strict Protocol Validation
  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    return {
      isSafe: false,
      reason: `Forbidden URL scheme '${parsedUrl.protocol}'. Only http and https are allowed.`,
      code: 'FORBIDDEN_SCHEME'
    };
  }

  const hostname = parsedUrl.hostname.toLowerCase();

  // 2. Reject obvious loopback strings
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal') ||
    hostname === '0.0.0.0' ||
    hostname === '127.0.0.1' ||
    hostname === '::1'
  ) {
    return {
      isSafe: false,
      reason: `Access to local network target '${hostname}' is prohibited.`,
      code: 'SSRF_BLOCKED'
    };
  }

  // 3. Reject non-standard IP representations (e.g. integer or octal forms like 2130706433 or 0177.0.0.1)
  if (/^0x[0-9a-f]+$/i.test(hostname) || /^\d+$/.test(hostname)) {
    return {
      isSafe: false,
      reason: 'Numeric/integer IP representations are prohibited.',
      code: 'SSRF_BLOCKED'
    };
  }

  // 4. If hostname is already a direct IPv4 literal, validate directly
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
    if (isPrivateOrInternalIPv4(hostname)) {
      return {
        isSafe: false,
        reason: `Target IP '${hostname}' belongs to a private/internal network.`,
        code: 'SSRF_BLOCKED'
      };
    }
  }

  // 5. DNS Resolution & IP Inspection
  try {
    const addresses = await dns.lookup(hostname, { all: true });
    if (!addresses || addresses.length === 0) {
      return {
        isSafe: false,
        reason: `Could not resolve hostname '${hostname}'.`,
        code: 'DNS_RESOLUTION_FAILED'
      };
    }

    for (const record of addresses) {
      const isUnsafe =
        record.family === 6
          ? isPrivateOrInternalIPv6(record.address)
          : isPrivateOrInternalIPv4(record.address);

      if (isUnsafe) {
        return {
          isSafe: false,
          reason: `Resolved IP '${record.address}' belongs to a private or restricted network.`,
          code: 'SSRF_BLOCKED',
          resolvedIp: record.address
        };
      }
    }

    return {
      isSafe: true,
      url: parsedUrl,
      resolvedIp: addresses[0].address
    };
  } catch (err) {
    return {
      isSafe: false,
      reason: `DNS lookup failed for '${hostname}': ${err.message}`,
      code: 'DNS_RESOLUTION_FAILED'
    };
  }
};

/**
 * Express middleware performing SSRF safety check on req.body.url.
 */
export const ssrfGuardMiddleware = async (req, res, next) => {
  const urlToCheck = req.body?.url;
  if (!urlToCheck) {
    return next();
  }

  const check = await validateSafeUrl(urlToCheck);
  if (!check.isSafe) {
    return res.status(403).json({
      success: false,
      error: {
        message: `Security Warning: ${check.reason}`,
        code: check.code || 'SSRF_BLOCKED',
        details: { target: urlToCheck, resolvedIp: check.resolvedIp || null }
      }
    });
  }

  req.safeUrl = check.url;
  next();
};
