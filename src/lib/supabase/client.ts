import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/integrations/supabase/types';

/**
 * Creates a Supabase client for use in Client Components.
 * Uses browser cookies for session management.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
