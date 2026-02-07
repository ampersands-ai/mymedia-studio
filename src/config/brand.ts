/**
 * White-Label Brand Configuration
 *
 * This is the single source of truth for all branding across the application.
 * To white-label this application, update the values below or override them
 * via environment variables prefixed with VITE_BRAND_.
 *
 * Environment variable overrides (all optional):
 *   VITE_BRAND_NAME          - Display name (e.g. "MyBrand")
 *   VITE_BRAND_DOMAIN        - Primary domain (e.g. "mybrand.com")
 *   VITE_BRAND_TAGLINE       - Short tagline
 *   VITE_BRAND_DESCRIPTION   - SEO meta description
 *   VITE_BRAND_SUPPORT_EMAIL - Support email address
 *   VITE_BRAND_PRIVACY_EMAIL - Privacy/DPO email address
 *   VITE_BRAND_LOGO_PATH     - Path to logo asset (e.g. "/logos/mybrand.png")
 *   VITE_BRAND_FAVICON_PATH  - Path to favicon
 *   VITE_BRAND_OG_IMAGE      - Open Graph image URL
 *   VITE_BRAND_TWITTER_HANDLE- Twitter/X handle (e.g. "@mybrand")
 *   VITE_BRAND_APP_URL       - Full app URL with protocol (e.g. "https://mybrand.com")
 */

// Helper to read env with fallback
const env = (key: string, fallback: string): string =>
  import.meta.env[key] || fallback;

export const brand = {
  // ─── Identity ────────────────────────────────────────────────────────
  name: env('VITE_BRAND_NAME', 'artifio.ai'),
  domain: env('VITE_BRAND_DOMAIN', 'artifio.ai'),
  tagline: env('VITE_BRAND_TAGLINE', 'All-in-one AI content platform for creators'),
  description: env(
    'VITE_BRAND_DESCRIPTION',
    'Professional AI-powered platform for creating videos, images, music, and more. Generate portrait headshots, cinematic videos, product photography, and social media content instantly. Start free with 5 credits.'
  ),
  appUrl: env('VITE_BRAND_APP_URL', 'https://artifio.ai'),

  // ─── Assets ──────────────────────────────────────────────────────────
  logoPath: env('VITE_BRAND_LOGO_PATH', '/logos/artifio.png'),
  faviconPath: env('VITE_BRAND_FAVICON_PATH', '/favicon.png'),
  ogImage: env('VITE_BRAND_OG_IMAGE', ''),

  // ─── Contact ─────────────────────────────────────────────────────────
  supportEmail: env('VITE_BRAND_SUPPORT_EMAIL', 'support@artifio.ai'),
  privacyEmail: env('VITE_BRAND_PRIVACY_EMAIL', 'privacy@artifio.ai'),
  alertsEmail: env('VITE_BRAND_ALERTS_EMAIL', 'alerts@artifio.ai'),
  noreplyEmail: env('VITE_BRAND_NOREPLY_EMAIL', 'noreply@artifio.ai'),

  // ─── Social ──────────────────────────────────────────────────────────
  social: {
    twitter: env('VITE_BRAND_TWITTER', 'https://x.com/artifio_ai'),
    twitterHandle: env('VITE_BRAND_TWITTER_HANDLE', '@artifio_ai'),
    linkedin: env('VITE_BRAND_LINKEDIN', 'https://linkedin.com/company/artifio'),
    youtube: env('VITE_BRAND_YOUTUBE', 'https://youtube.com/@artifio'),
    instagram: env('VITE_BRAND_INSTAGRAM', 'https://www.instagram.com/artifio.ai'),
    facebook: env('VITE_BRAND_FACEBOOK', 'https://www.facebook.com/share/1F1J8UFCgr/'),
  },

  // ─── Mobile App ──────────────────────────────────────────────────────
  mobile: {
    appId: env('VITE_BRAND_APP_ID', 'com.artifio.create'),
    appName: env('VITE_BRAND_APP_NAME', 'Artifio Create'),
  },

  // ─── SEO ─────────────────────────────────────────────────────────────
  seo: {
    defaultTitle: env('VITE_BRAND_NAME', 'artifio.ai'),
    titleSuffix: env('VITE_BRAND_NAME', 'artifio.ai'),
    keywords: 'AI video generator, AI image creator, AI content creation, portrait headshots, photo editing, video creation, product photography, social media content, AI tools',
    author: env('VITE_BRAND_NAME', 'artifio.ai'),
  },

  // ─── Storage Keys (namespaced per brand to avoid conflicts) ──────────
  storageKeys: {
    cookieConsent: `${env('VITE_BRAND_DOMAIN', 'artifio.ai').replace(/\./g, '_')}_cookie_consent`,
    utmParams: `${env('VITE_BRAND_DOMAIN', 'artifio.ai').replace(/\./g, '_')}_utm_params`,
    deviceId: `${env('VITE_BRAND_DOMAIN', 'artifio.ai').replace(/\./g, '_')}_device_id`,
    theme: 'theme',
  },
} as const;

// ─── Helper Functions ────────────────────────────────────────────────────

/** Get a page title formatted with brand suffix (e.g. "Settings - artifio.ai") */
export function pageTitle(page: string): string {
  return `${page} - ${brand.seo.titleSuffix}`;
}

/** Get a mailto: link for support */
export function supportMailto(): string {
  return `mailto:${brand.supportEmail}`;
}

/** Get a mailto: link for privacy */
export function privacyMailto(): string {
  return `mailto:${brand.privacyEmail}`;
}

/** Get the full URL for a path (e.g. "/pricing" -> "https://artifio.ai/pricing") */
export function brandUrl(path: string): string {
  return `${brand.appUrl}${path}`;
}

/** Get download filename with brand prefix */
export function downloadFilename(type: string, ext: string): string {
  const prefix = brand.domain.replace(/\./g, '-');
  const timestamp = Date.now();
  return `${prefix}-${type}-${timestamp}.${ext}`;
}

export type BrandConfig = typeof brand;
