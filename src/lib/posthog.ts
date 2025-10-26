import posthog from 'posthog-js';

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY;
const POSTHOG_HOST = 'https://app.posthog.com';

export const initPostHog = () => {
  if (POSTHOG_KEY && typeof window !== 'undefined') {
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      loaded: (posthog) => {
        if (import.meta.env.DEV) {
          console.log('PostHog initialized');
        }
      },
      capture_pageview: false, // We'll handle this manually with router
      autocapture: false, // Manual tracking for better control
      enable_recording_console_log: true, // Record console logs in session replays
      session_recording: {
        recordCrossOriginIframes: true,
      },
      advanced_disable_decide: false, // Enable feature flags
    });
  }
};

// Track events
export const trackEvent = (eventName: string, properties?: Record<string, any>) => {
  if (posthog.__loaded) {
    posthog.capture(eventName, properties);
  }
};

// Identify user
export const identifyUser = (userId: string, properties?: Record<string, any>) => {
  if (posthog.__loaded) {
    posthog.identify(userId, properties);
  }
};

// Set user properties
export const setUserProperties = (properties: Record<string, any>) => {
  if (posthog.__loaded) {
    posthog.people.set(properties);
  }
};

// Track page views
export const trackPageView = (path: string) => {
  if (posthog.__loaded) {
    posthog.capture('$pageview', { $current_url: path });
  }
};

// Reset on logout
export const resetPostHog = () => {
  if (posthog.__loaded) {
    posthog.reset();
  }
};

// Feature flags
export const getFeatureFlag = (flagKey: string): string | boolean | undefined => {
  if (posthog.__loaded) {
    return posthog.getFeatureFlag(flagKey);
  }
  return undefined;
};

export const isFeatureEnabled = (flagKey: string): boolean => {
  if (posthog.__loaded) {
    return posthog.isFeatureEnabled(flagKey) ?? false;
  }
  return false;
};

export { posthog };
