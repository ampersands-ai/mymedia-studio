import { supabase } from "@/integrations/supabase/client";
import type { MergedTemplate } from "@/hooks/useTemplates";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

/**
 * Toggle the active status of a template (workflow only - content_templates deleted)
 * @param template - The template to toggle
 * @returns Promise that resolves when operation completes
 */
export async function toggleTemplateActive(
  template: MergedTemplate
): Promise<void> {
  // All templates are now in workflow_templates (content_templates deleted)
  const table = 'workflow_templates';

  try {
    const { error } = await supabase
      .from(table)
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
 * Delete a template (workflow only - content_templates deleted)
 * @param template - The template to delete
 * @returns Promise that resolves when deletion completes
 */
export async function deleteTemplate(
  template: MergedTemplate
): Promise<void> {
  if (!confirm("Are you sure you want to delete this template? This cannot be undone.")) {
    return;
  }

  // All templates are now in workflow_templates (content_templates deleted)
  const table = 'workflow_templates';

  logger.debug('Template deletion initiated', {
    utility: 'template-operations',
    templateId: template.id,
    templateType: template.template_type,
    table,
    operation: 'deleteTemplate'
  });

  try {
    const { error, data } = await supabase
      .from(table)
      .delete()
      .eq('id', template.id)
      .select();

    logger.debug('Template deletion response received', {
      utility: 'template-operations',
      templateId: template.id,
      success: !error,
      deletedCount: data?.length || 0,
      operation: 'deleteTemplate'
    });

    if (error) {
      logger.error('Template deletion database error', error, {
        utility: 'template-operations',
        templateId: template.id,
        templateType: template.template_type,
        errorCode: error.code,
        errorHint: error.hint,
        operation: 'deleteTemplate'
      });
      throw error;
    }

    toast.success("Template deleted successfully");
  } catch (error) {
    logger.error('Template deletion failed', error instanceof Error ? error : new Error(String(error)), {
      utility: 'template-operations',
      templateId: template.id,
      templateType: template.template_type,
      operation: 'deleteTemplate'
    });
    toast.error(`Failed to delete template: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}

/**
 * Duplicate a template (workflow only - content_templates deleted)
 * @param template - The template to duplicate
 * @returns Promise that resolves with the duplicated template
 */
export async function duplicateTemplate(
  template: MergedTemplate
): Promise<MergedTemplate> {
  const timestamp = Date.now();

  // Ensure required fields are present
  if (!template.category || !template.name) {
    toast.error("Cannot duplicate: missing required fields");
    throw new Error("Missing required fields");
  }

  // All templates are now in workflow_templates (content_templates deleted)
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
 * Enable or disable all templates (workflow templates only - content_templates deleted)
 * @param isActive - Whether to enable (true) or disable (false) all templates
 * @returns Promise that resolves when operation completes
 */
export async function bulkUpdateActive(
  isActive: boolean
): Promise<void> {
  try {
    if (isActive) {
      // All templates are now in workflow_templates (content_templates deleted)
      await supabase.from('workflow_templates').update({ is_active: true }).neq('is_active', true);

      toast.success("All templates enabled");
    } else {
      if (!confirm("Are you sure you want to disable all templates?")) {
        return;
      }

      await supabase.from('workflow_templates').update({ is_active: false }).eq('is_active', true);

      toast.success("All templates disabled");
    }
  } catch (error) {
    logger.error('Bulk template status update failed', error as Error, {
      utility: 'template-operations',
      targetStatus: isActive,
      operation: 'bulkUpdateActive'
    });
    toast.error(`Failed to ${isActive ? 'enable' : 'disable'} all templates`);
    throw error;
  }
}
