import { createRoot, hydrateRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerServiceWorker, unregisterServiceWorker } from "./lib/serviceWorker";
import { onCLS, onINP, onFCP, onLCP, onTTFB } from 'web-vitals';
import { logger } from '@/lib/logger';
// Validate environment on startup
import '@/lib/env';

const vitalsLogger = logger.child({ component: 'web-vitals' });

// Register service worker (production only)
registerServiceWorker();

// Auto-unregister in dev mode
unregisterServiceWorker();

// Track Web Vitals
function sendToAnalytics(metric: { name: string; value: number; rating: string }) {
  vitalsLogger.info('Web Vital measured', {
    metric: metric.name,
    value: metric.value,
    rating: metric.rating
  });
  
  // Send to PostHog if available
  if (typeof window !== 'undefined' && window.posthog) {
    window.posthog.capture('web_vital', {
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

const container = document.getElementById("root")!;
if (container && container.hasChildNodes()) {
  hydrateRoot(container, <App />);
} else {
  createRoot(container).render(<App />);
}
