import { useState } from 'react';
import type { TemplatesDialogState } from '@/types/admin';
import type { WorkflowTemplate } from '@/hooks/useWorkflowTemplates';
/** @deprecated ContentTemplate removed - use MergedTemplate or WorkflowTemplate */
import type { ContentTemplate } from '@/hooks/useTemplates';

/**
 * Custom hook to manage all dialog and filter state for TemplatesManager
 * @returns State object and setter functions for dialogs and filters
 */
export function useTemplatesState() {
  const [state, setState] = useState<TemplatesDialogState & { sortBy: string; selectedCategories: string[] }>({
    contentTemplateDialog: {
      open: false,
      template: null,
    },
    workflowDialog: {
      open: false,
      workflow: null,
      isNew: false,
    },
    testDialogOpen: false,
    testingWorkflow: null,
    sortBy: 'display_order',
    selectedCategories: ['All'],
  });

  /**
   * Open content template dialog for creating or editing
   */
  const openContentDialog = (template: Partial<ContentTemplate> | null) => {
    setState(prev => ({
      ...prev,
      contentTemplateDialog: {
        open: true,
        template,
      },
    }));
  };

  /**
   * Open workflow template dialog for creating or editing
   */
  const openWorkflowDialog = (workflow: Partial<WorkflowTemplate> | null, isNew: boolean) => {
    setState(prev => ({
      ...prev,
      workflowDialog: {
        open: true,
        workflow,
        isNew,
      },
    }));
  };

  /**
   * Open test dialog for a workflow
   */
  const openTestDialog = (workflow: WorkflowTemplate) => {
    setState(prev => ({
      ...prev,
      testDialogOpen: true,
      testingWorkflow: workflow,
    }));
  };

  /**
   * Close all dialogs
   */
  const closeDialogs = () => {
    setState(prev => ({
      ...prev,
      contentTemplateDialog: {
        open: false,
        template: null,
      },
      workflowDialog: {
        open: false,
        workflow: null,
        isNew: false,
      },
      testDialogOpen: false,
      testingWorkflow: null,
    }));
  };

  /**
   * Update sort option
   */
  const setSortBy = (sortBy: string) => {
    setState(prev => ({ ...prev, sortBy }));
  };

  /**
   * Update selected categories
   */
  const setSelectedCategories = (selectedCategories: string[]) => {
    setState(prev => ({ ...prev, selectedCategories }));
  };

  return {
    state,
    openContentDialog,
    openWorkflowDialog,
    openTestDialog,
    closeDialogs,
    setSortBy,
    setSelectedCategories,
  };
}
