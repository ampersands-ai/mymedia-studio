// Web Vitals tracking for performance monitoring
// Uses native browser APIs - no external dependencies needed

interface WebVitalMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
}

function sendToAnalytics(metric: WebVitalMetric) {
  // Send to analytics service (PostHog, etc.)
  if (typeof window !== 'undefined' && (window as any).posthog) {
    (window as any).posthog.capture('web_vital', {
      name: metric.name,
      value: metric.value,
      rating: metric.rating
    });
  }
  
  // Console log in development
  if (import.meta.env.DEV) {
    console.log(`[Web Vital] ${metric.name}:`, {
      value: `${Math.round(metric.value)}ms`,
      rating: metric.rating
    });
  }
}

function getRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
  const thresholds: Record<string, [number, number]> = {
    'CLS': [0.1, 0.25],
    'FID': [100, 300],
    'FCP': [1800, 3000],
    'LCP': [2500, 4000],
    'TTFB': [800, 1800]
  };
  
  const [good, poor] = thresholds[name] || [0, 0];
  
  if (value <= good) return 'good';
  if (value <= poor) return 'needs-improvement';
  return 'poor';
}

export function reportWebVitals() {
  // LCP - Largest Contentful Paint
  if ('PerformanceObserver' in window) {
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as any;
        const value = lastEntry.renderTime || lastEntry.loadTime;
        
        sendToAnalytics({
          name: 'LCP',
          value,
          rating: getRating('LCP', value),
          delta: value
        });
      });
      
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch (e) {
      console.warn('LCP observer failed:', e);
    }
    
    // FID - First Input Delay
    try {
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          const value = entry.processingStart - entry.startTime;
          
          sendToAnalytics({
            name: 'FID',
            value,
            rating: getRating('FID', value),
            delta: value
          });
        });
      });
      
      fidObserver.observe({ type: 'first-input', buffered: true });
    } catch (e) {
      console.warn('FID observer failed:', e);
    }
    
    // CLS - Cumulative Layout Shift
    try {
      let clsValue = 0;
      
      const clsObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });
        
        sendToAnalytics({
          name: 'CLS',
          value: clsValue,
          rating: getRating('CLS', clsValue),
          delta: clsValue
        });
      });
      
      clsObserver.observe({ type: 'layout-shift', buffered: true });
    } catch (e) {
      console.warn('CLS observer failed:', e);
    }
    
    // FCP - First Contentful Paint
    try {
      const fcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          sendToAnalytics({
            name: 'FCP',
            value: entry.startTime,
            rating: getRating('FCP', entry.startTime),
            delta: entry.startTime
          });
        });
      });
      
      fcpObserver.observe({ type: 'paint', buffered: true });
    } catch (e) {
      console.warn('FCP observer failed:', e);
    }
  }
  
  // TTFB - Time to First Byte (using Navigation Timing)
  if ('performance' in window && 'getEntriesByType' in performance) {
    const navigationEntries = performance.getEntriesByType('navigation');
    if (navigationEntries.length > 0) {
      const entry = navigationEntries[0] as any;
      const ttfb = entry.responseStart - entry.requestStart;
      
      sendToAnalytics({
        name: 'TTFB',
        value: ttfb,
        rating: getRating('TTFB', ttfb),
        delta: ttfb
      });
    }
  }
}

// Monitor long tasks (> 50ms)
export function monitorPerformance() {
  if (!('PerformanceObserver' in window)) return;
  
  // Long tasks
  try {
    const longTaskObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > 50) {
          console.warn('[Performance] Long task detected:', {
            duration: `${Math.round(entry.duration)}ms`,
            startTime: entry.startTime
          });
        }
      }
    });
    
    longTaskObserver.observe({ entryTypes: ['longtask'] });
  } catch (e) {
    // Browser doesn't support longtask
  }
}
