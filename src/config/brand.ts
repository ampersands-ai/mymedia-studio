/**
 * White-Label Brand Configuration
 *
 * Supports two deployment modes:
 *
 * 1. PLATFORM MODE (mybrand.mymedia.studio)
 *    - Multi-tenant: brand config loaded from Supabase `brands` table
 *    - Resolved at runtime from the subdomain or custom domain
 *    - Managed via BrandProvider context
 *
 * 2. CUSTOM DOMAIN MODE (mybrand.com)
 *    - Standalone deployment: brand config from environment variables
 *    - Set NEXT_PUBLIC_BRAND_* variables in .env
 *
 * The mode is auto-detected:
 *   - If hostname matches *.NEXT_PUBLIC_PLATFORM_DOMAIN → platform mode
 *   - Otherwise → env mode (custom domain)
 *
 * Components should use:
 *   import { useBrand } from '@/contexts/BrandContext';
 *   const brand = useBrand();
 *
 * For non-React code that needs static access (SEO schemas, etc.),
 * use the exported `brand` object which is the env-based default.
 */

// ─── Types ─────────────────────────────────────────────────────────────

export interface BrandConfig {
  // Identity
  name: string;
  slug: string;
  domain: string;
  tagline: string;
  description: string;
  appUrl: string;

  // Assets
  logoPath: string;
  faviconPath: string;
  ogImage: string;

  // Contact
  supportEmail: string;
  privacyEmail: string;
  alertsEmail: string;
  noreplyEmail: string;

  // Social
  social: {
    twitter: string;
    twitterHandle: string;
    linkedin: string;
    youtube: string;
    instagram: string;
    facebook: string;
  };

  // Mobile app
  mobile: {
    appId: string;
    appName: string;
  };

  // SEO
  seo: {
    defaultTitle: string;
    titleSuffix: string;
    keywords: string;
    author: string;
  };

  // Storage keys (namespaced)
  storageKeys: {
    cookieConsent: string;
    utmParams: string;
    deviceId: string;
    theme: string;
  };

  // Theme overrides (from DB)
  theme: Record<string, string>;

  // Feature settings (from DB)
  settings: Record<string, unknown>;

  // Source of the config
  _source: 'env' | 'database';
  _brandId?: string;
}

// ─── Environment helpers ───────────────────────────────────────────────

const env = (key: string, fallback: string): string =>
  process.env[key] || fallback;

/** The platform base domain for subdomain-based tenants */
export const PLATFORM_DOMAIN = env('NEXT_PUBLIC_PLATFORM_DOMAIN', 'mymedia.studio');

// ─── Storage key helper ────────────────────────────────────────────────

function storageKeysFor(domain: string) {
  const ns = domain.replace(/\./g, '_');
  return {
    cookieConsent: `${ns}_cookie_consent`,
    utmParams: `${ns}_utm_params`,
    deviceId: `${ns}_device_id`,
    theme: 'theme',
  };
}

// ─── Default brand (from environment variables) ────────────────────────

const defaultName = env('NEXT_PUBLIC_BRAND_NAME', 'artifio.ai');
const defaultDomain = env('NEXT_PUBLIC_BRAND_DOMAIN', 'artifio.ai');

export const defaultBrand: BrandConfig = {
  name: defaultName,
  slug: env('NEXT_PUBLIC_BRAND_SLUG', 'default'),
  domain: defaultDomain,
  tagline: env('NEXT_PUBLIC_BRAND_TAGLINE', 'All-in-one AI content platform for creators'),
  description: env(
    'NEXT_PUBLIC_BRAND_DESCRIPTION',
    'Professional AI-powered platform for creating videos, images, music, and more. Generate portrait headshots, cinematic videos, product photography, and social media content instantly. Start free with 5 credits.'
  ),
  appUrl: env('NEXT_PUBLIC_BRAND_APP_URL', 'https://artifio.ai'),

  logoPath: env('NEXT_PUBLIC_BRAND_LOGO_PATH', '/logos/artifio.png'),
  faviconPath: env('NEXT_PUBLIC_BRAND_FAVICON_PATH', '/favicon.png'),
  ogImage: env('NEXT_PUBLIC_BRAND_OG_IMAGE', ''),

  supportEmail: env('NEXT_PUBLIC_BRAND_SUPPORT_EMAIL', 'support@artifio.ai'),
  privacyEmail: env('NEXT_PUBLIC_BRAND_PRIVACY_EMAIL', 'privacy@artifio.ai'),
  alertsEmail: env('NEXT_PUBLIC_BRAND_ALERTS_EMAIL', 'alerts@artifio.ai'),
  noreplyEmail: env('NEXT_PUBLIC_BRAND_NOREPLY_EMAIL', 'noreply@artifio.ai'),

  social: {
    twitter: env('NEXT_PUBLIC_BRAND_TWITTER', 'https://x.com/artifio_ai'),
    twitterHandle: env('NEXT_PUBLIC_BRAND_TWITTER_HANDLE', '@artifio_ai'),
    linkedin: env('NEXT_PUBLIC_BRAND_LINKEDIN', 'https://linkedin.com/company/artifio'),
    youtube: env('NEXT_PUBLIC_BRAND_YOUTUBE', 'https://youtube.com/@artifio'),
    instagram: env('NEXT_PUBLIC_BRAND_INSTAGRAM', 'https://www.instagram.com/artifio.ai'),
    facebook: env('NEXT_PUBLIC_BRAND_FACEBOOK', 'https://www.facebook.com/share/1F1J8UFCgr/'),
  },

  mobile: {
    appId: env('NEXT_PUBLIC_BRAND_APP_ID', 'com.artifio.create'),
    appName: env('NEXT_PUBLIC_BRAND_APP_NAME', 'Artifio Create'),
  },

  seo: {
    defaultTitle: defaultName,
    titleSuffix: defaultName,
    keywords: 'AI video generator, AI image creator, AI content creation, portrait headshots, photo editing, video creation, product photography, social media content, AI tools',
    author: defaultName,
  },

  storageKeys: storageKeysFor(defaultDomain),

  theme: {},
  settings: {},

  _source: 'env',
};

// ─── Mutable brand reference ───────────────────────────────────────────
// This is updated by BrandProvider when a DB brand is resolved.
// Non-React code can import `brand` directly for the current value.

export let brand: BrandConfig = defaultBrand;

/** Called by BrandProvider to update the global brand reference */
export function _setBrand(config: BrandConfig) {
  brand = config;
}

// ─── Helper Functions ──────────────────────────────────────────────────

/** Page title formatted with brand suffix (e.g. "Settings - MyBrand") */
export function pageTitle(page: string): string {
  return `${page} - ${brand.seo.titleSuffix}`;
}

/** mailto: link for support */
export function supportMailto(): string {
  return `mailto:${brand.supportEmail}`;
}

/** mailto: link for privacy */
export function privacyMailto(): string {
  return `mailto:${brand.privacyEmail}`;
}

/** Full URL for a path (e.g. "/pricing" -> "https://mybrand.com/pricing") */
export function brandUrl(path: string): string {
  return `${brand.appUrl}${path}`;
}

/** Download filename with brand prefix */
export function downloadFilename(type: string, ext: string): string {
  const prefix = brand.domain.replace(/\./g, '-');
  const timestamp = Date.now();
  return `${prefix}-${type}-${timestamp}.${ext}`;
}

// ─── Brand Resolution ──────────────────────────────────────────────────

/** Detect deployment mode from hostname */
export function detectBrandMode(): 'platform' | 'custom' {
  if (typeof window === 'undefined') return 'custom';
  const hostname = window.location.hostname;
  if (hostname.endsWith(`.${PLATFORM_DOMAIN}`)) {
    return 'platform';
  }
  return 'custom';
}

/** Extract slug from platform subdomain (e.g. "mybrand.mymedia.studio" -> "mybrand") */
export function extractSlugFromHostname(): string | null {
  if (typeof window === 'undefined') return null;
  const hostname = window.location.hostname;
  if (hostname.endsWith(`.${PLATFORM_DOMAIN}`)) {
    const slug = hostname.replace(`.${PLATFORM_DOMAIN}`, '');
    return slug || null;
  }
  return null;
}

/** Build a BrandConfig from a database row */
export function brandConfigFromRow(row: {
  id: string;
  slug: string;
  name: string;
  custom_domain?: string | null;
  tagline?: string | null;
  description?: string | null;
  logo_url?: string | null;
  favicon_url?: string | null;
  og_image_url?: string | null;
  support_email?: string | null;
  privacy_email?: string | null;
  alerts_email?: string | null;
  noreply_email?: string | null;
  social_links?: Record<string, string> | null;
  theme?: Record<string, string> | null;
  settings?: Record<string, unknown> | null;
}): BrandConfig {
  const domain = row.custom_domain || `${row.slug}.${PLATFORM_DOMAIN}`;
  const appUrl = `https://${domain}`;
  const social = row.social_links || {};

  return {
    name: row.name,
    slug: row.slug,
    domain,
    tagline: row.tagline || defaultBrand.tagline,
    description: row.description || defaultBrand.description,
    appUrl,

    logoPath: row.logo_url || defaultBrand.logoPath,
    faviconPath: row.favicon_url || defaultBrand.faviconPath,
    ogImage: row.og_image_url || '',

    supportEmail: row.support_email || `support@${domain}`,
    privacyEmail: row.privacy_email || `privacy@${domain}`,
    alertsEmail: row.alerts_email || `alerts@${domain}`,
    noreplyEmail: row.noreply_email || `noreply@${domain}`,

    social: {
      twitter: social.twitter || '',
      twitterHandle: social.twitterHandle || '',
      linkedin: social.linkedin || '',
      youtube: social.youtube || '',
      instagram: social.instagram || '',
      facebook: social.facebook || '',
    },

    mobile: {
      appId: `com.${row.slug}.create`,
      appName: `${row.name} Create`,
    },

    seo: {
      defaultTitle: row.name,
      titleSuffix: row.name,
      keywords: defaultBrand.seo.keywords,
      author: row.name,
    },

    storageKeys: storageKeysFor(domain),

    theme: row.theme || {},
    settings: row.settings || {},

    _source: 'database',
    _brandId: row.id,
  };
}
