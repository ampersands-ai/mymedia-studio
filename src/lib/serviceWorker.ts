/**
 * Service Worker Registration Helper
 * Uses Workbox via vite-plugin-pwa for automatic registration
 * Only registers in production to avoid dev issues
 */

import { logger } from '@/lib/logger';
import { registerSW } from 'virtual:pwa-register';

// Store update function for manual updates
let updateSW: ((reloadPage?: boolean) => Promise<void>) | null = null;

/**
 * Register the Workbox-powered service worker
 * This uses vite-plugin-pwa's auto-generated service worker
 */
export function registerServiceWorker() {
  // Check for bots FIRST before any other checks
  const userAgent = navigator.userAgent;
  const isBotUA = /googlebot|bingbot|yandex|baiduspider|facebookexternalhit|twitterbot|rogerbot|linkedinbot|embedly|quora link preview|showyoubot|outbrain|pinterest|slackbot|vkshare|w3c_validator|lighthouse|applebot|duckduckbot|semrushbot|ahrefsbot|mj12bot|dotbot|petalbot|bytespider|chrome-lighthouse|pagespeed|headlesschrome/i.test(userAgent);
  const isHeadless = navigator.webdriver === true;
  const isAutomated = /headless|phantom|puppeteer|selenium/i.test(userAgent);
  
  // Silently skip for bots - they don't support service workers
  if (isBotUA || isHeadless || isAutomated) {
    return;
  }
  
  // Skip service worker in iframe or dev mode
  const isInIframe = window.self !== window.top;
  const isDevEnvironment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  // Only register in production and not in preview iframe
  if (process.env.NODE_ENV === 'production' && !isInIframe && !isDevEnvironment) {
    updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        // New content available, show update notification
        showUpdateNotification();
      },
      onOfflineReady() {
        logger.info('App is ready to work offline', {
          utility: 'serviceWorker',
          operation: 'offlineReady'
        });
      },
      onRegistered(registration) {
        if (registration) {
          logger.info('Service Worker registered successfully', {
            utility: 'serviceWorker',
            scope: registration.scope,
            operation: 'registerServiceWorker'
          });
          
          // Check for updates every hour
          setInterval(() => {
            registration.update();
          }, 60 * 60 * 1000);
        }
      },
      onRegisterError(error) {
        // Don't log errors from bots - they can't use service workers anyway
        const ua = navigator.userAgent;
        const isBotError = /googlebot|bingbot|lighthouse|pagespeed|headlesschrome/i.test(ua);
        if (isBotError || navigator.webdriver === true) {
          return; // Silently ignore bot errors
        }
        
        logger.error('Service Worker registration failed', error, {
          utility: 'serviceWorker',
          operation: 'registerServiceWorker'
        });
      }
    });
  }
}

/**
 * Auto-unregister service worker in dev mode
 */
export async function unregisterServiceWorker() {
  if (process.env.NODE_ENV === 'development' && 'serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      if (registrations.length > 0) {
        logger.warn('Service Worker active in dev mode, auto-unregistering', {
          utility: 'serviceWorker',
          registrationCount: registrations.length,
          operation: 'unregisterServiceWorker'
        });
        registrations.forEach((reg) => reg.unregister());
      }
    } catch (err) {
      logger.error('Failed to unregister service workers', err as Error, {
        utility: 'serviceWorker',
        operation: 'unregisterServiceWorker'
      });
    }
  }
}

/**
 * Cleanup function - no-op now as Workbox handles cleanup
 */
export function cleanupServiceWorker() {
  // Workbox handles cleanup automatically
}

/**
 * Show update notification banner
 */
function showUpdateNotification() {
  const banner = document.createElement('div');
  banner.id = 'sw-update-banner';
  banner.innerHTML = `
    <div style="
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: hsl(271 81% 56%);
      color: white;
      padding: 16px 24px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      z-index: 9999;
      font-family: 'Space Grotesk', sans-serif;
      animation: slideIn 0.3s ease-out;
    ">
      <style>
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      </style>
      <p style="margin: 0 0 8px 0; font-weight: 600;">New version available!</p>
      <div style="display: flex; gap: 8px;">
        <button
          onclick="window.__updateSW && window.__updateSW()"
          style="
            background: white;
            color: hsl(271 81% 56%);
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-weight: 600;
            font-family: 'Space Grotesk', sans-serif;
          "
        >
          Update Now
        </button>
        <button
          onclick="this.parentElement.parentElement.parentElement.remove()"
          style="
            background: transparent;
            color: white;
            border: 1px solid white;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-weight: 600;
            font-family: 'Space Grotesk', sans-serif;
          "
        >
          Later
        </button>
      </div>
    </div>
  `;
  
  // Expose update function globally for the button
  (window as unknown as { __updateSW?: () => void }).__updateSW = () => {
    if (updateSW) {
      updateSW(true);
    } else {
      window.location.reload();
    }
  };
  
  document.body.appendChild(banner);
}

/**
 * Clear all caches and reload (admin use)
 */
export async function clearAllCaches() {
  if ('serviceWorker' in navigator) {
    try {
      // Unregister service worker
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((reg) => reg.unregister()));

      // Clear all caches
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));

      // Clear storage
      localStorage.clear();
      sessionStorage.clear();

      logger.info('All caches and storage cleared', {
        utility: 'serviceWorker',
        cacheCount: cacheNames.length,
        registrationCount: registrations.length,
        operation: 'clearAllCaches'
      });
      window.location.reload();
    } catch (err) {
      logger.error('Failed to clear caches', err as Error, {
        utility: 'serviceWorker',
        operation: 'clearAllCaches'
      });
      throw err;
    }
  }
}
