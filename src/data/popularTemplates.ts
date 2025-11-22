import type { ContentTemplate } from "@/hooks/useTemplates";

/**
 * DEPRECATED - content_templates table deleted
 *
 * Popular templates feature disabled as part of database elimination.
 * Users should select models directly from .ts registry instead.
 */

// Popular template IDs - DEPRECATED (no longer used)
export const POPULAR_TEMPLATE_IDS = [
  'portrait-headshots',
  'product-photos',
  'social-media-content'
];

export const getPopularTemplates = async (): Promise<ContentTemplate[]> => {
  // content_templates table deleted - return empty array
  return [];
};
