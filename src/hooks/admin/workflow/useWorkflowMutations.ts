import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logger, generateRequestId } from '@/lib/logger';
import { handleError } from "@/lib/errors";
import type { WorkflowTemplate } from "@/hooks/useWorkflowTemplates";
import {
  MergedTemplate,
  WorkflowDialogState,
} from "@/types/workflow";

const mutationsLogger = logger.child({ component: 'useWorkflowMutations' });

interface UseWorkflowMutationsOptions {
  onEditWorkflow: (state: WorkflowDialogState) => void;
}

/**
 * Hook for managing template and workflow mutations
 * Handles toggle, delete, duplicate, enable/disable operations
 */
export const useWorkflowMutations = (options: UseWorkflowMutationsOptions) => {
  const queryClient = useQueryClient();

  /**
   * Toggle active status of a template (workflow only - content_templates deleted)
   */
  const handleToggleActive = useCallback(async (item: MergedTemplate) => {
    const requestId = generateRequestId();
    // All templates are now in workflow_templates (content_templates deleted)
    const table = 'workflow_templates';

    try {
      const { error } = await supabase
        .from(table)
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

      mutationsLogger.info('Template toggled', { requestId, templateId: item.id, newState: !item.is_active });
      toast.success(`Template ${!item.is_active ? "enabled" : "disabled"}`);
      queryClient.invalidateQueries({ queryKey: ['all-templates-admin'] });
    } catch (error) {
      const handledError = handleError(error, {
        requestId,
        templateId: item.id,
        templateType: item.template_type,
        component: 'useWorkflowMutations',
        operation: 'handleToggleActive'
      });

      mutationsLogger.error('Template toggle failed', handledError, { requestId });
      toast.error("Failed to update template status");
    }
  }, [queryClient]);

  /**
   * Delete a template (workflow only - content_templates deleted)
   */
  const handleDelete = useCallback(async (item: MergedTemplate) => {
    if (!confirm("Are you sure you want to delete this template? This cannot be undone.")) {
      return;
    }

    const requestId = generateRequestId();
    // All templates are now in workflow_templates (content_templates deleted)
    const table = 'workflow_templates';

    mutationsLogger.debug('Template deletion initiated', {
      requestId,
      templateType: item.template_type,
      templateId: item.id,
      table
    });

    try {
      const { error } = await supabase
        .from(table)
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

      mutationsLogger.info('Template deleted successfully', { requestId, templateId: item.id });
      toast.success("Template deleted successfully");
      queryClient.invalidateQueries({ queryKey: ['all-templates-admin'] });
    } catch (error) {
      const handledError = handleError(error, {
        requestId,
        templateId: item.id,
        component: 'useWorkflowMutations',
        operation: 'handleDelete'
      });

      mutationsLogger.error('Template deletion error', handledError, { requestId });
      toast.error(`Failed to delete template: ${handledError.message || 'Unknown error'}`);
    }
  }, [queryClient]);

  /**
   * Duplicate a template (workflow only - content_templates deleted)
   */
  const handleDuplicate = useCallback(async (item: MergedTemplate) => {
    const timestamp = Date.now();

    if (!item.category || !item.name) {
      toast.error("Cannot duplicate: missing required fields");
      return;
    }

    // All templates are now in workflow_templates (content_templates deleted)
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
   * Edit a template (workflow only - content_templates deleted)
   */
  const handleEdit = useCallback((item: MergedTemplate) => {
    // All templates are now workflows (content_templates deleted)
    options.onEditWorkflow({
      open: true,
      workflow: item as WorkflowTemplate,
      isNew: false
    });
  }, [options]);

  /**
   * Enable all templates (workflow only - content_templates deleted)
   */
  const handleEnableAll = useCallback(async () => {
    const requestId = generateRequestId();

    try {
      // All templates are now in workflow_templates (content_templates deleted)
      await supabase.from('workflow_templates').update({ is_active: true }).neq('is_active', true);

      mutationsLogger.info('All templates enabled', { requestId });
      toast.success("All templates enabled");
      queryClient.invalidateQueries({ queryKey: ['all-templates-admin'] });
    } catch (error) {
      const handledError = handleError(error, {
        requestId,
        component: 'useWorkflowMutations',
        operation: 'handleEnableAll'
      });

      mutationsLogger.error('Enable all templates failed', handledError, { requestId });
      toast.error("Failed to enable all templates");
    }
  }, [queryClient]);

  /**
   * Disable all templates (workflow only - content_templates deleted)
   */
  const handleDisableAll = useCallback(async () => {
    if (!confirm("Are you sure you want to disable all templates?")) return;

    try {
      // All templates are now in workflow_templates (content_templates deleted)
      await supabase.from('workflow_templates').update({ is_active: false }).eq('is_active', true);

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
