/**
 * URL Validation Utility
 *
 * Provides reusable URL validation and parsing functions.
 * Extracted from duplicate implementations across validation files.
 *
 * @module urlValidation
 */

/**
 * URL validation result
 */
export interface UrlValidationResult {
  valid: boolean;
  error?: string;
  url?: URL;
}

/**
 * URL validation options
 */
export interface UrlValidationOptions {
  /** Allowed protocols (default: ['http:', 'https:']) */
  allowedProtocols?: string[];
  /** Require HTTPS (default: false) */
  requireHttps?: boolean;
  /** Allowed domains (whitelist) */
  allowedDomains?: string[];
  /** Blocked domains (blacklist) */
  blockedDomains?: string[];
  /** Require domain to be present (default: true) */
  requireDomain?: boolean;
  /** Allow localhost (default: false) */
  allowLocalhost?: boolean;
  /** Allow IP addresses (default: false) */
  allowIpAddress?: boolean;
}

/**
 * Validate URL string
 *
 * @param url - URL string to validate
 * @returns True if valid URL
 *
 * @example
 * ```typescript
 * validateUrl('https://example.com') // true
 * validateUrl('not a url') // false
 * ```
 */
export function validateUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Validate URL with options
 *
 * @param url - URL string to validate
 * @param options - Validation options
 * @returns Validation result
 *
 * @example
 * ```typescript
 * const result = validateUrlWithOptions('https://example.com', {
 *   requireHttps: true,
 *   allowedDomains: ['example.com', 'test.com']
 * });
 *
 * if (!result.valid) {
 *   console.error(result.error);
 * }
 * ```
 */
export function validateUrlWithOptions(
  url: string,
  options: UrlValidationOptions = {}
): UrlValidationResult {
  const {
    allowedProtocols = ['http:', 'https:'],
    requireHttps = false,
    allowedDomains,
    blockedDomains,
    requireDomain = true,
    allowLocalhost = false,
    allowIpAddress = false,
  } = options;

  // Try to parse URL
  let urlObj: URL;
  try {
    urlObj = new URL(url);
  } catch {
    return {
      valid: false,
      error: 'Invalid URL format',
    };
  }

  // Check protocol
  if (!allowedProtocols.includes(urlObj.protocol)) {
    return {
      valid: false,
      error: `Protocol must be one of: ${allowedProtocols.join(', ')}`,
      url: urlObj,
    };
  }

  // Check HTTPS requirement
  if (requireHttps && urlObj.protocol !== 'https:') {
    return {
      valid: false,
      error: 'URL must use HTTPS',
      url: urlObj,
    };
  }

  // Check domain requirement
  if (requireDomain && !urlObj.hostname) {
    return {
      valid: false,
      error: 'URL must have a domain',
      url: urlObj,
    };
  }

  // Check localhost
  if (!allowLocalhost && isLocalhost(urlObj.hostname)) {
    return {
      valid: false,
      error: 'Localhost URLs are not allowed',
      url: urlObj,
    };
  }

  // Check IP address
  if (!allowIpAddress && isIpAddress(urlObj.hostname)) {
    return {
      valid: false,
      error: 'IP address URLs are not allowed',
      url: urlObj,
    };
  }

  // Check allowed domains
  if (allowedDomains && allowedDomains.length > 0) {
    const isAllowed = allowedDomains.some(domain =>
      urlObj.hostname === domain || urlObj.hostname.endsWith(`.${domain}`)
    );
    if (!isAllowed) {
      return {
        valid: false,
        error: `Domain must be one of: ${allowedDomains.join(', ')}`,
        url: urlObj,
      };
    }
  }

  // Check blocked domains
  if (blockedDomains && blockedDomains.length > 0) {
    const isBlocked = blockedDomains.some(domain =>
      urlObj.hostname === domain || urlObj.hostname.endsWith(`.${domain}`)
    );
    if (isBlocked) {
      return {
        valid: false,
        error: 'This domain is not allowed',
        url: urlObj,
      };
    }
  }

  return {
    valid: true,
    url: urlObj,
  };
}

/**
 * Check if hostname is localhost
 *
 * @param hostname - Hostname to check
 * @returns True if localhost
 */
export function isLocalhost(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('10.') ||
    hostname.startsWith('172.16.')
  );
}

/**
 * Check if hostname is an IP address
 *
 * @param hostname - Hostname to check
 * @returns True if IP address
 */
export function isIpAddress(hostname: string): boolean {
  // IPv4
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipv4Regex.test(hostname)) {
    return true;
  }

  // IPv6
  const ipv6Regex = /^([0-9a-f]{0,4}:){2,7}[0-9a-f]{0,4}$/i;
  if (ipv6Regex.test(hostname)) {
    return true;
  }

  return false;
}

/**
 * Normalize URL
 *
 * Removes trailing slashes, normalizes protocol, etc.
 *
 * @param url - URL to normalize
 * @returns Normalized URL string
 *
 * @example
 * ```typescript
 * normalizeUrl('https://example.com/') // "https://example.com"
 * normalizeUrl('HTTP://EXAMPLE.COM') // "http://example.com"
 * ```
 */
export function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    let normalized = `${urlObj.protocol}//${urlObj.hostname}`;

    if (urlObj.port) {
      normalized += `:${urlObj.port}`;
    }

    normalized += urlObj.pathname.replace(/\/$/, '') || '/';

    if (urlObj.search) {
      normalized += urlObj.search;
    }

    return normalized;
  } catch {
    return url;
  }
}

/**
 * Extract domain from URL
 *
 * @param url - URL string
 * @returns Domain or null if invalid
 *
 * @example
 * ```typescript
 * extractDomain('https://example.com/path') // "example.com"
 * extractDomain('https://subdomain.example.com') // "subdomain.example.com"
 * ```
 */
export function extractDomain(url: string): string | null {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return null;
  }
}

/**
 * Extract root domain from URL
 *
 * @param url - URL string
 * @returns Root domain or null if invalid
 *
 * @example
 * ```typescript
 * extractRootDomain('https://subdomain.example.com') // "example.com"
 * extractRootDomain('https://example.co.uk') // "co.uk"
 * ```
 */
export function extractRootDomain(url: string): string | null {
  const domain = extractDomain(url);
  if (!domain) return null;

  const parts = domain.split('.');
  if (parts.length <= 2) return domain;

  // Handle common second-level domains
  const secondLevelTlds = ['co', 'com', 'gov', 'net', 'org', 'edu'];
  if (parts.length >= 3 && secondLevelTlds.includes(parts[parts.length - 2])) {
    return parts.slice(-3).join('.');
  }

  return parts.slice(-2).join('.');
}

/**
 * Add protocol to URL if missing
 *
 * @param url - URL string
 * @param protocol - Protocol to add (default: 'https:')
 * @returns URL with protocol
 *
 * @example
 * ```typescript
 * ensureProtocol('example.com') // "https://example.com"
 * ensureProtocol('http://example.com') // "http://example.com"
 * ```
 */
export function ensureProtocol(url: string, protocol: string = 'https:'): string {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  return `${protocol}//${url}`;
}

/**
 * Check if URL is an image
 *
 * @param url - URL to check
 * @returns True if URL points to an image
 *
 * @example
 * ```typescript
 * isImageUrl('https://example.com/photo.jpg') // true
 * isImageUrl('https://example.com/page.html') // false
 * ```
 */
export function isImageUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname.toLowerCase();
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];
    return imageExtensions.some(ext => pathname.endsWith(ext));
  } catch {
    return false;
  }
}

/**
 * Check if URL is a video
 *
 * @param url - URL to check
 * @returns True if URL points to a video
 */
export function isVideoUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname.toLowerCase();
    const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi'];
    return videoExtensions.some(ext => pathname.endsWith(ext));
  } catch {
    return false;
  }
}

/**
 * Parse query parameters from URL
 *
 * @param url - URL string
 * @returns Object with query parameters
 *
 * @example
 * ```typescript
 * parseQueryParams('https://example.com?foo=bar&baz=qux')
 * // { foo: 'bar', baz: 'qux' }
 * ```
 */
export function parseQueryParams(url: string): Record<string, string> {
  try {
    const urlObj = new URL(url);
    const params: Record<string, string> = {};
    urlObj.searchParams.forEach((value, key) => {
      params[key] = value;
    });
    return params;
  } catch {
    return {};
  }
}

/**
 * Build URL with query parameters
 *
 * @param baseUrl - Base URL
 * @param params - Query parameters
 * @returns URL with query parameters
 *
 * @example
 * ```typescript
 * buildUrlWithParams('https://example.com', { foo: 'bar', baz: 'qux' })
 * // "https://example.com?foo=bar&baz=qux"
 * ```
 */
export function buildUrlWithParams(
  baseUrl: string,
  params: Record<string, string | number | boolean>
): string {
  try {
    const urlObj = new URL(baseUrl);
    Object.entries(params).forEach(([key, value]) => {
      urlObj.searchParams.set(key, String(value));
    });
    return urlObj.toString();
  } catch {
    return baseUrl;
  }
}

/**
 * Sanitize URL for logging
 *
 * Removes sensitive query parameters
 *
 * @param url - URL to sanitize
 * @param sensitiveParams - List of sensitive parameter names
 * @returns Sanitized URL
 *
 * @example
 * ```typescript
 * sanitizeUrl('https://api.com?token=secret&data=public')
 * // "https://api.com?token=[REDACTED]&data=public"
 * ```
 */
export function sanitizeUrl(
  url: string,
  sensitiveParams: string[] = ['token', 'key', 'secret', 'password', 'api_key', 'apikey']
): string {
  try {
    const urlObj = new URL(url);
    sensitiveParams.forEach(param => {
      if (urlObj.searchParams.has(param)) {
        urlObj.searchParams.set(param, '[REDACTED]');
      }
    });
    return urlObj.toString();
  } catch {
    // If URL parsing fails, return truncated original
    return url.substring(0, 100);
  }
}

/**
 * Check if two URLs are the same
 *
 * Normalizes URLs before comparison
 *
 * @param url1 - First URL
 * @param url2 - Second URL
 * @returns True if URLs are the same
 */
export function isSameUrl(url1: string, url2: string): boolean {
  try {
    const normalized1 = normalizeUrl(url1);
    const normalized2 = normalizeUrl(url2);
    return normalized1 === normalized2;
  } catch {
    return false;
  }
}
