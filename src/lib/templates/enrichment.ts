/**
 * Template Enrichment Functions
 * Explicit, type-safe model metadata resolution from registry
 */

import { getModel } from '@/lib/models/registry';
import type { 
  WorkflowTemplate, 
  EnrichedTemplate, 
  TemplatePreview, 
  ModelMetadata,
  hasModelInFirstStep,
  inferContentTypeFromModelId 
} from '@/types/templates';

/**
 * Enrich template with full model metadata from registry
 * @throws Error if template has no model_record_id in first step
 * @throws Error if model not found in registry
 */
export async function enrichTemplate(template: WorkflowTemplate): Promise<EnrichedTemplate> {
  const firstStep = template.workflow_steps[0];
  
  if (!firstStep?.model_record_id) {
    throw new Error(`Template "${template.name}" missing model_record_id in first workflow step`);
  }

  try {
    const modelModule = await getModel(firstStep.model_record_id);
    const config = modelModule.MODEL_CONFIG;

    const modelMetadata: ModelMetadata = {
      recordId: config.recordId,
      modelId: config.modelId,
      modelName: config.modelName,
      baseCost: config.baseCreditCost,
      contentType: config.contentType,
      provider: config.provider,
      estimatedTimeSeconds: config.estimatedTimeSeconds,
    };

    return {
      ...template,
      modelMetadata,
    };
  } catch (error) {
    throw new Error(
      `Failed to enrich template "${template.name}": ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Enrich multiple templates in batch
 * Filters out templates that fail enrichment and logs errors
 */
export async function enrichTemplates(templates: WorkflowTemplate[]): Promise<EnrichedTemplate[]> {
  const results = await Promise.allSettled(
    templates.map(template => enrichTemplate(template))
  );

  const enriched: EnrichedTemplate[] = [];
  
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      enriched.push(result.value);
    } else {
      console.error(`Failed to enrich template ${templates[index].name}:`, result.reason);
    }
  });

  return enriched;
}

/**
 * Create lightweight template preview (synchronous)
 * Used for UI lists where full model data isn't needed
 * Falls back to heuristics if model data unavailable
 */
export function getTemplatePreview(template: WorkflowTemplate): TemplatePreview {
  const firstStep = template.workflow_steps[0];
  const modelRecordId = firstStep?.model_record_id || 'unknown';
  const modelId = firstStep?.model_id || '';
  
  // Import the inference function directly to avoid circular dependency
  const inferContentType = (modelId?: string): 'image' | 'video' | 'audio' | 'text' => {
    if (!modelId) return 'image';
    
    const lower = modelId.toLowerCase();
    if (lower.includes('video') || lower.includes('veo') || lower.includes('kling') || lower.includes('runway')) {
      return 'video';
    }
    if (lower.includes('audio') || lower.includes('tts') || lower.includes('eleven') || lower.includes('suno')) {
      return 'audio';
    }
    return 'image';
  };

  return {
    ...template,
    primaryModelRecordId: modelRecordId,
    primaryContentType: inferContentType(modelId),
    estimatedBaseCost: 2, // Conservative default
    template_type: 'workflow' as const, // For backward compatibility
  };
}

/**
 * Create previews for multiple templates (synchronous)
 */
export function getTemplatePreviews(templates: WorkflowTemplate[]): TemplatePreview[] {
  return templates.map(getTemplatePreview);
}
