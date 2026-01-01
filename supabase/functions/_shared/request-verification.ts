/**
 * Request Verification Middleware for Edge Functions
 * 
 * Verifies HMAC-SHA256 signatures on admin endpoints.
 * Provides replay attack protection with timestamp validation.
 * 
 * Feature Flag: ENABLE_REQUEST_SIGNING (default: false)
 * Set to true in Supabase secrets to enforce signature verification.
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
 * Check if request signing is enabled
 * Uses feature flag for gradual rollout
 */
export function isSigningEnabled(): boolean {
  const flag = Deno.env.get('ENABLE_REQUEST_SIGNING');
  return flag === 'true' || flag === '1';
}

/**
 * Verify HMAC-SHA256 signature for incoming request
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
    console.warn('[request-verification] Signature expired', { 
      timestamp, 
      now, 
      difference: Math.abs(now - timestamp),
      maxAge: SIGNATURE_MAX_AGE_MS 
    });
    return false;
  }
  
  // Regenerate expected signature
  const encoder = new TextEncoder();
  const message = `${timestamp}:${payload}`;
  const messageData = encoder.encode(message);
  
  const keyData = encoder.encode(signingKey);
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const expectedSignatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  const expectedSignatureArray = new Uint8Array(expectedSignatureBuffer);
  const expectedSignature = btoa(String.fromCharCode(...expectedSignatureArray));
  
  // Constant-time comparison
  return timingSafeEqual(signature, expectedSignature);
}

/**
 * Constant-time string comparison
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
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
 * Derive signing key from user information
 * Must match client-side derivation
 */
export function deriveSigningKey(userId: string, sessionToken: string): string {
  const tokenPrefix = sessionToken.substring(0, 32);
  return `${userId}:${tokenPrefix}`;
}

/**
 * Extract signature details from request headers
 */
export interface SignatureDetails {
  signature: string | null;
  timestamp: number | null;
  userId: string | null;
}

export function extractSignatureDetails(req: Request): SignatureDetails {
  const signature = req.headers.get(SIGNATURE_HEADERS.SIGNATURE);
  const timestampStr = req.headers.get(SIGNATURE_HEADERS.TIMESTAMP);
  const userId = req.headers.get(SIGNATURE_HEADERS.USER_ID);
  
  return {
    signature,
    timestamp: timestampStr ? parseInt(timestampStr, 10) : null,
    userId,
  };
}

/**
 * Verify request signature middleware
 * Returns error response if verification fails, null if successful
 * 
 * @param req - Incoming request
 * @param body - Parsed request body (as string)
 * @param userAccessToken - User's access token from auth
 * @returns Error Response if verification fails, null if successful
 */
export async function requireSignedRequest(
  req: Request,
  body: string,
  userAccessToken: string
): Promise<Response | null> {
  // Skip verification if feature flag is disabled
  if (!isSigningEnabled()) {
    return null;
  }
  
  const { signature, timestamp, userId } = extractSignatureDetails(req);
  
  // Check required headers
  if (!signature || !timestamp || !userId) {
    console.warn('[request-verification] Missing signature headers', {
      hasSignature: !!signature,
      hasTimestamp: !!timestamp,
      hasUserId: !!userId,
    });
    
    return new Response(
      JSON.stringify({
        error: 'Request signature required',
        code: 'SIGNATURE_REQUIRED',
      }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
  
  // Derive signing key
  const signingKey = deriveSigningKey(userId, userAccessToken);
  
  // Verify signature
  const isValid = await verifySignature(body, timestamp, signature, signingKey);
  
  if (!isValid) {
    console.warn('[request-verification] Invalid signature', { userId, timestamp });
    
    return new Response(
      JSON.stringify({
        error: 'Invalid request signature',
        code: 'SIGNATURE_INVALID',
      }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
  
  return null; // Signature valid
}

/**
 * Optional signature verification - logs warning but doesn't block
 * Useful during rollout to monitor signature usage
 */
export async function optionalSignatureVerification(
  req: Request,
  body: string,
  userAccessToken: string
): Promise<{ verified: boolean; reason?: string }> {
  const { signature, timestamp, userId } = extractSignatureDetails(req);
  
  if (!signature || !timestamp || !userId) {
    return { verified: false, reason: 'missing_headers' };
  }
  
  const signingKey = deriveSigningKey(userId, userAccessToken);
  const isValid = await verifySignature(body, timestamp, signature, signingKey);
  
  if (!isValid) {
    return { verified: false, reason: 'invalid_signature' };
  }
  
  return { verified: true };
}
