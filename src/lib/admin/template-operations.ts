import { supabase } from "@/integrations/supabase/client";
import type { MergedTemplate } from "@/hooks/useTemplates";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

/**
 * Toggle the active status of a template (content or workflow)
 * @param template - The template to toggle
 * @returns Promise that resolves when operation completes
 */
export async function toggleTemplateActive(
  template: MergedTemplate
): Promise<void> {
  const table = template.template_type === 'template' 
    ? 'content_templates' 
    : 'workflow_templates';
  
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
 * Delete a template (content or workflow) with confirmation
 * @param template - The template to delete
 * @returns Promise that resolves when deletion completes
 */
export async function deleteTemplate(
  template: MergedTemplate
): Promise<void> {
  if (!confirm("Are you sure you want to delete this template? This cannot be undone.")) {
    return;
  }

  const table = template.template_type === 'template' 
    ? 'content_templates' 
    : 'workflow_templates';

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
  } catch (error: any) {
    logger.error('Template deletion failed', error, {
      utility: 'template-operations',
      templateId: template.id,
      templateType: template.template_type,
      operation: 'deleteTemplate'
    });
    toast.error(`Failed to delete template: ${error.message || 'Unknown error'}`);
    throw error;
  }
}

/**
 * Duplicate a template (content or workflow) and return the new template
 * @param template - The template to duplicate
 * @returns Promise that resolves with the duplicated template
 */
export async function duplicateTemplate(
  template: MergedTemplate
): Promise<MergedTemplate> {
  const timestamp = Date.now();
  
  if (template.template_type === 'template') {
    const { workflow_steps, user_input_fields, template_type, ai_models, ...templateData } = template;
    
    // Ensure required fields are present
    if (!template.category || !template.name) {
      toast.error("Cannot duplicate: missing required fields");
      throw new Error("Missing required fields");
    }
    
    const newTemplate = {
      id: `${template.id}-copy-${timestamp}`,
      name: `${template.name} (Copy)`,
      category: template.category!,
      description: template.description || null,
      model_id: template.model_id || null,
      preset_parameters: (template.preset_parameters || {}) as any,
      enhancement_instruction: template.enhancement_instruction || null,
      thumbnail_url: template.thumbnail_url || null,
      is_active: false,
      display_order: template.display_order || 0,
      estimated_time_seconds: template.estimated_time_seconds || null,
      user_editable_fields: template.user_editable_fields as any || [],
      hidden_field_defaults: template.hidden_field_defaults as any || {},
      is_custom_model: template.is_custom_model || false,
      model_record_id: ('model_record_id' in template ? template.model_record_id as string : null) || null,
      before_image_url: template.before_image_url || null,
      after_image_url: template.after_image_url || null,
    };
    
    const { error } = await supabase
      .from('content_templates')
      .insert([newTemplate]);
      
    if (error) {
      toast.error("Failed to duplicate template: " + error.message);
      throw error;
    }
    
    toast.success("Template duplicated - now editing copy");
    
    return { ...newTemplate, template_type: 'template' as const } as MergedTemplate;
  } else {
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
}

/**
 * Enable or disable all templates (both content and workflow)
 * @param isActive - Whether to enable (true) or disable (false) all templates
 * @returns Promise that resolves when operation completes
 */
export async function bulkUpdateActive(
  isActive: boolean
): Promise<void> {
  try {
    if (isActive) {
      await Promise.all([
        supabase.from('content_templates').update({ is_active: true }).neq('is_active', true),
        supabase.from('workflow_templates').update({ is_active: true }).neq('is_active', true),
      ]);
      
      toast.success("All templates enabled");
    } else {
      if (!confirm("Are you sure you want to disable all templates?")) {
        return;
      }
      
      await Promise.all([
        supabase.from('content_templates').update({ is_active: false }).eq('is_active', true),
        supabase.from('workflow_templates').update({ is_active: false }).eq('is_active', true),
      ]);
      
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
