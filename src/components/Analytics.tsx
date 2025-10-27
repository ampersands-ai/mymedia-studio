import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Google Analytics tracking ID - Replace with your actual GA4 measurement ID
const GA_MEASUREMENT_ID = 'G-XXXXXXXXXX';

export const Analytics = () => {
  const location = useLocation();

  useEffect(() => {
    // Defer Google Analytics initialization to improve initial load performance
    if (typeof window !== 'undefined') {
      let hasLoaded = false;
      
      const loadAnalytics = () => {
        if (hasLoaded) return;
        hasLoaded = true;
        
        // Load GA script
        const script = document.createElement('script');
        script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
        script.async = true;
        document.head.appendChild(script);

        // Initialize dataLayer
        window.dataLayer = window.dataLayer || [];
        function gtag(...args: any[]) {
          window.dataLayer.push(args);
        }
        gtag('js', new Date());
        gtag('config', GA_MEASUREMENT_ID, {
          send_page_view: false // We'll send page views manually
        });

        // Store gtag in window for later use
        (window as any).gtag = gtag;
      };

      // Wait for page load + 5 seconds OR first user interaction
      const handleInteraction = () => {
        loadAnalytics();
        window.removeEventListener('scroll', handleInteraction);
        window.removeEventListener('click', handleInteraction);
      };

      if (document.readyState === 'complete') {
        // Page already loaded, defer 5s or until interaction
        if ('requestIdleCallback' in window) {
          requestIdleCallback(loadAnalytics, { timeout: 5000 });
        } else {
          setTimeout(loadAnalytics, 5000);
        }
        window.addEventListener('scroll', handleInteraction, { once: true, passive: true });
        window.addEventListener('click', handleInteraction, { once: true });
      } else {
        // Wait for page load
        window.addEventListener('load', () => {
          if ('requestIdleCallback' in window) {
            requestIdleCallback(loadAnalytics, { timeout: 5000 });
          } else {
            setTimeout(loadAnalytics, 5000);
          }
        });
      }
    }
  }, []);

  useEffect(() => {
    // Track page views on route change
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'page_view', {
        page_path: location.pathname + location.search,
        page_title: document.title,
      });
    }
  }, [location]);

  return null;
};

// Custom event tracking helper
export const trackEvent = (eventName: string, eventParams?: Record<string, any>) => {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', eventName, eventParams);
  }
};

// Extend Window interface for TypeScript
declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}
