/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

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

// PWA virtual module declarations
declare module 'virtual:pwa-register' {
  export interface RegisterSWOptions {
    immediate?: boolean;
    onNeedRefresh?: () => void;
    onOfflineReady?: () => void;
    onRegistered?: (registration: ServiceWorkerRegistration | undefined) => void;
    onRegisterError?: (error: Error) => void;
  }

  export function registerSW(options?: RegisterSWOptions): (reloadPage?: boolean) => Promise<void>;
}
