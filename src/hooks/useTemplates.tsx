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

/**
 * Fetch active content templates
 * NOTE: content_templates table has been deleted - returning empty array
 * All templates are now in workflow_templates table
 */
export const useTemplates = () => {
  return useQuery({
    queryKey: ["templates"],
    queryFn: async () => {
      // content_templates table deleted - return empty array
      return [] as ContentTemplate[];
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

// Hook to fetch all templates (workflow templates only - content_templates deleted)
export const useAllTemplates = () => {
  return useQuery({
    queryKey: ["all-templates"],
    queryFn: async () => {
      // Fetch workflow templates only (content_templates table deleted)
      const { data: workflowTemplates, error: workflowsError } = await supabase
        .from("workflow_templates")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (workflowsError) throw workflowsError;

      // Map to MergedTemplate format
      const mergedTemplates = (workflowTemplates || []).map(w => ({
        ...w,
        template_type: 'workflow' as const,
        user_input_fields: (w.user_input_fields as any) || [],
        workflow_steps: (w.workflow_steps as any) || [],
      })) as MergedTemplate[];

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
      // Fetch ALL workflow templates (including inactive)
      // content_templates table deleted
      const { data: workflowTemplates, error: workflowsError } = await supabase
        .from("workflow_templates")
        .select("*")
        .order("display_order", { ascending: true });

      if (workflowsError) throw workflowsError;

      // Map to MergedTemplate format
      const mergedTemplates = (workflowTemplates || []).map(w => ({
        ...w,
        template_type: 'workflow' as const,
        user_input_fields: (w.user_input_fields as any) || [],
        workflow_steps: (w.workflow_steps as any) || [],
      })) as MergedTemplate[];

      return mergedTemplates;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};
