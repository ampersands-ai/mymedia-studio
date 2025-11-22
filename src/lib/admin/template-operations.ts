import { supabase } from "@/integrations/supabase/client";
import type { MergedTemplate } from "@/hooks/useTemplates";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

/**
 * Toggle the active status of a template (workflows only - content templates deprecated)
 * @param template - The template to toggle
 * @returns Promise that resolves when operation completes
 */
export async function toggleTemplateActive(
  template: MergedTemplate
): Promise<void> {
  // content_templates table deleted - only workflows supported
  if (template.template_type === 'template') {
    toast.error("Content templates are no longer supported");
    logger.warn('Attempted to toggle deleted content_template', {
      utility: 'template-operations',
      templateId: template.id,
      operation: 'toggleTemplateActive'
    });
    return;
  }

  try {
    const { error } = await supabase
      .from('workflow_templates')
      .update({ is_active: !template.is_active })
      .eq('id', template.id);

    if (error) throw error;

    toast.success(`Template ${!template.is_active ? "enabled" : "disabled"}`);
  } catch (error) {
    logger.error('Template status toggle failed', error as Error, {
      utility: 'template-operations',
      templateId: template.id,
      templateType: template.template_type,
      currentStatus: template.is_active,
      operation: 'toggleTemplateActive'
    });
    toast.error("Failed to update template status");
    throw error;
  }
}

/**
 * Delete a template (workflows only - content templates deprecated)
 * @param template - The template to delete
 * @returns Promise that resolves when deletion completes
 */
export async function deleteTemplate(
  template: MergedTemplate
): Promise<void> {
  // content_templates table deleted - only workflows supported
  if (template.template_type === 'template') {
    toast.error("Content templates are no longer supported");
    logger.warn('Attempted to delete content_template from deleted table', {
      utility: 'template-operations',
      templateId: template.id,
      operation: 'deleteTemplate'
    });
    return;
  }

  if (!confirm("Are you sure you want to delete this workflow? This cannot be undone.")) {
    return;
  }

  logger.debug('Workflow deletion initiated', {
    utility: 'template-operations',
    templateId: template.id,
    templateType: template.template_type,
    operation: 'deleteTemplate'
  });

  try {
    const { error, data } = await supabase
      .from('workflow_templates')
      .delete()
      .eq('id', template.id)
      .select();

    logger.debug('Workflow deletion response received', {
      utility: 'template-operations',
      templateId: template.id,
      success: !error,
      deletedCount: data?.length || 0,
      operation: 'deleteTemplate'
    });

    if (error) {
      logger.error('Workflow deletion database error', error, {
        utility: 'template-operations',
        templateId: template.id,
        templateType: template.template_type,
        errorCode: error.code,
        errorHint: error.hint,
        operation: 'deleteTemplate'
      });
      throw error;
    }

    toast.success("Workflow deleted successfully");
  } catch (error: any) {
    logger.error('Workflow deletion failed', error, {
      utility: 'template-operations',
      templateId: template.id,
      templateType: template.template_type,
      operation: 'deleteTemplate'
    });
    toast.error(`Failed to delete workflow: ${error.message || 'Unknown error'}`);
    throw error;
  }
}

/**
 * Duplicate a template (workflows only - content templates deprecated)
 * @param template - The template to duplicate
 * @returns Promise that resolves with the duplicated template
 */
export async function duplicateTemplate(
  template: MergedTemplate
): Promise<MergedTemplate> {
  // content_templates table deleted - only workflows supported
  if (template.template_type === 'template') {
    toast.error("Content templates are no longer supported");
    logger.warn('Attempted to duplicate content_template from deleted table', {
      utility: 'template-operations',
      templateId: template.id,
      operation: 'duplicateTemplate'
    });
    throw new Error("Content templates are no longer supported");
  }

  const timestamp = Date.now();

  // Ensure required fields are present
  if (!template.category || !template.name) {
    toast.error("Cannot duplicate: missing required fields");
    throw new Error("Missing required fields");
  }

  const newWorkflow = {
    id: `${template.id}-copy-${timestamp}`,
    name: `${template.name} (Copy)`,
    category: template.category!,
    description: template.description || null,
    thumbnail_url: template.thumbnail_url || null,
    before_image_url: template.before_image_url || null,
    after_image_url: template.after_image_url || null,
    is_active: false,
    display_order: template.display_order || 0,
    estimated_time_seconds: template.estimated_time_seconds || null,
    workflow_steps: template.workflow_steps as any || [],
    user_input_fields: template.user_input_fields as any || [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('workflow_templates')
    .insert([newWorkflow]);

  if (error) {
    toast.error("Failed to duplicate workflow: " + error.message);
    throw error;
  }

  toast.success("Workflow duplicated - now editing copy");

  return { ...newWorkflow, template_type: 'workflow' as const } as MergedTemplate;
}

/**
 * Enable or disable all workflows (content templates deprecated)
 * @param isActive - Whether to enable (true) or disable (false) all workflows
 * @returns Promise that resolves when operation completes
 */
export async function bulkUpdateActive(
  isActive: boolean
): Promise<void> {
  try {
    if (isActive) {
      // content_templates table deleted - only update workflows
      await supabase
        .from('workflow_templates')
        .update({ is_active: true })
        .neq('is_active', true);

      toast.success("All workflows enabled");
    } else {
      if (!confirm("Are you sure you want to disable all workflows?")) {
        return;
      }

      // content_templates table deleted - only update workflows
      await supabase
        .from('workflow_templates')
        .update({ is_active: false })
        .eq('is_active', true);

      toast.success("All workflows disabled");
    }
  } catch (error) {
    logger.error('Bulk workflow status update failed', error as Error, {
      utility: 'template-operations',
      targetStatus: isActive,
      operation: 'bulkUpdateActive'
    });
    toast.error(`Failed to ${isActive ? 'enable' : 'disable'} all workflows`);
    throw error;
  }
}
