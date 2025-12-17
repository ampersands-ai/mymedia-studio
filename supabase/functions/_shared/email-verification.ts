import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EdgeLogger } from "./edge-logger.ts";

/**
 * Check if a user's email is verified
 * @returns true if verified, false if not verified
 */
export async function checkEmailVerified(
  supabase: SupabaseClient,
  userId: string,
  logger: EdgeLogger
): Promise<boolean> {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('email_verified')
    .eq('id', userId)
    .single();

  if (error) {
    logger.warn('Failed to check email verification status', { 
      userId, 
      metadata: { error: error.message } 
    });
    // Fail open on database error to avoid blocking legitimate users
    return true;
  }

  return profile?.email_verified === true;
}

/**
 * Create a 403 response for unverified email
 */
export function createEmailNotVerifiedResponse(responseHeaders: HeadersInit): Response {
  return new Response(
    JSON.stringify({ 
      error: 'Email verification required',
      code: 'EMAIL_NOT_VERIFIED',
      message: 'Please verify your email address before creating content.'
    }),
    { 
      status: 403, 
      headers: { ...Object.fromEntries(new Headers(responseHeaders).entries()), 'Content-Type': 'application/json' } 
    }
  );
}
