import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { WorkflowTemplatePublic } from "@/types/workflow-public";

// Re-export types for backward compatibility
export interface WorkflowStep {
  step_number: number;
  step_name: string;
  model_id: string;
  model_record_id?: string;
  prompt_template: string;
  parameters: Record<string, any>;
  input_mappings: Record<string, string>;
  output_key: string;
}

export interface UserInputField {
  name: string;
  type: string;
  label: string;
  required?: boolean;
  options?: string[];
  max_files?: number;
}

/**
 * Full workflow template (admin only)
 * Includes proprietary workflow_steps
 */
export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string | null;
  category: string;
  thumbnail_url: string | null;
  before_image_url: string | null;
  after_image_url: string | null;
  is_active: boolean;
  display_order: number;
  estimated_time_seconds: number | null;
  workflow_steps: WorkflowStep[];
  user_input_fields: UserInputField[];
  created_at: string;
  updated_at: string;
}

/**
 * Fetch active workflow templates from public view
 * Returns safe data without proprietary workflow_steps
 */
export const useWorkflowTemplates = () => {
  return useQuery({
    queryKey: ["workflow-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workflow_templates_public")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;
      
      return (data || []).map((item) => ({
        ...item,
        user_input_fields: (item.user_input_fields || []) as unknown as UserInputField[],
      })) as WorkflowTemplatePublic[];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

/**
 * Fetch single workflow template from public view
 * Returns safe data without proprietary workflow_steps
 */
export const useWorkflowTemplate = (id: string) => {
  return useQuery({
    queryKey: ["workflow-template", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workflow_templates_public")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      
      return {
        ...data,
        user_input_fields: (data.user_input_fields || []) as unknown as UserInputField[],
      } as WorkflowTemplatePublic;
    },
    enabled: !!id,
  });
};
