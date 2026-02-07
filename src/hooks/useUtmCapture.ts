import { useEffect, useCallback } from 'react';
import { brand } from '@/config/brand';

/**
 * UTM parameters for acquisition tracking
 * Privacy-first: stored in sessionStorage, no PII captured
 */
export interface UtmParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  referral_code?: string;
  landing_page?: string;
  device_type?: 'mobile' | 'tablet' | 'desktop';
}

const UTM_STORAGE_KEY = brand.storageKeys.utmParams;

/**
 * Detect device type from user agent (privacy-safe, no raw UA stored)
 */
function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  const ua = navigator.userAgent.toLowerCase();
  if (/mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(ua)) {
    return 'mobile';
  }
  if (/tablet|ipad|playbook|silk/i.test(ua)) {
    return 'tablet';
  }
  return 'desktop';
}

/**
 * Extract UTM parameters from URL search params
 */
function extractUtmFromUrl(): Partial<UtmParams> {
  const params = new URLSearchParams(window.location.search);
  const utm: Partial<UtmParams> = {};
  
  // Standard UTM params
  const source = params.get('utm_source');
  const medium = params.get('utm_medium');
  const campaign = params.get('utm_campaign');
  const term = params.get('utm_term');
  const content = params.get('utm_content');
  const ref = params.get('ref') || params.get('referral');
  
  if (source) utm.utm_source = source.substring(0, 100);
  if (medium) utm.utm_medium = medium.substring(0, 100);
  if (campaign) utm.utm_campaign = campaign.substring(0, 200);
  if (term) utm.utm_term = term.substring(0, 200);
  if (content) utm.utm_content = content.substring(0, 200);
  if (ref) utm.referral_code = ref.substring(0, 50);
  
  return utm;
}

/**
 * Hook to capture and persist UTM parameters across page navigations
 * Stores first-touch attribution (first UTM seen in session wins)
 */
export function useUtmCapture(): void {
  useEffect(() => {
    // Only capture on initial page load, not on every navigation
    const urlUtm = extractUtmFromUrl();
    
    // Check if we already have stored UTM params
    const storedRaw = sessionStorage.getItem(UTM_STORAGE_KEY);
    
    if (Object.keys(urlUtm).length > 0) {
      // First-touch attribution: only store if no existing UTM
      if (!storedRaw) {
        const fullUtm: UtmParams = {
          ...urlUtm,
          landing_page: window.location.pathname.substring(0, 500),
          device_type: getDeviceType(),
        };
        sessionStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(fullUtm));
      }
    } else if (!storedRaw) {
      // No UTM params but first visit - store landing page and device
      const basicAttribution: UtmParams = {
        landing_page: window.location.pathname.substring(0, 500),
        device_type: getDeviceType(),
      };
      sessionStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(basicAttribution));
    }
  }, []);
}

/**
 * Get stored UTM parameters for signup
 */
export function getStoredUtmParams(): UtmParams | null {
  try {
    const stored = sessionStorage.getItem(UTM_STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as UtmParams;
  } catch {
    return null;
  }
}

/**
 * Clear stored UTM params after successful signup
 */
export function clearStoredUtmParams(): void {
  sessionStorage.removeItem(UTM_STORAGE_KEY);
}

/**
 * Hook that returns a function to get current UTM params
 */
export function useGetUtmParams() {
  return useCallback(getStoredUtmParams, []);
}
