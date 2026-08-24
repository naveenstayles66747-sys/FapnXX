import dns from 'dns';
import { promisify } from 'util';
import net from 'net';

const dnsLookup = promisify(dns.lookup);

/**
 * Checks if an IPv4 address is in a private/internal/reserved range
 */
export function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    return true; // Malformed -> treat as unsafe
  }

  const [a, b, c, d] = parts;

  // 0.0.0.0/8 (Current network)
  if (a === 0) return true;

  // 127.0.0.0/8 (Loopback / localhost)
  if (a === 127) return true;

  // 10.0.0.0/8 (Private Class A)
  if (a === 10) return true;

  // 172.16.0.0/12 (Private Class B: 172.16.0.0 - 172.31.255.255)
  if (a === 172 && b >= 16 && b <= 31) return true;

  // 192.168.0.0/16 (Private Class C)
  if (a === 192 && b === 168) return true;

  // 169.254.0.0/16 (Link-Local / Cloud Metadata 169.254.169.254)
  if (a === 169 && b === 254) return true;

  // 100.64.0.0/10 (Carrier Grade NAT)
  if (a === 100 && b >= 64 && b <= 127) return true;

  // 192.0.0.0/24 (IETF Protocol Assignments)
  if (a === 192 && b === 0 && c === 0) return true;

  // 192.0.2.0/24 (TEST-NET-1), 198.51.100.0/24 (TEST-NET-2), 203.0.113.0/24 (TEST-NET-3)
  if (a === 192 && b === 0 && c === 2) return true;
  if (a === 198 && b === 51 && c === 100) return true;
  if (a === 203 && b === 0 && c === 113) return true;

  // 198.18.0.0/15 (Network benchmark tests)
  if (a === 198 && (b === 18 || b === 19)) return true;

  // 224.0.0.0/4 (Multicast: 224.0.0.0 - 239.255.255.255)
  if (a >= 224 && a <= 239) return true;

  // 240.0.0.0/4 (Reserved)
  if (a >= 240) return true;

  // 255.255.255.255 (Broadcast)
  if (a === 255 && b === 255 && c === 255 && d === 255) return true;

  return false;
}

/**
 * Checks if an IPv6 address is in a private/internal/reserved range
 */
export function isPrivateIPv6(ip: string): boolean {
  const clean = ip.toLowerCase().trim();

  // IPv6 Loopback
  if (clean === '::1' || clean === '0:0:0:0:0:0:0:1') return true;

  // IPv6 Unspecified
  if (clean === '::' || clean === '0:0:0:0:0:0:0:0') return true;

  // IPv4-mapped IPv6 (e.g. ::ffff:127.0.0.1)
  if (clean.startsWith('::ffff:')) {
    const ipv4 = clean.substring(7);
    if (net.isIPv4(ipv4)) {
      return isPrivateIPv4(ipv4);
    }
    return true;
  }

  // Unique Local Address (fc00::/7 -> fc00... to fdff...)
  if (clean.startsWith('fc') || clean.startsWith('fd')) return true;

  // Link-Local Address (fe80::/10 -> fe80... to febf...)
  if (clean.startsWith('fe8') || clean.startsWith('fe9') || clean.startsWith('fea') || clean.startsWith('feb')) return true;

  // Site-Local (fec0::/10)
  if (clean.startsWith('fec') || clean.startsWith('fed') || clean.startsWith('fee') || clean.startsWith('fef')) return true;

  // Multicast (ff00::/8)
  if (clean.startsWith('ff')) return true;

  return false;
}

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  'metadata.google.internal',
  'metadata.internal',
  '169.254.169.254',
  'instance-data',
  'vault',
  'consul',
  'kubernetes.default.svc',
]);

const BLOCKED_SUFFIXES = [
  '.localhost',
  '.local',
  '.internal',
  '.lan',
  '.corp',
  '.home',
  '.intranet',
  '.arpa',
];

/**
 * Validates a target URL against SSRF attack vectors
 */
export async function validateSafeUrl(rawUrl: string): Promise<{ valid: boolean; error?: string; parsedUrl?: URL; ip?: string }> {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { valid: false, error: 'URL is required.' };
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { valid: false, error: 'Invalid URL format.' };
  }

  // 1. Enforce strict HTTP/HTTPS protocol
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { valid: false, error: `Unauthorized protocol '${parsed.protocol}'. Only HTTP and HTTPS are permitted.` };
  }

  const hostname = parsed.hostname.toLowerCase();

  // 2. Check blocked hostnames and suffixes
  if (BLOCKED_HOSTNAMES.has(hostname)) {
    return { valid: false, error: `Access to host '${hostname}' is strictly forbidden.` };
  }

  for (const suffix of BLOCKED_SUFFIXES) {
    if (hostname.endsWith(suffix)) {
      return { valid: false, error: `Access to internal domain ending in '${suffix}' is forbidden.` };
    }
  }

  // 3. If hostname is a direct IP address
  if (net.isIPv4(hostname)) {
    if (isPrivateIPv4(hostname)) {
      return { valid: false, error: `Access to private/internal IPv4 address '${hostname}' is strictly forbidden.` };
    }
    return { valid: true, parsedUrl: parsed, ip: hostname };
  }

  if (net.isIPv6(hostname)) {
    if (isPrivateIPv6(hostname)) {
      return { valid: false, error: `Access to private/internal IPv6 address '${hostname}' is strictly forbidden.` };
    }
    return { valid: true, parsedUrl: parsed, ip: hostname };
  }

  // 4. Perform DNS lookup to inspect resolved IP address
  try {
    const lookupResult = await dnsLookup(hostname, { all: true });
    if (!lookupResult || lookupResult.length === 0) {
      return { valid: false, error: `Could not resolve DNS for host '${hostname}'.` };
    }

    for (const record of lookupResult) {
      if (record.family === 4) {
        if (isPrivateIPv4(record.address)) {
          return {
            valid: false,
            error: `Resolved DNS address '${record.address}' for '${hostname}' belongs to a private/internal network.`,
          };
        }
      } else if (record.family === 6) {
        if (isPrivateIPv6(record.address)) {
          return {
            valid: false,
            error: `Resolved DNS IPv6 address '${record.address}' for '${hostname}' belongs to a private/internal network.`,
          };
        }
      }
    }

    return { valid: true, parsedUrl: parsed, ip: lookupResult[0].address };
  } catch (dnsErr: any) {
    return { valid: false, error: `DNS resolution failed for '${hostname}': ${dnsErr.message}` };
  }
}

export interface SafeFetchOptions {
  timeoutMs?: number;
  maxSizeBytes?: number;
  headers?: Record<string, string>;
  maxRedirects?: number;
}

/**
 * Fetches an external URL safely with SSRF protection, timeout, and response size limit
 */
export async function safeFetchHtml(
  rawUrl: string,
  options: SafeFetchOptions = {}
): Promise<{ ok: boolean; status: number; text: string; error?: string; finalUrl: string }> {
  const timeoutMs = options.timeoutMs ?? 5000; // 5s timeout default
  const maxSizeBytes = options.maxSizeBytes ?? 1024 * 1024; // 1 MB limit default
  const maxRedirects = options.maxRedirects ?? 3;

  let currentUrl = rawUrl;
  let redirectsCount = 0;

  while (redirectsCount <= maxRedirects) {
    const validation = await validateSafeUrl(currentUrl);
    if (!validation.valid || !validation.parsedUrl) {
      return {
        ok: false,
        status: 400,
        text: '',
        error: validation.error || 'URL failed SSRF security verification.',
        finalUrl: currentUrl,
      };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(validation.parsedUrl.toString(), {
        method: 'GET',
        headers: {
          'User-Agent': options.headers?.['User-Agent'] || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          ...(options.headers || {}),
        },
        redirect: 'manual', // Handle redirects manually to enforce SSRF validation at every hop
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle Redirects (301, 302, 303, 307, 308)
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get('location');
        if (!location) {
          return { ok: false, status: response.status, text: '', error: 'Redirect without Location header', finalUrl: currentUrl };
        }

        const nextUrl = new URL(location, currentUrl).toString();
        currentUrl = nextUrl;
        redirectsCount++;
        continue;
      }

      if (!response.ok) {
        return { ok: false, status: response.status, text: '', error: `HTTP error ${response.status}`, finalUrl: currentUrl };
      }

      // Check Content-Length header if present
      const contentLengthHeader = response.headers.get('content-length');
      if (contentLengthHeader) {
        const declaredSize = parseInt(contentLengthHeader, 10);
        if (declaredSize > maxSizeBytes) {
          return {
            ok: false,
            status: 413,
            text: '',
            error: `Response payload exceeds size limit of ${maxSizeBytes} bytes.`,
            finalUrl: currentUrl,
          };
        }
      }

      // Read response body with streaming size limiter
      const reader = response.body?.getReader();
      if (!reader) {
        const text = await response.text();
        return { ok: true, status: response.status, text: text.slice(0, maxSizeBytes), finalUrl: currentUrl };
      }

      let receivedBytes = 0;
      const chunks: Uint8Array[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        if (value) {
          receivedBytes += value.length;
          if (receivedBytes > maxSizeBytes) {
            reader.cancel();
            return {
              ok: false,
              status: 413,
              text: '',
              error: `Response payload stream exceeded max allowed limit of ${maxSizeBytes} bytes.`,
              finalUrl: currentUrl,
            };
          }
          chunks.push(value);
        }
      }

      const totalBuffer = new Uint8Array(receivedBytes);
      let offset = 0;
      for (const chunk of chunks) {
        totalBuffer.set(chunk, offset);
        offset += chunk.length;
      }

      const decoder = new TextDecoder('utf-8');
      const htmlText = decoder.decode(totalBuffer);

      return {
        ok: true,
        status: response.status,
        text: htmlText,
        finalUrl: currentUrl,
      };
    } catch (fetchErr: any) {
      clearTimeout(timeoutId);
      if (fetchErr.name === 'AbortError') {
        return {
          ok: false,
          status: 408,
          text: '',
          error: `Request timed out after ${timeoutMs}ms.`,
          finalUrl: currentUrl,
        };
      }
      return {
        ok: false,
        status: 500,
        text: '',
        error: `Network request error: ${fetchErr.message || fetchErr}`,
        finalUrl: currentUrl,
      };
    }
  }

  return {
    ok: false,
    status: 310,
    text: '',
    error: `Exceeded maximum redirect limit of ${maxRedirects}.`,
    finalUrl: currentUrl,
  };
}
