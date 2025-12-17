/**
 * Template Enrichment Functions
 * Explicit, type-safe model metadata resolution from registry
 */

import { getModel } from '@/lib/models/registry';
import { logger } from '@/lib/logger';
import type { WorkflowTemplatePublic, WorkflowTemplatePreview } from '@/types/workflow-public';

/**
 * Model metadata resolved from registry
 */
export interface ModelMetadata {
  recordId: string;
  modelId: string;
  modelName: string;
  baseCost: number;
  contentType: string;
  provider: string;
  estimatedTimeSeconds: number;
}

/**
 * Enriched template with full model metadata
 */
export interface EnrichedTemplate extends WorkflowTemplatePublic {
  modelMetadata: ModelMetadata;
}

/**
 * Enrich template with full model metadata from registry
 * Uses primary_model_record_id from public view
 */
export async function enrichTemplate(template: WorkflowTemplatePublic): Promise<EnrichedTemplate> {
  if (!template.primary_model_record_id) {
    throw new Error(`Template "${template.name}" missing primary_model_record_id`);
  }

  try {
    const modelModule = await getModel(template.primary_model_record_id);
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
export async function enrichTemplates(templates: WorkflowTemplatePublic[]): Promise<EnrichedTemplate[]> {
  const results = await Promise.allSettled(
    templates.map(template => enrichTemplate(template))
  );

  const enriched: EnrichedTemplate[] = [];
  
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      enriched.push(result.value);
    } else {
      logger.error(`Failed to enrich template ${templates[index].name}`, result.reason);
    }
  });

  return enriched;
}

/**
 * Infer content type from model_id string
 */
function inferContentType(modelId?: string | null): 'image' | 'video' | 'audio' | 'text' {
  if (!modelId) return 'image';
  
  const lower = modelId.toLowerCase();
  if (lower.includes('video') || lower.includes('veo') || lower.includes('kling') || lower.includes('runway')) {
    return 'video';
  }
  if (lower.includes('audio') || lower.includes('tts') || lower.includes('eleven') || lower.includes('suno')) {
    return 'audio';
  }
  return 'image';
}

/**
 * Create lightweight template preview (synchronous)
 * Used for UI lists where full model data isn't needed
 */
export function getTemplatePreview(template: WorkflowTemplatePublic): WorkflowTemplatePreview {
  return {
    ...template,
    primaryContentType: inferContentType(template.primary_model_id),
    estimatedBaseCost: 2, // Conservative default
    template_type: 'workflow' as const,
  };
}

/**
 * Create previews for multiple templates (synchronous)
 */
export function getTemplatePreviews(templates: WorkflowTemplatePublic[]): WorkflowTemplatePreview[] {
  return templates.map(getTemplatePreview);
}
