/**
 * Date Formatting Utility
 *
 * Provides reusable date formatting and relative time functions.
 * Extracted from duplicate implementations across UI components.
 *
 * @module dateFormatting
 */

/**
 * Format date as relative time (e.g., "2 hours ago", "just now")
 *
 * @param date - Date to format (Date object or ISO string)
 * @returns Relative time string
 *
 * @example
 * ```typescript
 * formatRelativeDate(new Date()) // "just now"
 * formatRelativeDate('2024-01-01T00:00:00Z') // "3 months ago"
 * ```
 */
export function formatRelativeDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);
  const diffYear = Math.floor(diffDay / 365);

  if (diffSec < 10) {
    return 'just now';
  } else if (diffSec < 60) {
    return `${diffSec} seconds ago`;
  } else if (diffMin === 1) {
    return '1 minute ago';
  } else if (diffMin < 60) {
    return `${diffMin} minutes ago`;
  } else if (diffHour === 1) {
    return '1 hour ago';
  } else if (diffHour < 24) {
    return `${diffHour} hours ago`;
  } else if (diffDay === 1) {
    return 'yesterday';
  } else if (diffDay < 7) {
    return `${diffDay} days ago`;
  } else if (diffWeek === 1) {
    return '1 week ago';
  } else if (diffWeek < 4) {
    return `${diffWeek} weeks ago`;
  } else if (diffMonth === 1) {
    return '1 month ago';
  } else if (diffMonth < 12) {
    return `${diffMonth} months ago`;
  } else if (diffYear === 1) {
    return '1 year ago';
  } else {
    return `${diffYear} years ago`;
  }
}

/**
 * Format date as short relative time (e.g., "2h", "3d")
 *
 * @param date - Date to format
 * @returns Short relative time string
 *
 * @example
 * ```typescript
 * formatShortRelativeDate(new Date()) // "now"
 * formatShortRelativeDate('2024-01-01T00:00:00Z') // "3mo"
 * ```
 */
export function formatShortRelativeDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);
  const diffYear = Math.floor(diffDay / 365);

  if (diffSec < 60) {
    return 'now';
  } else if (diffMin < 60) {
    return `${diffMin}m`;
  } else if (diffHour < 24) {
    return `${diffHour}h`;
  } else if (diffDay < 7) {
    return `${diffDay}d`;
  } else if (diffWeek < 4) {
    return `${diffWeek}w`;
  } else if (diffMonth < 12) {
    return `${diffMonth}mo`;
  } else {
    return `${diffYear}y`;
  }
}

/**
 * Format date as human-readable string
 *
 * @param date - Date to format
 * @param includeTime - Include time in output (default: false)
 * @returns Formatted date string
 *
 * @example
 * ```typescript
 * formatDate(new Date('2024-01-15')) // "January 15, 2024"
 * formatDate(new Date('2024-01-15'), true) // "January 15, 2024 at 12:00 PM"
 * ```
 */
export function formatDate(date: Date | string, includeTime: boolean = false): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };

  if (includeTime) {
    options.hour = 'numeric';
    options.minute = '2-digit';
  }

  return d.toLocaleDateString('en-US', options);
}

/**
 * Format date as short string (e.g., "Jan 15, 2024")
 *
 * @param date - Date to format
 * @returns Short date string
 */
export function formatShortDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format time only (e.g., "12:30 PM")
 *
 * @param date - Date to format
 * @param use24Hour - Use 24-hour format (default: false)
 * @returns Time string
 */
export function formatTime(date: Date | string, use24Hour: boolean = false): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: !use24Hour,
  });
}

/**
 * Format date as ISO string (YYYY-MM-DD)
 *
 * @param date - Date to format
 * @returns ISO date string
 */
export function formatISODate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0];
}

/**
 * Format date as ISO datetime string
 *
 * @param date - Date to format
 * @returns ISO datetime string
 */
export function formatISODateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString();
}

/**
 * Format duration in milliseconds to human-readable string
 *
 * @param durationMs - Duration in milliseconds
 * @param verbose - Use verbose format (default: false)
 * @returns Duration string
 *
 * @example
 * ```typescript
 * formatDuration(3661000) // "1h 1m 1s"
 * formatDuration(3661000, true) // "1 hour 1 minute 1 second"
 * ```
 */
export function formatDuration(durationMs: number, verbose: boolean = false): string {
  const seconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  const remainingHours = hours % 24;
  const remainingMinutes = minutes % 60;
  const remainingSeconds = seconds % 60;

  const parts: string[] = [];

  if (days > 0) {
    parts.push(verbose ? `${days} day${days > 1 ? 's' : ''}` : `${days}d`);
  }
  if (remainingHours > 0) {
    parts.push(verbose ? `${remainingHours} hour${remainingHours > 1 ? 's' : ''}` : `${remainingHours}h`);
  }
  if (remainingMinutes > 0) {
    parts.push(verbose ? `${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''}` : `${remainingMinutes}m`);
  }
  if (remainingSeconds > 0 || parts.length === 0) {
    parts.push(verbose ? `${remainingSeconds} second${remainingSeconds !== 1 ? 's' : ''}` : `${remainingSeconds}s`);
  }

  return parts.join(' ');
}

/**
 * Format duration in seconds to human-readable string
 *
 * @param durationSec - Duration in seconds
 * @param verbose - Use verbose format (default: false)
 * @returns Duration string
 */
export function formatDurationSeconds(durationSec: number, verbose: boolean = false): string {
  return formatDuration(durationSec * 1000, verbose);
}

/**
 * Check if date is today
 *
 * @param date - Date to check
 * @returns True if date is today
 */
export function isToday(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();
  return (
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
  );
}

/**
 * Check if date is yesterday
 *
 * @param date - Date to check
 * @returns True if date is yesterday
 */
export function isYesterday(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return (
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear()
  );
}

/**
 * Check if date is within last N days
 *
 * @param date - Date to check
 * @param days - Number of days
 * @returns True if within range
 */
export function isWithinLastNDays(date: Date | string, days: number): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= days;
}

/**
 * Get start of day
 *
 * @param date - Date to process
 * @returns Date at start of day (00:00:00)
 */
export function getStartOfDay(date: Date | string = new Date()): Date {
  const d = typeof date === 'string' ? new Date(date) : new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get end of day
 *
 * @param date - Date to process
 * @returns Date at end of day (23:59:59)
 */
export function getEndOfDay(date: Date | string = new Date()): Date {
  const d = typeof date === 'string' ? new Date(date) : new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Add days to date
 *
 * @param date - Starting date
 * @param days - Number of days to add (can be negative)
 * @returns New date
 */
export function addDays(date: Date | string, days: number): Date {
  const d = typeof date === 'string' ? new Date(date) : new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Add hours to date
 *
 * @param date - Starting date
 * @param hours - Number of hours to add (can be negative)
 * @returns New date
 */
export function addHours(date: Date | string, hours: number): Date {
  const d = typeof date === 'string' ? new Date(date) : new Date(date);
  d.setHours(d.getHours() + hours);
  return d;
}

/**
 * Add minutes to date
 *
 * @param date - Starting date
 * @param minutes - Number of minutes to add (can be negative)
 * @returns New date
 */
export function addMinutes(date: Date | string, minutes: number): Date {
  const d = typeof date === 'string' ? new Date(date) : new Date(date);
  d.setMinutes(d.getMinutes() + minutes);
  return d;
}

/**
 * Get difference between dates in days
 *
 * @param date1 - First date
 * @param date2 - Second date
 * @returns Number of days difference
 */
export function getDaysDifference(date1: Date | string, date2: Date | string): number {
  const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
  const d2 = typeof date2 === 'string' ? new Date(date2) : date2;
  const diffMs = Math.abs(d1.getTime() - d2.getTime());
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Format date range
 *
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Formatted date range string
 *
 * @example
 * ```typescript
 * formatDateRange(new Date('2024-01-01'), new Date('2024-01-31'))
 * // "January 1 - 31, 2024"
 * ```
 */
export function formatDateRange(startDate: Date | string, endDate: Date | string): string {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;

  // Same day
  if (
    start.getDate() === end.getDate() &&
    start.getMonth() === end.getMonth() &&
    start.getFullYear() === end.getFullYear()
  ) {
    return formatDate(start);
  }

  // Same month and year
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    const month = start.toLocaleDateString('en-US', { month: 'long' });
    return `${month} ${start.getDate()} - ${end.getDate()}, ${start.getFullYear()}`;
  }

  // Same year
  if (start.getFullYear() === end.getFullYear()) {
    const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
    const endMonth = end.toLocaleDateString('en-US', { month: 'short' });
    return `${startMonth} ${start.getDate()} - ${endMonth} ${end.getDate()}, ${start.getFullYear()}`;
  }

  // Different years
  return `${formatShortDate(start)} - ${formatShortDate(end)}`;
}
