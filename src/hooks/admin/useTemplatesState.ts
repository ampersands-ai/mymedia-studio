import { useState } from 'react';
import type { TemplatesDialogState } from '@/types/admin';
import type { WorkflowTemplate } from '@/hooks/useWorkflowTemplates';

/**
 * Custom hook to manage all dialog and filter state for TemplatesManager
 * @returns State object and setter functions for dialogs and filters
 */
export function useTemplatesState() {
  const [state, setState] = useState<TemplatesDialogState & { sortBy: string; selectedCategories: string[] }>({
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
    openWorkflowDialog,
    openTestDialog,
    closeDialogs,
    setSortBy,
    setSelectedCategories,
  };
}
