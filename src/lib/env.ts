import { z } from 'zod';
import { logger } from '@/lib/logger';

const envLogger = logger.child({ component: 'env-validation' });

const envSchema = z.object({
  VITE_SUPABASE_URL: z.string().url('Invalid Supabase URL'),
  VITE_SUPABASE_PUBLISHABLE_KEY: z.string().min(1, 'Supabase publishable key is required'),
  VITE_SUPABASE_PROJECT_ID: z.string().min(1, 'Supabase project ID is required'),
  VITE_POSTHOG_KEY: z.string().optional(), // PostHog is optional
  DEV: z.boolean(),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const parsed = envSchema.safeParse({
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_PUBLISHABLE_KEY: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    VITE_SUPABASE_PROJECT_ID: import.meta.env.VITE_SUPABASE_PROJECT_ID,
    VITE_POSTHOG_KEY: import.meta.env.VITE_POSTHOG_KEY,
    DEV: import.meta.env.DEV,
  });

  if (!parsed.success) {
    const errorMessage = 'Environment validation failed';
    envLogger.critical(errorMessage, new Error(JSON.stringify(parsed.error.flatten())));
    console.error('❌ Invalid environment variables:', parsed.error.flatten());
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
export const hasPostHog = !!env.VITE_POSTHOG_KEY;
