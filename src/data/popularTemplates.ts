import { supabase } from "@/integrations/supabase/client";
import type { ContentTemplate } from "@/hooks/useTemplates";

// Popular template IDs - manually curated based on usage and versatility
export const POPULAR_TEMPLATE_IDS = [
  'portrait-headshots',
  'product-photos',
  'social-media-content'
];

export const getPopularTemplates = async (): Promise<ContentTemplate[]> => {
  const { data, error } = await supabase
    .from('content_templates')
    .select('*, ai_models(*)')
    .eq('is_active', true)
    .order('display_order', { ascending: true })
    .limit(3);

  if (error) {
    console.error('Error fetching popular templates:', error);
    return [];
  }

  return data as ContentTemplate[];
};
