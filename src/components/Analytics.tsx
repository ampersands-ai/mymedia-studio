"use client";

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import type {
  GTagFunction,
  GTagEventParams,
  WindowWithAnalytics,
  DataLayerEntry
} from '@/types/analytics';
import { hasGTag as checkGTag } from '@/types/analytics';

// Google Analytics tracking ID - configured via environment variable
const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || '';

export const Analytics = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Defer Google Analytics initialization to improve initial load performance
    if (typeof window !== 'undefined') {
      const loadAnalytics = () => {
        // Load GA script
        const script = document.createElement('script');
        script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
        script.async = true;
        document.head.appendChild(script);

        // Initialize dataLayer
        const win = window as unknown as WindowWithAnalytics;
        win.dataLayer = win.dataLayer || [];

        const gtag: GTagFunction = function(command, ...args) {
          win.dataLayer.push([command, ...args] as DataLayerEntry);
        };

        gtag('js', new Date());
        gtag('config', GA_MEASUREMENT_ID, {
          send_page_view: false // We'll send page views manually
        });

        // Store gtag in window for later use
        win.gtag = gtag;
      };

      // Use requestIdleCallback or setTimeout to defer loading until browser is idle
      if ('requestIdleCallback' in window) {
        requestIdleCallback(loadAnalytics, { timeout: 3000 });
      } else {
        setTimeout(loadAnalytics, 3000);
      }
    }
  }, []);

  useEffect(() => {
    // Track page views on route change
    if (typeof window !== 'undefined' && checkGTag(window)) {
      const search = searchParams?.toString();
      window.gtag('event', 'page_view', {
        page_path: pathname + (search ? `?${search}` : ''),
        page_title: document.title,
      });
    }
  }, [pathname, searchParams]);

  return null;
};

// Custom event tracking helper
export const trackEvent = (eventName: string, eventParams?: GTagEventParams) => {
  if (typeof window !== 'undefined' && checkGTag(window)) {
    window.gtag('event', eventName, eventParams);
  }
};
