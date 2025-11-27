// Web Vitals tracking for performance monitoring
// Uses native browser APIs - no external dependencies needed

import { logger } from '@/lib/logger';

interface WebVitalMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
}

interface PostHogWindow {
  posthog?: {
    capture: (event: string, properties: Record<string, unknown>) => void;
  };
}

function sendToAnalytics(metric: WebVitalMetric) {
  // Send to analytics service (PostHog, etc.)
  if (typeof window !== 'undefined' && (window as unknown as PostHogWindow).posthog) {
    (window as unknown as PostHogWindow).posthog?.capture('web_vital', {
      name: metric.name,
      value: metric.value,
      rating: metric.rating
    });
  }
  
  // Console log in development
  if (import.meta.env.DEV) {
    logger.debug('Web Vital measurement', {
      utility: 'webVitals',
      metric: metric.name,
      value: Math.round(metric.value),
      rating: metric.rating,
      operation: 'sendToAnalytics'
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
        const lastEntry = entries[entries.length - 1] as PerformanceEntry & { renderTime?: number; loadTime?: number };
        const value = lastEntry.renderTime || lastEntry.loadTime || 0;
        
        sendToAnalytics({
          name: 'LCP',
          value,
          rating: getRating('LCP', value),
          delta: value
        });
      });
      
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch (e) {
      logger.warn('LCP Performance Observer failed', {
        utility: 'webVitals',
        error: e instanceof Error ? e.message : 'Unknown error',
        operation: 'reportWebVitals'
      });
    }
    
    // FID - First Input Delay
    try {
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: PerformanceEntry & { processingStart?: number }) => {
          const value = (entry.processingStart || 0) - entry.startTime;
          
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
      logger.warn('FID Performance Observer failed', {
        utility: 'webVitals',
        error: e instanceof Error ? e.message : 'Unknown error',
        operation: 'reportWebVitals'
      });
    }
    
    // CLS - Cumulative Layout Shift
    try {
      let clsValue = 0;
      
      const clsObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: PerformanceEntry & { hadRecentInput?: boolean; value?: number }) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value || 0;
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
      logger.warn('CLS Performance Observer failed', {
        utility: 'webVitals',
        error: e instanceof Error ? e.message : 'Unknown error',
        operation: 'reportWebVitals'
      });
    }
    
    // FCP - First Contentful Paint
    try {
      const fcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: PerformanceEntry) => {
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
      logger.warn('FCP Performance Observer failed', {
        utility: 'webVitals',
        error: e instanceof Error ? e.message : 'Unknown error',
        operation: 'reportWebVitals'
      });
    }
  }
  
  // TTFB - Time to First Byte (using Navigation Timing)
  if ('performance' in window && 'getEntriesByType' in performance) {
    const navigationEntries = performance.getEntriesByType('navigation');
    if (navigationEntries.length > 0) {
      const entry = navigationEntries[0] as PerformanceEntry & { responseStart?: number; requestStart?: number };
      const ttfb = (entry.responseStart || 0) - (entry.requestStart || 0);
      
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
          logger.warn('Long task detected - performance bottleneck', {
            utility: 'webVitals',
            duration: Math.round(entry.duration),
            startTime: entry.startTime,
            operation: 'monitorPerformance'
          });
        }
      }
    });
    
    longTaskObserver.observe({ entryTypes: ['longtask'] });
  } catch {
    // Browser doesn't support longtask
  }
}
