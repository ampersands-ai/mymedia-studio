import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { MergedTemplate } from "@/hooks/useTemplates";
import type { WorkflowTemplate } from "@/hooks/useWorkflowTemplates";
import type { ContentTemplateDialogState, WorkflowDialogState } from "@/types/admin/workflow-editor";
import { logger } from '@/lib/logger';

interface UseWorkflowMutationsOptions {
  onEditContentTemplate: (state: ContentTemplateDialogState) => void;
  onEditWorkflow: (state: WorkflowDialogState) => void;
}

/**
 * Hook for managing template and workflow mutations
 * Handles toggle, delete, duplicate, enable/disable operations
 */
export const useWorkflowMutations = (options: UseWorkflowMutationsOptions) => {
  const queryClient = useQueryClient();

  /**
   * Toggle active status of a template or workflow
   */
  const handleToggleActive = useCallback(async (item: MergedTemplate) => {
    const table = item.template_type === 'template' 
      ? 'content_templates' 
      : 'workflow_templates';
    
    try {
      const { error } = await supabase
        .from(table)
        .update({ is_active: !item.is_active })
        .eq('id', item.id);

      if (error) throw error;
      
      toast.success(`Template ${!item.is_active ? "enabled" : "disabled"}`);
      queryClient.invalidateQueries({ queryKey: ['all-templates-admin'] });
    } catch (error) {
      logger.error('Template toggle failed', error, {
        component: 'useWorkflowMutations',
        operation: 'handleToggleActive',
        templateId: item.id,
        templateType: item.template_type
      });
      toast.error("Failed to update template status");
    }
  }, [queryClient]);

  /**
   * Delete a template or workflow
   */
  const handleDelete = useCallback(async (item: MergedTemplate) => {
    if (!confirm("Are you sure you want to delete this template? This cannot be undone.")) {
      return;
    }

    const table = item.template_type === 'template' 
      ? 'content_templates' 
      : 'workflow_templates';

    logger.debug('Template deletion initiated', {
      component: 'useWorkflowMutations',
      operation: 'handleDelete',
      templateType: item.template_type,
      templateId: item.id,
      table
    });

    try {
      const { error, data } = await supabase
        .from(table)
        .delete()
        .eq('id', item.id)
        .select();

      if (error) {
        logger.error('Template deletion failed', error, {
          component: 'useWorkflowMutations',
          operation: 'handleDelete',
          templateId: item.id,
          errorCode: error.code,
          errorHint: error.hint
        });
        throw error;
      }
      
      toast.success("Template deleted successfully");
      queryClient.invalidateQueries({ queryKey: ['all-templates-admin'] });
    } catch (error: any) {
      logger.error('Template deletion error', error, {
        component: 'useWorkflowMutations',
        operation: 'handleDelete',
        templateId: item.id
      });
      toast.error(`Failed to delete template: ${error.message || 'Unknown error'}`);
    }
  }, [queryClient]);

  /**
   * Duplicate a template or workflow
   */
  const handleDuplicate = useCallback(async (item: MergedTemplate) => {
    const timestamp = Date.now();
    
    if (item.template_type === 'template') {
      const { workflow_steps, user_input_fields, template_type, ai_models, ...templateData } = item;
      
      if (!item.category || !item.name) {
        toast.error("Cannot duplicate: missing required fields");
        return;
      }
      
      const newTemplate = {
        id: `${item.id}-copy-${timestamp}`,
        name: `${item.name} (Copy)`,
        category: item.category!,
        description: item.description || null,
        model_id: item.model_id || null,
        preset_parameters: item.preset_parameters || {},
        enhancement_instruction: item.enhancement_instruction || null,
        thumbnail_url: item.thumbnail_url || null,
        is_active: false,
        display_order: item.display_order || 0,
        estimated_time_seconds: item.estimated_time_seconds || null,
        user_editable_fields: item.user_editable_fields as any || [],
        hidden_field_defaults: item.hidden_field_defaults as any || {},
        is_custom_model: item.is_custom_model || false,
        model_record_id: ('model_record_id' in item ? item.model_record_id as string : null) || null,
        before_image_url: item.before_image_url || null,
        after_image_url: item.after_image_url || null,
      };
      
      const { error } = await supabase
        .from('content_templates')
        .insert([newTemplate]);
        
      if (error) {
        toast.error("Failed to duplicate template: " + error.message);
        return;
      }
      
      toast.success("Template duplicated - now editing copy");
      queryClient.invalidateQueries({ queryKey: ['all-templates-admin'] });
      
      options.onEditContentTemplate({ open: true, template: newTemplate });
    } else {
      if (!item.category || !item.name) {
        toast.error("Cannot duplicate: missing required fields");
        return;
      }
      
      const newWorkflow = {
        id: `${item.id}-copy-${timestamp}`,
        name: `${item.name} (Copy)`,
        category: item.category!,
        description: item.description || null,
        thumbnail_url: item.thumbnail_url || null,
        before_image_url: item.before_image_url || null,
        after_image_url: item.after_image_url || null,
        is_active: false,
        display_order: item.display_order || 0,
        estimated_time_seconds: item.estimated_time_seconds || null,
        workflow_steps: item.workflow_steps as any || [],
        user_input_fields: item.user_input_fields as any || [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      const { error } = await supabase
        .from('workflow_templates')
        .insert([newWorkflow]);
        
      if (error) {
        toast.error("Failed to duplicate workflow: " + error.message);
        return;
      }
      
      toast.success("Workflow duplicated - now editing copy");
      queryClient.invalidateQueries({ queryKey: ['all-templates-admin'] });
      
      options.onEditWorkflow({ 
        open: true, 
        workflow: newWorkflow as WorkflowTemplate, 
        isNew: false 
      });
    }
  }, [queryClient, options]);

  /**
   * Edit a template or workflow
   */
  const handleEdit = useCallback((item: MergedTemplate) => {
    if (item.template_type === 'template') {
      options.onEditContentTemplate({ open: true, template: item });
    } else {
      options.onEditWorkflow({ 
        open: true, 
        workflow: item as WorkflowTemplate, 
        isNew: false 
      });
    }
  }, [options]);

  /**
   * Enable all templates and workflows
   */
  const handleEnableAll = useCallback(async () => {
    try {
      await Promise.all([
        supabase.from('content_templates').update({ is_active: true }).neq('is_active', true),
        supabase.from('workflow_templates').update({ is_active: true }).neq('is_active', true),
      ]);
      
      toast.success("All templates enabled");
      queryClient.invalidateQueries({ queryKey: ['all-templates-admin'] });
    } catch (error) {
      logger.error('Enable all templates failed', error, {
        component: 'useWorkflowMutations',
        operation: 'handleEnableAll'
      });
      toast.error("Failed to enable all templates");
    }
  }, [queryClient]);

  /**
   * Disable all templates and workflows
   */
  const handleDisableAll = useCallback(async () => {
    if (!confirm("Are you sure you want to disable all templates?")) return;

    try {
      await Promise.all([
        supabase.from('content_templates').update({ is_active: false }).eq('is_active', true),
        supabase.from('workflow_templates').update({ is_active: false }).eq('is_active', true),
      ]);
      
      toast.success("All templates disabled");
      queryClient.invalidateQueries({ queryKey: ['all-templates-admin'] });
    } catch (error) {
      logger.error('Disable all templates failed', error, {
        component: 'useWorkflowMutations',
        operation: 'handleDisableAll'
      });
      toast.error("Failed to disable all templates");
    }
  }, [queryClient]);

  return {
    handleToggleActive,
    handleDelete,
    handleDuplicate,
    handleEdit,
    handleEnableAll,
    handleDisableAll,
  };
};
