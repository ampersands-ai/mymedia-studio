/**
 * Consent Management Utilities
 * Privacy-first: hashes sensitive data client-side before sending
 */

/**
 * SHA-256 hash function for sensitive data
 */
export async function hashData(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Get device ID hash for consent operations
 */
export async function getDeviceIdHash(deviceId: string): Promise<string> {
  return hashData(deviceId);
}
