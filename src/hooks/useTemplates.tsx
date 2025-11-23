import { useQuery } from "@tanstack/react-query";
import type { WorkflowTemplate } from "./useWorkflowTemplates";
import type { AIModel } from "./useModels";
import { supabase } from "@/integrations/supabase/client";
import { getModel } from "@/lib/models/registry";

// Re-export AIModel for backward compatibility
export type { AIModel };

/**
 * DEPRECATED: content_templates table removed
 * Templates moved to file-based system
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

  const templatesByCategory = {} as Record<string, ContentTemplate[]>;

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
      // ADR 007: Query workflow_templates and enrich with model metadata from registry
      const { data: workflowTemplates, error } = await supabase
        .from("workflow_templates")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (error) {
        console.error('Failed to fetch workflow templates:', error);
        return [];
      }

      // Enrich with model metadata from registry
      return (workflowTemplates || []).map(w => {
        const steps = w.workflow_steps as any[];
        const firstModelRecordId = steps?.[0]?.model_record_id;

        let ai_models = undefined;
        if (firstModelRecordId) {
          try {
            const model = getModel(firstModelRecordId);
            ai_models = {
              id: model.MODEL_CONFIG.modelId,
              name: model.MODEL_CONFIG.modelName,
              base_token_cost: model.MODEL_CONFIG.baseCreditCost,
              content_type: model.MODEL_CONFIG.contentType,
            };
          } catch (e) {
            console.warn('Failed to load model from registry:', firstModelRecordId, e);
          }
        }

        return {
          ...w,
          template_type: 'workflow' as const,
          ai_models,
        };
      }) as MergedTemplate[];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

export const useAllTemplatesAdmin = () => {
  return useQuery({
    queryKey: ["all-templates-admin"],
    queryFn: async () => {
      // ADR 007: Query workflow_templates (including inactive) and enrich with model metadata
      const { data: workflowTemplates, error } = await supabase
        .from("workflow_templates")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) {
        console.error('Failed to fetch workflow templates:', error);
        return [];
      }

      // Enrich with model metadata from registry
      return (workflowTemplates || []).map(w => {
        const steps = w.workflow_steps as any[];
        const firstModelRecordId = steps?.[0]?.model_record_id;

        let ai_models = undefined;
        if (firstModelRecordId) {
          try {
            const model = getModel(firstModelRecordId);
            ai_models = {
              id: model.MODEL_CONFIG.modelId,
              name: model.MODEL_CONFIG.modelName,
              base_token_cost: model.MODEL_CONFIG.baseCreditCost,
              content_type: model.MODEL_CONFIG.contentType,
            };
          } catch (e) {
            console.warn('Failed to load model from registry:', firstModelRecordId, e);
          }
        }

        return {
          ...w,
          template_type: 'workflow' as const,
          ai_models,
        };
      }) as MergedTemplate[];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};
