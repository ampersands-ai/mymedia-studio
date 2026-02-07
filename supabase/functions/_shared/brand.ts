/**
 * Shared brand configuration for Edge Functions.
 * Values are read from Supabase project environment variables.
 * Set these in: Supabase Dashboard > Settings > Edge Functions > Environment Variables
 */

const env = (key: string, fallback: string): string =>
  Deno.env.get(key) || fallback;

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

/** Build a branded "From" header like "Artifio Alerts <alerts@domain.com>" */
export function brandFrom(label: string, email?: string): string {
  return `${edgeBrand.name} ${label} <${email || edgeBrand.noreplyEmail}>`;
}

/** Build a full URL from a path */
export function brandUrl(path: string): string {
  return `${edgeBrand.appUrl}${path}`;
}
