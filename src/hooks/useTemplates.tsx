import { useQuery } from "@tanstack/react-query";
import type { WorkflowTemplate } from "./useWorkflowTemplates";
import type { AIModel } from "./useModels";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import type { Database } from "@/integrations/supabase/types";
import type { WorkflowTemplatePublic } from "@/types/workflow-public";

type WorkflowTemplateRow = Database['public']['Tables']['workflow_templates']['Row'];

// Re-export AIModel for backward compatibility
export type { AIModel };

/**
 * Legacy interface for backward compatibility
 * Use WorkflowTemplate or MergedTemplate for new code
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
  modelMetadata?: AIModel;
  estimated_time_seconds?: number | null;
}

export const useTemplates = () => {
  return useQuery({
    queryKey: ["templates"],
    queryFn: async () => {
      logger.warn('useTemplates: content_templates table removed');
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

// Merged type for both templates and workflows (public version)
export interface MergedTemplate extends Partial<ContentTemplate>, Partial<WorkflowTemplatePublic> {
  template_type: 'template' | 'workflow';
}

/**
 * Fetch all active templates from public view
 * Does NOT expose proprietary workflow_steps
 */
export const useAllTemplates = () => {
  return useQuery({
    queryKey: ["all-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workflow_templates_public")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;

      return (data || []).map((w) => ({ 
        ...w, 
        template_type: 'workflow' as const,
      }));
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

/**
 * Admin-only: Fetch ALL templates from base table (includes workflow_steps)
 * Requires admin role RLS policy
 */
export const useAllTemplatesAdmin = () => {
  return useQuery({
    queryKey: ["all-templates-admin"],
    queryFn: async () => {
      const { data: workflowTemplates, error } = await supabase
        .from("workflow_templates")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;

      return (workflowTemplates || []).map((w: WorkflowTemplateRow) => ({ 
        ...w, 
        template_type: 'workflow' as const,
      }));
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};
