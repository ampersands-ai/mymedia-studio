/**
 * Shared brand configuration for Edge Functions.
 *
 * Supports two resolution modes:
 * 1. Platform mode: resolves brand from request origin subdomain (mybrand.mymedia.studio)
 * 2. Custom domain mode: resolves from custom_domain column or env var defaults (mybrand.com)
 *
 * Usage in edge functions:
 *   import { getBrandForRequest, brandFrom } from '../_shared/brand.ts';
 *   const brand = await getBrandForRequest(req);
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ─── Environment-based defaults ───────────────────────────────────────

const env = (key: string, fallback: string): string =>
  Deno.env.get(key) || fallback;

export const PLATFORM_DOMAIN = env('PLATFORM_DOMAIN', 'mymedia.studio');

export const edgeBrand = {
  name: env('BRAND_NAME', 'artifio.ai'),
  domain: env('BRAND_DOMAIN', 'artifio.ai'),
  appUrl: env('BRAND_APP_URL', 'https://artifio.ai'),
  supportEmail: env('BRAND_SUPPORT_EMAIL', 'support@artifio.ai'),
  privacyEmail: env('BRAND_PRIVACY_EMAIL', 'privacy@artifio.ai'),
  alertsEmail: env('BRAND_ALERTS_EMAIL', 'alerts@artifio.ai'),
  noreplyEmail: env('BRAND_NOREPLY_EMAIL', 'noreply@artifio.ai'),
  devEmail: env('BRAND_DEV_EMAIL', 'dev@artifio.ai'),
};

// ─── Helpers ──────────────────────────────────────────────────────────

/** Build a branded "From" header like "MyBrand Alerts <alerts@domain.com>" */
export function brandFrom(label: string, email?: string): string {
  return `${edgeBrand.name} ${label} <${email || edgeBrand.noreplyEmail}>`;
}

/** Build a full URL from a path using default brand */
export function brandUrl(path: string): string {
  return `${edgeBrand.appUrl}${path}`;
}

// ─── Resolved brand type ──────────────────────────────────────────────

export interface ResolvedBrand {
  id: string;
  name: string;
  slug: string;
  domain: string;
  appUrl: string;
  supportEmail: string;
  privacyEmail: string;
  alertsEmail: string;
  noreplyEmail: string;
}

// ─── Brand resolution from request ────────────────────────────────────

/**
 * Resolve brand from the request Origin/Referer.
 * Checks subdomain (mybrand.mymedia.studio) or custom domain (mybrand.com).
 * Returns null if no brand found in DB.
 */
async function resolveBrandFromRequest(req: Request): Promise<ResolvedBrand | null> {
  const origin = req.headers.get('Origin') || req.headers.get('Referer') || '';
  if (!origin) return null;

  let hostname: string;
  try {
    hostname = new URL(origin).hostname;
  } catch {
    return null;
  }

  if (hostname === 'localhost' || hostname === '127.0.0.1') return null;

  let slug: string | null = null;
  let customDomain: string | null = null;

  if (hostname.endsWith(`.${PLATFORM_DOMAIN}`)) {
    slug = hostname.replace(`.${PLATFORM_DOMAIN}`, '');
  } else {
    customDomain = hostname;
  }

  if (!slug && !customDomain) return null;

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    if (!supabaseUrl || !serviceRoleKey) return null;

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    let query = supabase
      .from('brands')
      .select('id, slug, name, custom_domain, support_email, privacy_email, alerts_email, noreply_email')
      .eq('is_active', true);

    if (slug) {
      query = query.eq('slug', slug);
    } else if (customDomain) {
      query = query.eq('custom_domain', customDomain);
    }

    const { data, error } = await query.single();
    if (error || !data) return null;

    const domain = data.custom_domain || `${data.slug}.${PLATFORM_DOMAIN}`;
    return {
      id: data.id,
      name: data.name,
      slug: data.slug,
      domain,
      appUrl: `https://${domain}`,
      supportEmail: data.support_email || `support@${domain}`,
      privacyEmail: data.privacy_email || `privacy@${domain}`,
      alertsEmail: data.alerts_email || `alerts@${domain}`,
      noreplyEmail: data.noreply_email || `noreply@${domain}`,
    };
  } catch {
    return null;
  }
}

/**
 * Get brand config for an edge function request.
 * Tries DB resolution first, falls back to env-based defaults.
 */
export async function getBrandForRequest(req: Request): Promise<ResolvedBrand> {
  const resolved = await resolveBrandFromRequest(req);
  if (resolved) return resolved;

  return {
    id: '',
    name: edgeBrand.name,
    slug: 'default',
    domain: edgeBrand.domain,
    appUrl: edgeBrand.appUrl,
    supportEmail: edgeBrand.supportEmail,
    privacyEmail: edgeBrand.privacyEmail,
    alertsEmail: edgeBrand.alertsEmail,
    noreplyEmail: edgeBrand.noreplyEmail,
  };
}
