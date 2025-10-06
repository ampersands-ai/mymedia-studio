import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AIModel {
  id: string;
  provider: string;
  model_name: string;
  content_type: string;
  base_token_cost: number;
  cost_multipliers: any;
  input_schema: any;
  api_endpoint: string | null;
  is_active: boolean;
  groups?: string[];
  estimated_time_minutes?: number | null;
}

export interface ContentTemplate {
  id: string;
  category: string;
  name: string;
  description: string | null;
  thumbnail_url: string | null;
  model_id: string | null;
  preset_parameters: any;
  enhancement_instruction: string | null;
  display_order: number;
  is_active: boolean;
  ai_models?: AIModel;
  estimated_time_minutes?: number | null;
}

export const useTemplates = () => {
  return useQuery({
    queryKey: ["templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_templates")
        .select("*, ai_models(*)")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (error) throw error;
      return data as ContentTemplate[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  });
};

export const useTemplatesByCategory = () => {
  const { data: templates, ...rest } = useTemplates();

  const templatesByCategory = templates?.reduce((acc, template) => {
    const category = template.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(template);
    return acc;
  }, {} as Record<string, ContentTemplate[]>);

  return { templatesByCategory, templates, ...rest };
};
