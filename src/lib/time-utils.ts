/**
 * Format time duration in a user-friendly way
 * @param minutes - Time duration in minutes (can be decimal)
 * @returns Formatted string like "30 seconds" or "5 minutes"
 */
export function formatEstimatedTime(minutes: number | null | undefined): string | null {
  if (minutes === null || minutes === undefined) return null;
  
  const totalSeconds = Math.round(minutes * 60);
  
  if (totalSeconds < 60) {
    return `${totalSeconds} ${totalSeconds === 1 ? 'second' : 'seconds'}`;
  }
  
  const mins = Math.round(minutes);
  return `${mins} ${mins === 1 ? 'minute' : 'minutes'}`;
}
