import type { WorkflowTemplate } from "@/hooks/useWorkflowTemplates";

/**
 * Dialog state for content template editing
 */
export interface ContentTemplateDialogState {
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
  contentTemplateDialog: ContentTemplateDialogState;
  workflowDialog: WorkflowDialogState;
  testingWorkflow: WorkflowTemplate | null;
  testDialogOpen: boolean;
  sortBy: TemplateSortBy;
  selectedCategories: string[];
}
