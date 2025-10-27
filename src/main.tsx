import { createRoot, hydrateRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { onCLS, onINP, onFCP, onLCP, onTTFB } from 'web-vitals';
import { trackSession } from './lib/analytics';
import { initPostHog } from './lib/posthog';

// Quietly unregister any old service workers
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(registration => registration.unregister());
  });
}

// Initialize theme before first render to prevent flash
try {
  const stored = localStorage.getItem('theme');
  const isDark = stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches);
  if (isDark) {
    document.documentElement.classList.add('dark');
  }
} catch (e) {
  // Fallback to system preference if localStorage fails (Safari Private, Firefox strict mode, etc.)
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.documentElement.classList.add('dark');
  }
}

// Initialize PostHog for A/B testing and analytics
initPostHog();

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

const container = document.getElementById("root")!;
if (container && container.hasChildNodes()) {
  hydrateRoot(container, <App />);
} else {
  createRoot(container).render(<App />);
}
