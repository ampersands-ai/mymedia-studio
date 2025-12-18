/**
 * SHA-256 Token Hashing Utility
 * 
 * Defense-in-depth security for email verification and password reset tokens.
 * Stores one-way hashes in database while sending plaintext tokens in emails.
 * Even if database is compromised, attackers cannot forge valid tokens.
 */

/**
 * Hash a token using SHA-256
 * @param token - The plaintext token (UUID)
 * @returns Hex-encoded SHA-256 hash (64 characters)
 */
export async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Timing-safe string comparison to prevent timing attacks
 * @param a - First string to compare
 * @param b - Second string to compare
 * @returns true if strings are equal
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
