import { z } from 'zod';

const envSchema = z.object({
  VITE_SUPABASE_URL: z.string().url(),
  VITE_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  VITE_SUPABASE_PROJECT_ID: z.string().min(1),
  DEV: z.boolean(),
});

function validateEnv() {
  const parsed = envSchema.safeParse({
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_PUBLISHABLE_KEY: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    VITE_SUPABASE_PROJECT_ID: import.meta.env.VITE_SUPABASE_PROJECT_ID,
    DEV: import.meta.env.DEV,
  });

  if (!parsed.success) {
    console.error('❌ Invalid environment variables:', parsed.error.flatten());
    throw new Error('Environment validation failed');
  }

  return parsed.data;
}

export const env = validateEnv();
