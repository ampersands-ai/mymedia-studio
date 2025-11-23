import { useQuery } from "@tanstack/react-query";
import type { WorkflowTemplate } from "./useWorkflowTemplates";
import type { AIModel } from "./useModels";
import { supabase } from "@/integrations/supabase/client";

// Re-export AIModel for backward compatibility
export type { AIModel };

/**
 * DEPRECATED: content_templates table removed (ADR 007)
 * Templates moved to file-based registry system
 * 
 * MIGRATION PATH:
 * - Use WorkflowTemplate for new code
 * - Use MergedTemplate for backward compatibility
 * 
 * This interface is kept only for legacy code that hasn't been migrated yet.
 */
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
      console.warn('useTemplates: content_templates table removed');
      return [] as ContentTemplate[];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

export const useTemplatesByCategory = () => {
  const { data: templates, ...rest } = useTemplates();

  const templatesByCategory = {} as Record<string, MergedTemplate[]>;

  return { templatesByCategory, templates, ...rest };
};

// Merged type for both templates and workflows
export interface MergedTemplate extends Partial<ContentTemplate>, Partial<WorkflowTemplate> {
  template_type: 'template' | 'workflow';
}

export const useAllTemplates = () => {
  return useQuery({
    queryKey: ["all-templates"],
    queryFn: async () => {
      const { data: workflowTemplates, error } = await supabase
        .from("workflow_templates")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (error) throw error;

      return (workflowTemplates || []).map(w => ({ 
        ...w, 
        template_type: 'workflow' as const,
      }));
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

export const useAllTemplatesAdmin = () => {
  return useQuery({
    queryKey: ["all-templates-admin"],
    queryFn: async () => {
      const { data: workflowTemplates, error } = await supabase
        .from("workflow_templates")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;

      return (workflowTemplates || []).map(w => ({ 
        ...w, 
        template_type: 'workflow' as const,
      }));
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};
