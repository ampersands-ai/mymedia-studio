// Type definitions for browser extensions and global objects

interface PostHog {
  capture: (event: string, properties?: Record<string, unknown>) => void;
  identify: (userId: string, properties?: Record<string, unknown>) => void;
  reset: () => void;
}

interface MemoryInfo {
  jsHeapSizeLimit: number;
  totalJSHeapSize: number;
  usedJSHeapSize: number;
}

interface NetworkInformation {
  downlink: number;
  effectiveType: '4g' | '3g' | '2g' | 'slow-2g';
  rtt: number;
  saveData: boolean;
}

declare global {
  interface Window {
    posthog?: PostHog;
  }

  interface Performance {
    memory?: MemoryInfo;
  }

  interface Navigator {
    connection?: NetworkInformation;
  }
}

export {};
