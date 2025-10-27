import { createRoot, hydrateRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerServiceWorker, unregisterServiceWorker } from "./lib/serviceWorker";
import { onCLS, onINP, onFCP, onLCP, onTTFB } from 'web-vitals';
import { trackSession } from './lib/analytics';
import { initPostHog } from './lib/posthog';

// Initialize theme before first render to prevent flash
const stored = localStorage.getItem('theme');
const isDark = stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches);
if (isDark) {
  document.documentElement.classList.add('dark');
}

// Initialize PostHog for A/B testing and analytics
initPostHog();

// Service worker temporarily disabled to prevent cache issues
// registerServiceWorker();

// Auto-unregister in dev mode and clear any existing SW
unregisterServiceWorker();

// Track session metrics
trackSession();

// Track Web Vitals
function sendToAnalytics(metric: any) {
  if (import.meta.env.DEV) {
    console.log('Web Vital:', metric.name, metric.value, metric.rating);
  }
  // Send to PostHog if available
  if (typeof window !== 'undefined' && (window as any).posthog) {
    (window as any).posthog.capture('web_vital', {
      metric_name: metric.name,
      value: metric.value,
      rating: metric.rating
    });
  }
}

onCLS(sendToAnalytics);
onINP(sendToAnalytics); // Replaces FID in web-vitals v4
onFCP(sendToAnalytics);
onLCP(sendToAnalytics);
onTTFB(sendToAnalytics);

// Global chunk error handler - recover from failed dynamic imports
window.addEventListener('error', (e) => {
  const msg = String((e as any).message || '');
  if (msg.includes('Loading chunk') || msg.includes('import()') || msg.includes('dynamically imported')) {
    console.warn('[Boot] Chunk load failed, reloading with cache-bust');
    const u = new URL(window.location.href);
    u.searchParams.set('v', String(Date.now()));
    window.location.replace(u.toString());
  }
});

const container = document.getElementById("root")!;
console.log('[Boot] Rendering React app');

if (container && container.hasChildNodes()) {
  hydrateRoot(container, <App />);
} else {
  createRoot(container).render(<App />);
}

// Signal successful boot
console.log('[Boot] React render complete');
(window as any).__APP_MOUNTED = true;
