/**
 * Security Layer 1: URL Token Validation
 * Validates the static URL token to prevent unauthorized access
 */

export interface ValidationResult {
  success: boolean;
  error?: string;
  shouldReturn404?: boolean;
}

export function validateUrlToken(url: URL): ValidationResult {
  const receivedToken = url.searchParams.get('token');
  const expectedToken = Deno.env.get('KIE_WEBHOOK_URL_TOKEN');
  
  if (!receivedToken || receivedToken !== expectedToken) {
    console.error('🚨 SECURITY LAYER 1 FAILED: Invalid or missing URL token', {
      has_token: !!receivedToken,
      token_preview: receivedToken?.substring(0, 8) + '...'
    });
    return {
      success: false,
      error: 'Invalid or missing URL token',
      shouldReturn404: true // Make endpoint appear as if it doesn't exist
    };
  }
  
  console.log('✅ Layer 1 passed: URL token validated');
  return { success: true };
}
