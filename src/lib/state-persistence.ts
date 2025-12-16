import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

/**
 * Database-verified state persistence utility
 * Provides immediate save for critical IDs and database verification on load
 */

interface CriticalState {
  id: string;
  timestamp: number;
}

/**
 * Save critical ID immediately to localStorage (no debounce)
 */
export function saveCriticalId(key: string, id: string | null): void {
  if (id) {
    const state: CriticalState = {
      id,
      timestamp: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(state));
  } else {
    localStorage.removeItem(key);
  }
}

/**
 * Load critical ID from localStorage with expiry check
 */
export function loadCriticalId(key: string, expiryHours: number = 24): string | null {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return null;

    const { id, timestamp }: CriticalState = JSON.parse(stored);
    const hoursSince = (Date.now() - timestamp) / (1000 * 60 * 60);

    if (hoursSince >= expiryHours) {
      localStorage.removeItem(key);
      return null;
    }

    return id;
  } catch {
    localStorage.removeItem(key);
    return null;
  }
}

/**
 * Clear critical ID from localStorage
 */
export function clearCriticalId(key: string): void {
  localStorage.removeItem(key);
}

/**
 * Verify a video job exists and return its current state
 * Returns verified: true if we successfully queried the database
 * Returns verified: false if we couldn't reach the database (network/auth error)
 */
export async function verifyVideoJob(jobId: string): Promise<{
  exists: boolean;
  verified: boolean;
  status?: string;
  script?: string | null;
  voiceoverUrl?: string | null;
  videoUrl?: string | null;
  errorMessage?: string | null;
}> {
  try {
    const { data: job, error } = await supabase
      .from('video_jobs')
      .select('id, status, script, voiceover_url, final_video_url, error_message')
      .eq('id', jobId)
      .single();

    if (error) {
      // PGRST116 = row not found - job definitely doesn't exist
      if (error.code === 'PGRST116') {
        return { exists: false, verified: true };
      }
      // Other errors (network, auth) - couldn't verify
      logger.warn('Could not verify video job', { error, jobId });
      return { exists: false, verified: false };
    }

    if (!job) {
      return { exists: false, verified: true };
    }

    return {
      exists: true,
      verified: true,
      status: job.status,
      script: job.script,
      voiceoverUrl: job.voiceover_url,
      videoUrl: job.final_video_url,
      errorMessage: job.error_message,
    };
  } catch (e) {
    logger.error('Failed to verify video job', e instanceof Error ? e : new Error(String(e)));
    return { exists: false, verified: false };
  }
}

/**
 * Map video job status to UI step
 */
export function mapVideoStatusToStep(status: string): string {
  const statusMap: Record<string, string> = {
    pending: 'script_generating',
    generating_script: 'script_generating',
    awaiting_script_approval: 'script_review',
    generating_voice: 'voiceover_generating',
    awaiting_voice_approval: 'voiceover_review',
    fetching_video: 'rendering',
    assembling: 'rendering',
    completed: 'complete',
    failed: 'topic',
  };
  return statusMap[status] || 'topic';
}

/**
 * Verify a generation exists and return its current state
 * Returns verified: true if we successfully queried the database
 * Returns verified: false if we couldn't reach the database (network/auth error)
 */
export async function verifyGeneration(generationId: string): Promise<{
  exists: boolean;
  verified: boolean;
  status?: string;
  outputUrl?: string | null;
  storagePath?: string | null;
}> {
  try {
    const { data: gen, error } = await supabase
      .from('generations')
      .select('id, status, output_url, storage_path')
      .eq('id', generationId)
      .single();

    if (error) {
      // PGRST116 = row not found - generation definitely doesn't exist
      if (error.code === 'PGRST116') {
        return { exists: false, verified: true };
      }
      // Other errors (network, auth) - couldn't verify
      logger.warn('Could not verify generation', { error, generationId });
      return { exists: false, verified: false };
    }

    if (!gen) {
      return { exists: false, verified: true };
    }

    return {
      exists: true,
      verified: true,
      status: gen.status,
      outputUrl: gen.output_url,
      storagePath: gen.storage_path,
    };
  } catch (e) {
    logger.error('Failed to verify generation', e instanceof Error ? e : new Error(String(e)));
    return { exists: false, verified: false };
  }
}

/**
 * Verify a storyboard exists and return its current state
 * Returns verified: true if we successfully queried the database
 * Returns verified: false if we couldn't reach the database (network/auth error)
 */
export async function verifyStoryboard(storyboardId: string): Promise<{
  exists: boolean;
  verified: boolean;
  status?: string;
  videoUrl?: string | null;
}> {
  try {
    const { data: storyboard, error } = await supabase
      .from('storyboards')
      .select('id, status, video_url')
      .eq('id', storyboardId)
      .single();

    if (error) {
      // PGRST116 = row not found - storyboard definitely doesn't exist
      if (error.code === 'PGRST116') {
        return { exists: false, verified: true };
      }
      // Other errors (network, auth) - couldn't verify
      logger.warn('Could not verify storyboard', { error, storyboardId });
      return { exists: false, verified: false };
    }

    if (!storyboard) {
      return { exists: false, verified: true };
    }

    return {
      exists: true,
      verified: true,
      status: storyboard.status,
      videoUrl: storyboard.video_url,
    };
  } catch (e) {
    logger.error('Failed to verify storyboard', e instanceof Error ? e : new Error(String(e)));
    return { exists: false, verified: false };
  }
}
