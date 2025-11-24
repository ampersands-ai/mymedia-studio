/**
 * HMAC Signature Validator for JSON2Video Webhook
 *
 * SECURITY: Cryptographic signature verification to prevent payload tampering
 *
 * Attack Vectors Prevented:
 * - Payload tampering (integrity check)
 * - Man-in-the-middle attacks (HMAC verification)
 * - Replay attacks (combined with timestamp checks)
 * - Unauthorized webhook calls
 */

import { createHmac } from 'https://deno.land/std@0.177.0/node/crypto.ts';
import { EdgeLogger } from "../../_shared/edge-logger.ts";

export interface SignatureResult {
  success: boolean;
  error?: string;
}

export function validateSignature(
  payload: string,
  receivedSignature: string | null,
  logger: EdgeLogger
): SignatureResult {
  const secret = Deno.env.get('JSON2VIDEO_WEBHOOK_SECRET');

  if (!secret) {
    logger.error('SECURITY CRITICAL: JSON2VIDEO_WEBHOOK_SECRET not configured', new Error('Missing webhook secret'));
    return {
      success: false,
      error: 'Webhook secret not configured - contact system administrator',
    };
  }

  if (!receivedSignature) {
    logger.error('SECURITY: Missing X-Json2Video-Signature header');
    return {
      success: false,
      error: 'Missing signature header',
    };
  }

  const hmac = createHmac('sha256', secret);
  hmac.update(payload);
  const expectedSignature = `sha256=${hmac.digest('hex')}`;

  const match = constantTimeCompare(receivedSignature, expectedSignature);

  if (!match) {
    logger.error('SECURITY: Invalid signature', new Error('Signature mismatch'), {
      metadata: {
        receivedPrefix: receivedSignature.substring(0, 12) + '...',
        payloadSize: payload.length,
      }
    });
    return {
      success: false,
      error: 'Invalid signature',
    };
  }

  logger.info('✓ Signature validated', {
    metadata: {
      algorithm: 'SHA256',
      payloadSize: payload.length,
    }
  });

  return { success: true };
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
function constantTimeCompare(a: string, b: string): boolean {
  const aLength = a.length;
  const bLength = b.length;
  const maxLength = Math.max(aLength, bLength);

  let result = aLength ^ bLength; // XOR lengths
  for (let i = 0; i < maxLength; i++) {
    const aChar = i < aLength ? a.charCodeAt(i) : 0;
    const bChar = i < bLength ? b.charCodeAt(i) : 0;
    result |= aChar ^ bChar;
  }

  return result === 0;
}

/**
 * Generate test signature for development/testing
 */
export function generateTestSignature(payload: string, secret: string): string {
  const hmac = createHmac('sha256', secret);
  hmac.update(payload);
  return `sha256=${hmac.digest('hex')}`;
}
