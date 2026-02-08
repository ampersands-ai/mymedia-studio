import type { Generation } from "../hooks/useGenerationHistory";

/**
 * Calculate and format generation time.
 * - Prefers stored timing data if available (setup_duration_ms + api_duration_ms)
 * - Falls back to timestamps (created_at -> completed_at/caption_generated_at)
 */
export const formatGenerationTime = (generation: Generation): string | null => {
  if (generation.setup_duration_ms != null && generation.api_duration_ms != null) {
    const setupMs = generation.setup_duration_ms || 0;
    const apiMs = generation.api_duration_ms || 0;

    if (setupMs > 0 || apiMs > 0) {
      const totalSeconds = (setupMs + apiMs) / 1000;
      return `${totalSeconds.toFixed(1)}s`;
    }
  }

  const completedTime = generation.completed_at || generation.caption_generated_at;
  if (!completedTime || generation.status !== "completed") return null;

  const startTime = new Date(generation.created_at).getTime();
  const endTime = new Date(completedTime).getTime();
  const seconds = Math.round((endTime - startTime) / 1000);

  if (seconds < 0 || seconds > 3600) return null;
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
};
