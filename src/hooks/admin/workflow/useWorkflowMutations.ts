import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { logger } from '@/lib/logger';
import type { WorkflowTemplate } from "@/hooks/useWorkflowTemplates";
import {
  MergedTemplate,
  ContentTemplateDialogState,
  WorkflowDialogState,
} from "@/types/workflow";

const mutationsLogger = logger.child({ component: 'useWorkflowMutations' });

interface UseWorkflowMutationsOptions {
  onEditWorkflow: (state: WorkflowDialogState) => void;
}

/**
 * DEPRECATED: Template mutations disabled
 * content_templates and ai_models tables removed - file-based system now
 */
export const useWorkflowMutations = (options: UseWorkflowMutationsOptions) => {
  const queryClient = useQueryClient();

  const handleToggleActive = useCallback(async (item: MergedTemplate) => {
    console.warn('useWorkflowMutations: content_templates table removed');
    toast.error("Template management disabled - file-based system active");
  }, []);

  const handleDelete = useCallback(async (item: MergedTemplate) => {
    console.warn('useWorkflowMutations: content_templates table removed');
    toast.error("Template management disabled - file-based system active");
  }, []);

  const handleDuplicate = useCallback(async (item: MergedTemplate) => {
    console.warn('useWorkflowMutations: content_templates table removed');
    toast.error("Template management disabled - file-based system active");
  }, []);

  const handleEdit = useCallback((item: MergedTemplate) => {
    console.warn('useWorkflowMutations: content_templates table removed');
    toast.error("Template management disabled - file-based system active");
  }, []);

  const handleEnableAll = useCallback(async () => {
    console.warn('useWorkflowMutations: content_templates table removed');
    toast.error("Template management disabled - file-based system active");
  }, []);

  const handleDisableAll = useCallback(async () => {
    console.warn('useWorkflowMutations: content_templates table removed');
    toast.error("Template management disabled - file-based system active");
  }, []);

  return {
    handleToggleActive,
    handleDelete,
    handleDuplicate,
    handleEdit,
    handleEnableAll,
    handleDisableAll,
  };
};
