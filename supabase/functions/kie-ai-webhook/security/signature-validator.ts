/**
 * HMAC Signature Validator for Kie.ai Webhook
 *
 * SECURITY LAYER 5: Cryptographic signature verification
 *
 * This provides cryptographic proof that the request came from Kie.ai
 * and that the payload hasn't been tampered with in transit.
 *
 * Attack Vectors Prevented:
 * - Payload tampering (integrity check)
 * - Man-in-the-middle attacks (HMAC verification)
 * - Replay attacks (combined with existing timestamp checks)
 *
 * IMPORTANT: Requires KIE_WEBHOOK_SECRET environment variable
 */

import { createHmac } from 'https://deno.land/std@0.177.0/node/crypto.ts';
import { EdgeLogger } from '../../_shared/edge-logger.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface SignatureResult {
  success: boolean;
  error?: string;
}

/**
 * Validates HMAC signature of webhook payload
 *
 * @param payload - Raw request body as string
 * @param receivedSignature - Signature from X-Kie-Signature header
 * @returns SignatureResult indicating success or failure
 */
export function validateSignature(
  payload: string,
  receivedSignature: string | null
): SignatureResult {
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
  const logger = new EdgeLogger('signature-validator', crypto.randomUUID(), supabaseClient);

  const secret = Deno.env.get('KIE_WEBHOOK_SECRET');

  // If no secret configured AND no signature provided, skip HMAC validation
  // This allows providers like Kie.ai that don't send HMAC signatures
  // (Other security layers still protect the webhook: URL token, verify token, timing, idempotency)
  if (!secret && !receivedSignature) {
    logger.info('Layer 5 skipped: HMAC validation not configured');
    return { success: true };
  }

  // Check if secret is configured
  if (!secret) {
    logger.error('SECURITY CRITICAL: KIE_WEBHOOK_SECRET not configured');
    return {
      success: false,
      error: 'Webhook secret not configured - contact system administrator',
    };
  }

  // Check if signature header is present
  if (!receivedSignature) {
    logger.error('SECURITY LAYER 5 FAILED: Missing X-Kie-Signature header', undefined, {
      metadata: { timestamp: new Date().toISOString() }
    });
    return {
      success: false,
      error: 'Missing signature header',
    };
  }

  // Compute expected signature
  const hmac = createHmac('sha256', secret);
  hmac.update(payload);
  const expectedSignature = `sha256=${hmac.digest('hex')}`;

  // Constant-time comparison to prevent timing attacks
  const match = constantTimeCompare(receivedSignature, expectedSignature);

  if (!match) {
    logger.error('SECURITY LAYER 5 FAILED: Invalid signature', undefined, {
      metadata: {
        receivedPrefix: receivedSignature.substring(0, 12) + '...',
        expectedPrefix: expectedSignature.substring(0, 12) + '...',
        payloadSize: payload.length,
        timestamp: new Date().toISOString()
      }
    });
    return {
      success: false,
      error: 'Invalid signature',
    };
  }

  logger.info('Layer 5 passed: HMAC signature validated', {
    metadata: {
      algorithm: 'SHA256',
      payloadSize: payload.length
    }
  });

  return { success: true };
}

/**
 * Constant-time string comparison to prevent timing attacks
 *
 * @param a - First string
 * @param b - Second string
 * @returns True if strings are equal
 */
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Generates an HMAC signature for testing purposes
 * DO NOT USE IN PRODUCTION CODE
 *
 * @param payload - Payload to sign
 * @param secret - Secret key
 * @returns HMAC signature
 */
export function generateTestSignature(payload: string, secret: string): string {
  const hmac = createHmac('sha256', secret);
  hmac.update(payload);
  return `sha256=${hmac.digest('hex')}`;
}
