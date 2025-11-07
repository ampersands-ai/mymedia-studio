import { useQueryClient } from '@tanstack/react-query';
import type { MergedTemplate } from '@/hooks/useTemplates';
import {
  toggleTemplateActive,
  deleteTemplate,
  duplicateTemplate,
  bulkUpdateActive,
} from '@/lib/admin/template-operations';

/**
 * Custom hook that wraps template operations with query invalidation
 * @returns Object with all template operation functions
 */
export function useTemplateOperations() {
  const queryClient = useQueryClient();

  /**
   * Toggle active status of a template
   */
  const toggleActive = async (template: MergedTemplate) => {
    await toggleTemplateActive(template);
    queryClient.invalidateQueries({ queryKey: ['all-templates-admin'] });
  };

  /**
   * Delete a template with confirmation
   */
  const deleteTemplateWithInvalidation = async (template: MergedTemplate) => {
    await deleteTemplate(template);
    queryClient.invalidateQueries({ queryKey: ['all-templates-admin'] });
  };

  /**
   * Duplicate a template and optionally open editor with callback
   */
  const duplicateWithCallback = async (
    template: MergedTemplate,
    onEdit?: (duplicated: MergedTemplate) => void
  ) => {
    const duplicated = await duplicateTemplate(template);
    queryClient.invalidateQueries({ queryKey: ['all-templates-admin'] });
    
    // Auto-open editor if callback provided
    if (onEdit) {
      onEdit(duplicated);
    }
  };

  /**
   * Enable all templates (both content and workflow)
   */
  const enableAll = async () => {
    await bulkUpdateActive(true);
    queryClient.invalidateQueries({ queryKey: ['all-templates-admin'] });
  };

  /**
   * Disable all templates (both content and workflow) with confirmation
   */
  const disableAll = async () => {
    await bulkUpdateActive(false);
    queryClient.invalidateQueries({ queryKey: ['all-templates-admin'] });
  };

  return {
    toggleActive,
    deleteTemplate: deleteTemplateWithInvalidation,
    duplicateTemplate: duplicateWithCallback,
    enableAll,
    disableAll,
  };
}
