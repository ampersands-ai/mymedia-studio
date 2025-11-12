/**
 * Service Worker Registration Helper
 * Only registers in production to avoid dev issues
 */

import { logger } from '@/lib/logger';

export function registerServiceWorker() {
  // ✅ ONLY register in production
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          logger.info('Service Worker registered successfully', {
            utility: 'serviceWorker',
            scope: registration.scope,
            operation: 'registerServiceWorker'
          });

          // Check for updates every hour
          setInterval(() => {
            registration.update();
          }, 60 * 60 * 1000);

          // Notify user when update is available
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            newWorker?.addEventListener('statechange', () => {
              if (
                newWorker.state === 'installed' &&
                navigator.serviceWorker.controller
              ) {
                showUpdateNotification();
              }
            });
          });
        })
        .catch((err) => {
          logger.error('Service Worker registration failed', err, {
            utility: 'serviceWorker',
            operation: 'registerServiceWorker'
          });
        });
    });
  }
}

/**
 * Auto-unregister service worker in dev mode
 */
export function unregisterServiceWorker() {
  if (import.meta.env.DEV && 'serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      if (registrations.length > 0) {
        logger.warn('Service Worker active in dev mode, auto-unregistering', {
          utility: 'serviceWorker',
          registrationCount: registrations.length,
          operation: 'unregisterServiceWorker'
        });
        registrations.forEach((reg) => reg.unregister());
      }
    });
  }
}

/**
 * Show update notification banner
 */
function showUpdateNotification() {
  const banner = document.createElement('div');
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
    ">
      <p style="margin: 0 0 8px 0; font-weight: 600;">New version available!</p>
      <button
        onclick="window.location.reload()"
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
    </div>
  `;
  document.body.appendChild(banner);
}

/**
 * Clear all caches and reload (admin use)
 */
export async function clearAllCaches() {
  if ('serviceWorker' in navigator) {
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
  }
}
