import type { WorkflowTemplate } from '@/hooks/useWorkflowTemplates';

/**
 * Dialog state management for template and workflow editors
 */
export interface TemplatesDialogState {
  /** @deprecated Content template dialog state - content_templates table removed (ADR 007) */
  contentTemplateDialog: {
    open: boolean;
    template: any | null;
  };
  /** Workflow template dialog state */
  workflowDialog: {
    open: boolean;
    workflow: Partial<WorkflowTemplate> | null;
    isNew: boolean;
  };
  /** Test dialog state for workflow testing */
  testDialogOpen: boolean;
  /** Currently testing workflow */
  testingWorkflow: WorkflowTemplate | null;
}

/**
 * Filter and sort state for templates table
 */
export interface TemplatesFilterState {
  /** Current sort option */
  sortBy: string;
  /** Selected categories for filtering */
  selectedCategories: string[];
}

/**
 * Image upload state for workflow before/after images
 */
export interface WorkflowImageState {
  /** Before image file selected for upload */
  beforeImageFile: File | null;
  /** After image file selected for upload */
  afterImageFile: File | null;
  /** Before image preview from FileReader */
  beforeImagePreview: string | null;
  /** After image preview from FileReader */
  afterImagePreview: string | null;
  /** Before image signed URL for existing storage */
  beforeSignedPreview: string | null;
  /** After image signed URL for existing storage */
  afterSignedPreview: string | null;
  /** Loading state during image upload */
  uploadingImages: boolean;
}

/**
 * Category management state for workflow editor
 */
export interface CategoryManagementState {
  /** List of existing categories from database */
  existingCategories: string[];
  /** Whether to show custom category input */
  showCustomCategory: boolean;
}

/**
 * Template operation types
 */
export type TemplateOperation = 
  | 'edit'
  | 'duplicate'
  | 'toggleActive'
  | 'delete'
  | 'test';

/**
 * Sort options for templates table
 */
export type SortOption = 
  | 'display_order'
  | 'name'
  | 'category'
  | 'status'
  | 'type';
