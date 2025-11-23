import type { WorkflowTemplate } from "@/hooks/useWorkflowTemplates";

/**
 * DEPRECATED: Dialog state for content template editing
 * Content templates have been removed (ADR 007)
 * This interface is kept only for legacy admin UI
 */
export interface DeprecatedTemplateDialogState {
  open: boolean;
  template: any | null;
}

/**
 * Dialog state for workflow editing
 */
export interface WorkflowDialogState {
  open: boolean;
  workflow: Partial<WorkflowTemplate> | null;
  isNew: boolean;
}

/**
 * Template sort options
 */
export type TemplateSortBy = "display_order" | "name" | "category" | "status" | "type";

/**
 * Category counts map
 */
export type CategoryCounts = Record<string, number>;

/**
 * Template manager state
 */
export interface TemplateManagerState {
  contentTemplateDialog: {
    open: boolean;
    template: any | null;
  };
  workflowDialog: WorkflowDialogState;
  testingWorkflow: WorkflowTemplate | null;
  testDialogOpen: boolean;
  sortBy: TemplateSortBy;
  selectedCategories: string[];
}
