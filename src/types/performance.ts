/**
 * Type-safe performance monitoring definitions
 * 
 * Provides complete type safety for browser performance monitoring,
 * including memory usage and other metrics.
 */

/**
 * Chrome memory information (non-standard API)
 */
export interface PerformanceMemory {
  jsHeapSizeLimit: number;
  totalJSHeapSize: number;
  usedJSHeapSize: number;
}

/**
 * Extended Performance interface with memory
 */
export interface PerformanceWithMemory extends Performance {
  memory?: PerformanceMemory;
}

/**
 * Capacitor App plugin listener handle
 */
export interface AppPluginListenerHandle {
  remove: () => Promise<void>;
}

/**
 * Capacitor App state change info
 */
export interface AppStateChangeInfo {
  isActive: boolean;
}

/**
 * Type guard to check if performance has memory info
 */
export function hasMemoryInfo(perf: Performance): perf is PerformanceWithMemory {
  return 'memory' in perf && typeof (perf as PerformanceWithMemory).memory === 'object';
}

/**
 * Safely get memory usage
 */
export function getMemoryUsage(perf: Performance): number | null {
  if (!hasMemoryInfo(perf) || !perf.memory) return null;
  return Math.round(perf.memory.usedJSHeapSize / 1048576); // Convert to MB
}
