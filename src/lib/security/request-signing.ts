/**
 * Request Signing Utility
 * 
 * Provides HMAC-SHA256 request signing for admin endpoints.
 * Uses Web Crypto API for browser compatibility.
 * 
 * Features:
 * - Timestamp-based replay protection (5-minute window)
 * - HMAC-SHA256 signature generation
 * - Signing key derived from user session
 */

/** Maximum age for request signatures (5 minutes) */
const SIGNATURE_MAX_AGE_MS = 5 * 60 * 1000;

/** Header names for signed requests */
export const SIGNATURE_HEADERS = {
  SIGNATURE: 'X-Request-Signature',
  TIMESTAMP: 'X-Request-Timestamp',
  USER_ID: 'X-User-Id',
} as const;

/**
 * Generate HMAC-SHA256 signature for request payload
 * 
 * @param payload - JSON string of request body
 * @param timestamp - Unix timestamp in milliseconds
 * @param signingKey - User-specific signing key
 * @returns Base64-encoded signature
 */
export async function signRequest(
  payload: string,
  timestamp: number,
  signingKey: string
): Promise<string> {
  const encoder = new TextEncoder();
  
  // Create message to sign: timestamp + payload
  const message = `${timestamp}:${payload}`;
  const messageData = encoder.encode(message);
  
  // Import signing key
  const keyData = encoder.encode(signingKey);
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  // Generate signature
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  
  // Convert to base64
  const signatureArray = new Uint8Array(signature);
  const signatureBase64 = btoa(String.fromCharCode(...signatureArray));
  
  return signatureBase64;
}

/**
 * Verify HMAC-SHA256 signature
 * 
 * @param payload - JSON string of request body
 * @param timestamp - Unix timestamp from request header
 * @param signature - Base64-encoded signature from request header
 * @param signingKey - User-specific signing key
 * @returns True if signature is valid and not expired
 */
export async function verifySignature(
  payload: string,
  timestamp: number,
  signature: string,
  signingKey: string
): Promise<boolean> {
  // Check timestamp validity (prevent replay attacks)
  const now = Date.now();
  if (Math.abs(now - timestamp) > SIGNATURE_MAX_AGE_MS) {
    console.warn('Request signature expired', { timestamp, now, maxAge: SIGNATURE_MAX_AGE_MS });
    return false;
  }
  
  // Regenerate expected signature
  const expectedSignature = await signRequest(payload, timestamp, signingKey);
  
  // Constant-time comparison to prevent timing attacks
  return timingSafeEqual(signature, expectedSignature);
}

/**
 * Constant-time string comparison
 * Prevents timing attacks by always comparing the full length
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Still compare full length to prevent length-based timing
    let result = a.length ^ b.length;
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      const charA = a.charCodeAt(i % a.length) || 0;
      const charB = b.charCodeAt(i % b.length) || 0;
      result |= charA ^ charB;
    }
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Create signing key from user session
 * Combines user ID with session token for unique per-session keys
 * 
 * @param userId - User's unique identifier
 * @param sessionToken - User's session access token (first 32 chars used)
 * @returns Derived signing key
 */
export function deriveSigningKey(userId: string, sessionToken: string): string {
  // Use combination of user ID and session token prefix
  // This ensures keys are unique per session
  const tokenPrefix = sessionToken.substring(0, 32);
  return `${userId}:${tokenPrefix}`;
}

/**
 * Create signed headers for a request
 * 
 * @param body - Request body object
 * @param userId - User's unique identifier
 * @param signingKey - Derived signing key
 * @returns Headers object with signature headers
 */
export async function createSignedHeaders(
  body: Record<string, unknown>,
  userId: string,
  signingKey: string
): Promise<Record<string, string>> {
  const timestamp = Date.now();
  const payload = JSON.stringify(body);
  const signature = await signRequest(payload, timestamp, signingKey);
  
  return {
    [SIGNATURE_HEADERS.SIGNATURE]: signature,
    [SIGNATURE_HEADERS.TIMESTAMP]: String(timestamp),
    [SIGNATURE_HEADERS.USER_ID]: userId,
  };
}

/**
 * Wrapper function to add signature to fetch requests
 * 
 * @param url - Request URL
 * @param options - Fetch options including body
 * @param userId - User's unique identifier
 * @param signingKey - Derived signing key
 * @returns Fetch options with signature headers added
 */
export async function signedFetch(
  url: string,
  options: RequestInit & { body?: string },
  userId: string,
  signingKey: string
): Promise<Response> {
  const body = options.body ? JSON.parse(options.body) : {};
  const signatureHeaders = await createSignedHeaders(body, userId, signingKey);
  
  const headers = new Headers(options.headers);
  Object.entries(signatureHeaders).forEach(([key, value]) => {
    headers.set(key, value);
  });
  
  return fetch(url, {
    ...options,
    headers,
  });
}
