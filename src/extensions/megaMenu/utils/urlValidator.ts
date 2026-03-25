/**
 * Validates URLs from untrusted sources (e.g., SharePoint list data) to prevent
 * XSS via javascript:/data:/vbscript: protocol injection and open redirect attacks.
 *
 * Security finding: S-02
 */

const ALLOWED_PROTOCOLS = new Set(['https:', 'http:']);

/**
 * Returns true if the URL is safe to render in an href attribute.
 * Allows relative paths and http(s) URLs only. Rejects javascript:, data:,
 * vbscript:, and all other protocol handlers.
 */
export function isValidNavigationUrl(url: string): boolean {
  if (typeof url !== 'string' || url.trim().length === 0) {
    return false;
  }

  const trimmed = url.trim();

  // Allow relative paths starting with / but not protocol-relative //
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return true;
  }

  // Allow fragment-only links
  if (trimmed.startsWith('#')) {
    return true;
  }

  try {
    const parsed = new URL(trimmed);
    return ALLOWED_PROTOCOLS.has(parsed.protocol);
  } catch {
    // If it can't be parsed as absolute URL, reject it.
    // This catches malformed URLs and bare protocol handlers like "javascript:..."
    // when the browser might interpret them differently.
    return false;
  }
}

/**
 * Returns the URL if valid, otherwise returns the fallback (default: '#').
 */
export function sanitizeNavigationUrl(url: string, fallback: string = '#'): string {
  return isValidNavigationUrl(url) ? url : fallback;
}
