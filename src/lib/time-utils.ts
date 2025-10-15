/**
 * Format time duration in a user-friendly way
 * @param seconds - Time duration in seconds
 * @returns Formatted string like "30s" or "5m" or "5m 30s"
 */
export function formatEstimatedTime(seconds: number | null | undefined): string | null {
  if (seconds === null || seconds === undefined) return null;
  
  if (seconds < 60) {
    return `${seconds}s`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (remainingSeconds === 0) {
    return `${minutes}m`;
  }
  
  return `${minutes}m ${remainingSeconds}s`;
}
