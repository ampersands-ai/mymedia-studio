import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string | null;
  category: string;
  thumbnail_url: string | null;
  is_active: boolean;
  display_order: number;
  estimated_time_seconds: number | null;
  workflow_steps: WorkflowStep[];
  user_input_fields: UserInputField[];
  created_at: string;
  updated_at: string;
}

export const useWorkflowTemplates = () => {
  return useQuery({
    queryKey: ["workflow-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workflow_templates")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (error) throw error;
      return (data || []).map(item => ({
        ...item,
        workflow_steps: item.workflow_steps as unknown as WorkflowStep[],
        user_input_fields: item.user_input_fields as unknown as UserInputField[],
      }));
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

export const useWorkflowTemplate = (id: string) => {
  return useQuery({
    queryKey: ["workflow-template", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workflow_templates")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return {
        ...data,
        workflow_steps: data.workflow_steps as unknown as WorkflowStep[],
        user_input_fields: data.user_input_fields as unknown as UserInputField[],
      };
    },
    enabled: !!id,
  });
};
