/**
 * Provider Registry
 * Central configuration for all AI providers
 */

import { API_ENDPOINTS } from '../api-endpoints.ts';

export interface ProviderConfig {
  name: string;
  webhook: string;
  recovery?: string;
  statusEndpoint?: string;
  supports: ('image' | 'video' | 'audio')[];
  requiresWebhook: boolean;
}

export const PROVIDERS: Record<string, ProviderConfig> = {
  'kie_ai': {
    name: 'Primary AI',
    webhook: '/functions/v1/webhooks/kie-webhook',
    recovery: '/functions/v1/recovery/recover-kie-generation',
    statusEndpoint: API_ENDPOINTS.KIE_AI.queryTaskUrl,
    supports: ['image', 'video', 'audio'],
    requiresWebhook: true
  },
  'runware': {
    name: 'Runware',
    webhook: '/functions/v1/webhooks/runware-webhook',
    recovery: '/functions/v1/recovery/recover-runware-generation',
    supports: ['image', 'video'],
    requiresWebhook: false // Sync provider
  },
  'midjourney': {
    name: 'Midjourney',
    webhook: '/functions/v1/webhooks/midjourney-webhook',
    recovery: '/functions/v1/recovery/recover-kie-generation', // Uses KIE recovery
    supports: ['image'],
    requiresWebhook: true
  },
  'lovable_ai_sync': {
    name: 'Lovable AI (Sync)',
    webhook: '', // Not needed for sync
    supports: ['image'],
    requiresWebhook: false // Synchronous provider
  }
};

/**
 * Get provider config by name
 */
export function getProviderConfig(provider: string): ProviderConfig | null {
  return PROVIDERS[provider] || null;
}

/**
 * Check if provider supports content type
 */
export function providerSupports(provider: string, contentType: 'image' | 'video' | 'audio'): boolean {
  const config = getProviderConfig(provider);
  return config?.supports.includes(contentType) || false;
}
