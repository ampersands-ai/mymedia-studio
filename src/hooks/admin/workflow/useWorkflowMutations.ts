import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logger, generateRequestId } from '@/lib/logger';
import { handleError } from "@/lib/errors";
import type { WorkflowTemplate } from "@/hooks/useWorkflowTemplates";
import {
  MergedTemplate,
  ContentTemplateDialogState,
  WorkflowDialogState,
} from "@/types/workflow";

const mutationsLogger = logger.child({ component: 'useWorkflowMutations' });

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
   * Toggle active status of a workflow (content templates deprecated)
   */
  const handleToggleActive = useCallback(async (item: MergedTemplate) => {
    const requestId = generateRequestId();

    // content_templates table deleted - only workflows supported
    if (item.template_type === 'template') {
      toast.error("Content templates are no longer supported");
      mutationsLogger.warn('Attempted to toggle content_template from deleted table', { requestId, templateId: item.id });
      return;
    }

    try {
      const { error } = await supabase
        .from('workflow_templates')
        .update({ is_active: !item.is_active })
        .eq('id', item.id);

      if (error) {
        const handledError = handleError(error, {
          requestId,
          templateId: item.id,
          templateType: item.template_type,
          component: 'useWorkflowMutations'
        });
        throw handledError;
      }

      mutationsLogger.info('Workflow toggled', { requestId, templateId: item.id, newState: !item.is_active });
      toast.success(`Workflow ${!item.is_active ? "enabled" : "disabled"}`);
      queryClient.invalidateQueries({ queryKey: ['all-templates-admin'] });
    } catch (error) {
      const handledError = handleError(error, {
        requestId,
        templateId: item.id,
        templateType: item.template_type,
        component: 'useWorkflowMutations',
        operation: 'handleToggleActive'
      });

      mutationsLogger.error('Workflow toggle failed', handledError, { requestId });
      toast.error("Failed to update workflow status");
    }
  }, [queryClient]);

  /**
   * Delete a workflow (content templates deprecated)
   */
  const handleDelete = useCallback(async (item: MergedTemplate) => {
    // content_templates table deleted - only workflows supported
    if (item.template_type === 'template') {
      toast.error("Content templates are no longer supported");
      mutationsLogger.warn('Attempted to delete content_template from deleted table', { templateId: item.id });
      return;
    }

    if (!confirm("Are you sure you want to delete this workflow? This cannot be undone.")) {
      return;
    }

    const requestId = generateRequestId();

    mutationsLogger.debug('Workflow deletion initiated', {
      requestId,
      templateType: item.template_type,
      templateId: item.id
    });

    try {
      const { error } = await supabase
        .from('workflow_templates')
        .delete()
        .eq('id', item.id)
        .select();

      if (error) {
        const handledError = handleError(error, {
          requestId,
          templateId: item.id,
          errorCode: error.code,
          errorHint: error.hint,
          component: 'useWorkflowMutations'
        });
        throw handledError;
      }

      mutationsLogger.info('Workflow deleted successfully', { requestId, templateId: item.id });
      toast.success("Workflow deleted successfully");
      queryClient.invalidateQueries({ queryKey: ['all-templates-admin'] });
    } catch (error) {
      const handledError = handleError(error, {
        requestId,
        templateId: item.id,
        component: 'useWorkflowMutations',
        operation: 'handleDelete'
      });

      mutationsLogger.error('Workflow deletion error', handledError, { requestId });
      toast.error(`Failed to delete workflow: ${handledError.message || 'Unknown error'}`);
    }
  }, [queryClient]);

  /**
   * Duplicate a workflow (content templates deprecated)
   */
  const handleDuplicate = useCallback(async (item: MergedTemplate) => {
    // content_templates table deleted - only workflows supported
    if (item.template_type === 'template') {
      toast.error("Content templates are no longer supported");
      mutationsLogger.warn('Attempted to duplicate content_template from deleted table', { templateId: item.id });
      return;
    }

    const timestamp = Date.now();

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
      workflow: newWorkflow as any,
      isNew: false
    });
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
   * Enable all workflows (content templates deprecated)
   */
  const handleEnableAll = useCallback(async () => {
    const requestId = generateRequestId();

    try {
      // content_templates table deleted - only update workflows
      await supabase
        .from('workflow_templates')
        .update({ is_active: true })
        .neq('is_active', true);

      mutationsLogger.info('All workflows enabled', { requestId });
      toast.success("All workflows enabled");
      queryClient.invalidateQueries({ queryKey: ['all-templates-admin'] });
    } catch (error) {
      const handledError = handleError(error, {
        requestId,
        component: 'useWorkflowMutations',
        operation: 'handleEnableAll'
      });

      mutationsLogger.error('Enable all workflows failed', handledError, { requestId });
      toast.error("Failed to enable all workflows");
    }
  }, [queryClient]);

  /**
   * Disable all workflows (content templates deprecated)
   */
  const handleDisableAll = useCallback(async () => {
    if (!confirm("Are you sure you want to disable all workflows?")) return;

    try {
      // content_templates table deleted - only update workflows
      await supabase
        .from('workflow_templates')
        .update({ is_active: false })
        .eq('is_active', true);

      toast.success("All workflows disabled");
      queryClient.invalidateQueries({ queryKey: ['all-templates-admin'] });
    } catch (error) {
      logger.error('Disable all workflows failed', error, {
        component: 'useWorkflowMutations',
        operation: 'handleDisableAll'
      });
      toast.error("Failed to disable all workflows");
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
