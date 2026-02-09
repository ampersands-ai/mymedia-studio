import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './types';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  throw new Error(
    'Missing Supabase configuration. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env file. See .env.example for details.'
  );
}

/**
 * Browser-side Supabase client using cookie-based auth (SSR-safe).
 * Session tokens are stored in cookies instead of localStorage,
 * enabling server-side access in middleware and Server Components.
 */
export const supabase = createBrowserClient<Database>(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);
