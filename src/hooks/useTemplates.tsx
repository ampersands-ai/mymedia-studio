import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { WorkflowTemplate } from "./useWorkflowTemplates";
import type { AIModel } from "./useModels";

// Re-export AIModel for backward compatibility
export type { AIModel };

export interface ContentTemplate {
  id: string;
  category: string;
  name: string;
  description: string | null;
  thumbnail_url: string | null;
  model_id: string | null;
  preset_parameters: Record<string, unknown>;
  user_editable_fields?: string[];
  hidden_field_defaults?: Record<string, any>;
  is_custom_model?: boolean;
  enhancement_instruction: string | null;
  display_order: number;
  is_active: boolean;
  ai_models?: AIModel;
  estimated_time_seconds?: number | null;
}

export const useTemplates = () => {
  return useQuery({
    queryKey: ["templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_templates")
        .select("*")
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

// Merged type for both templates and workflows
export interface MergedTemplate extends Partial<ContentTemplate>, Partial<WorkflowTemplate> {
  template_type: 'template' | 'workflow';
}

// Hook to fetch all templates (content templates + workflows)
export const useAllTemplates = () => {
  return useQuery({
    queryKey: ["all-templates"],
    queryFn: async () => {
      // Fetch content templates
      const { data: contentTemplates, error: templatesError } = await supabase
        .from("content_templates")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (templatesError) throw templatesError;

      // Fetch workflow templates
      const { data: workflowTemplates, error: workflowsError } = await supabase
        .from("workflow_templates")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (workflowsError) throw workflowsError;

      // Merge and mark type - cast entire objects to bypass Json types
      const mergedTemplates = [
        ...(contentTemplates || []).map(t => ({ 
          ...t, 
          template_type: 'template' as const,
          user_editable_fields: (t.user_editable_fields as any) || [],
          hidden_field_defaults: (t.hidden_field_defaults as any) || {},
          preset_parameters: (t.preset_parameters as any) || {},
        })),
        ...(workflowTemplates || []).map(w => ({ 
          ...w, 
          template_type: 'workflow' as const,
          user_input_fields: (w.user_input_fields as any) || [],
          workflow_steps: (w.workflow_steps as any) || [],
        })),
      ] as MergedTemplate[];

      // Sort by display_order
      mergedTemplates.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

      return mergedTemplates;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

// Hook for admin to fetch ALL templates regardless of active status
export const useAllTemplatesAdmin = () => {
  return useQuery({
    queryKey: ["all-templates-admin"],
    queryFn: async () => {
      // Fetch ALL content templates (including inactive)
      const { data: contentTemplates, error: templatesError } = await supabase
        .from("content_templates")
        .select("*")
        .order("display_order", { ascending: true });

      if (templatesError) throw templatesError;

      // Fetch ALL workflow templates (including inactive)
      const { data: workflowTemplates, error: workflowsError } = await supabase
        .from("workflow_templates")
        .select("*")
        .order("display_order", { ascending: true });

      if (workflowsError) throw workflowsError;

      // Merge and mark type - cast entire objects to bypass Json types
      const mergedTemplates = [
        ...(contentTemplates || []).map(t => ({ 
          ...t, 
          template_type: 'template' as const,
          user_editable_fields: (t.user_editable_fields as any) || [],
          hidden_field_defaults: (t.hidden_field_defaults as any) || {},
          preset_parameters: (t.preset_parameters as any) || {},
        })),
        ...(workflowTemplates || []).map(w => ({ 
          ...w, 
          template_type: 'workflow' as const,
          user_input_fields: (w.user_input_fields as any) || [],
          workflow_steps: (w.workflow_steps as any) || [],
        })),
      ] as MergedTemplate[];

      // Sort by display_order
      mergedTemplates.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

      return mergedTemplates;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};
