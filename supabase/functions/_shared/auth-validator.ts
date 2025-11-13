import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Validates authentication from request headers
 * 
 * @param req - Request object
 * @param supabase - Supabase client
 * @returns Authenticated user object
 * @throws {Error} If authentication fails
 */
export async function validateAuth(req: Request, supabase: SupabaseClient) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    throw new Error('Missing authorization header');
  }
  
  const token = authHeader.replace('Bearer ', '');
  const { data, error } = await supabase.auth.getUser(token);
  
  if (error || !data.user) {
    throw new Error('Invalid or expired token');
  }
  
  return data.user;
}

/**
 * Optional authentication - returns user if authenticated, null otherwise
 */
export async function optionalAuth(req: Request, supabase: SupabaseClient) {
  try {
    return await validateAuth(req, supabase);
  } catch {
    return null;
  }
}
