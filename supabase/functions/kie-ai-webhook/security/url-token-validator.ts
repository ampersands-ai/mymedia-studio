/**
 * Security Layer 1: URL Token Validation
 * Validates the static URL token to prevent unauthorized access
 */

import { webhookLogger } from "../../_shared/logger.ts";

export interface ValidationResult {
  success: boolean;
  error?: string;
  shouldReturn404?: boolean;
}

export function validateUrlToken(url: URL): ValidationResult {
  const receivedToken = url.searchParams.get('token');
  const expectedToken = Deno.env.get('KIE_WEBHOOK_URL_TOKEN');
  
  if (!receivedToken || receivedToken !== expectedToken) {
    webhookLogger.error('SECURITY LAYER 1 FAILED: Invalid or missing URL token', 'Invalid token', {
      has_token: !!receivedToken,
      token_preview: receivedToken?.substring(0, 8) + '...',
      status: 'rejected_url_token'
    });
    return {
      success: false,
      error: 'Invalid or missing URL token',
      shouldReturn404: true // Make endpoint appear as if it doesn't exist
    };
  }
  
  webhookLogger.info('Layer 1 passed: URL token validated', {});
  return { success: true };
}
