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
  const { data, error } = await supabase
    .from('content_templates')
    .select('*')
    .in('id', POPULAR_TEMPLATE_IDS)
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (error) {
    console.error('Error fetching popular templates:', error);
    return [];
  }

  return (data || []) as ContentTemplate[];
};
