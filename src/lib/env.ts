import { z } from 'zod';
import { logger } from '@/lib/logger';

const envLogger = logger.child({ component: 'env-validation' });

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('Invalid Supabase URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'Supabase anon key is required'),
  NEXT_PUBLIC_SUPABASE_PROJECT_ID: z.string().min(1, 'Supabase project ID is required'),
  NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(), // PostHog is optional
  DEV: z.boolean(),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const parsed = envSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SUPABASE_PROJECT_ID: process.env.NEXT_PUBLIC_SUPABASE_PROJECT_ID,
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    DEV: process.env.NODE_ENV === 'development',
  });

  if (!parsed.success) {
    const errorMessage = 'Environment validation failed';
    envLogger.critical(errorMessage, new Error(JSON.stringify(parsed.error.flatten())));
    throw new Error(errorMessage);
  }

  envLogger.info('Environment variables validated successfully');
  return parsed.data;
}

export const env = validateEnv();

/**
 * Type-safe environment variable helpers
 */
export const isDevelopment = env.DEV;
export const isProduction = !env.DEV;
export const hasPostHog = !!env.NEXT_PUBLIC_POSTHOG_KEY;
