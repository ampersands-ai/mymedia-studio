import type { ContentTemplate } from "@/hooks/useTemplates";
import { supabase } from "@/integrations/supabase/client";

/**
 * Popular template IDs
 * Templates reference models from .ts registry via model_record_id
 */
export const POPULAR_TEMPLATE_IDS = [
  'portrait-headshots',
  'product-photos',
  'social-media-content'
];

export const getPopularTemplates = async (): Promise<ContentTemplate[]> => {
  // content_templates table deleted - return empty array
  // Popular templates are now in workflow_templates table
  return [];
};
