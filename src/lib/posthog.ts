import posthog from 'posthog-js';
import { logger } from '@/lib/logger';
import { brand } from '@/config/brand';

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY;
const POSTHOG_HOST = 'https://app.posthog.com';
const DEVICE_ID_KEY = brand.storageKeys.deviceId;

// Generate or retrieve unique device identifier
const getDeviceId = (): string => {
  if (typeof window === 'undefined') return '';
  
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  
  if (!deviceId) {
    // Generate random 12-character alphanumeric ID
    deviceId = Array.from({ length: 12 }, () => 
      'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 36)]
    ).join('');
    
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
    logger.debug('Generated new PostHog device ID', {
      utility: 'posthog',
      deviceIdLength: deviceId.length,
      operation: 'getDeviceId'
    });
  }
  
  return deviceId;
};

export const initPostHog = () => {
  if (POSTHOG_KEY && typeof window !== 'undefined') {
    const deviceId = getDeviceId();
    
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      loaded: () => {
        if (import.meta.env.DEV) {
          logger.debug('PostHog analytics initialized', {
            utility: 'posthog',
            deviceId,
            platform: brand.name,
            operation: 'initPostHog'
          });
        }
      },
      capture_pageview: false, // We'll handle this manually with router
      autocapture: false, // Manual tracking for better control
      persistence: 'localStorage',
      bootstrap: {
        distinctID: deviceId, // Use our custom device ID
      },
    });
    
    // Set device ID as a super property for all events
    posthog.register({
      device_id: deviceId,
      platform: brand.name,
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
    const deviceId = getDeviceId();
    posthog.identify(userId, {
      ...properties,
      device_id: deviceId,
    });
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

// Reset on logout (but keep device ID)
export const resetPostHog = () => {
  if (posthog.__loaded) {
    const deviceId = getDeviceId();
    posthog.reset();
    // Re-identify with device ID after reset
    posthog.identify(deviceId);
    posthog.register({
      device_id: deviceId,
      platform: brand.name,
    });
  }
};

// Export device ID getter for use in other parts of the app
export const getArtifioDeviceId = getDeviceId;

export { posthog };
