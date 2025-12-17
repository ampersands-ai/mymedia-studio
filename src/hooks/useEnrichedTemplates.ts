/**
 * Hooks for enriched and preview templates
 * Provides type-safe template data with explicit model metadata
 */

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useWorkflowTemplates } from "./useWorkflowTemplates";
import { enrichTemplates, getTemplatePreviews, EnrichedTemplate } from "@/lib/templates/enrichment";
import type { TemplatePreview, WorkflowTemplatePublic } from "@/types/templates";

/**
 * Fetch all templates with full model metadata enrichment
 * Use when you need complete model data (e.g., generation dialog)
 * 
 * @returns EnrichedTemplate[] - Templates with resolved model metadata
 */
export const useEnrichedTemplates = () => {
  const { data: workflows, isLoading: workflowsLoading, error: workflowsError } = useWorkflowTemplates();
  
  return useQuery<EnrichedTemplate[]>({
    queryKey: ['enriched-templates', workflows?.length],
    queryFn: async () => {
      if (!workflows || workflows.length === 0) return [];
      return enrichTemplates(workflows);
    },
    enabled: !!workflows && workflows.length > 0,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    meta: {
      workflowsLoading,
      workflowsError,
    }
  });
};

/**
 * Get lightweight template previews (synchronous)
 * Use for UI lists, cards, galleries where full model data isn't needed
 * 
 * @returns TemplatePreview[] - Templates with basic model info extracted
 */
export const useTemplatePreviews = () => {
  const { data: workflows, isLoading, error } = useWorkflowTemplates();
  
  const previews = useMemo(() => {
    if (!workflows || workflows.length === 0) return [];
    return getTemplatePreviews(workflows);
  }, [workflows]);

  return {
    data: previews,
    isLoading,
    error,
  };
};

/**
 * Get enriched templates grouped by category
 * Use for category-based displays with full model metadata
 */
export const useEnrichedTemplatesByCategory = () => {
  const { data: enrichedTemplates, isLoading, error } = useEnrichedTemplates();

  const templatesByCategory = useMemo(() => {
    if (!enrichedTemplates || enrichedTemplates.length === 0) return {};
    
    return enrichedTemplates.reduce((acc, template) => {
      const category = template.category || 'Uncategorized';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(template);
      return acc;
    }, {} as Record<string, EnrichedTemplate[]>);
  }, [enrichedTemplates]);

  return {
    templatesByCategory,
    templates: enrichedTemplates,
    isLoading,
    error,
  };
};

/**
 * Get template previews grouped by category
 * Use for category-based galleries where full model data isn't needed
 */
export const useTemplatePreviewsByCategory = () => {
  const { data: previews, isLoading, error } = useTemplatePreviews();

  const templatesByCategory = useMemo(() => {
    if (!previews || previews.length === 0) return {};
    
    return previews.reduce((acc, template) => {
      const category = template.category || 'Uncategorized';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(template);
      return acc;
    }, {} as Record<string, TemplatePreview[]>);
  }, [previews]);

  return {
    templatesByCategory,
    templates: previews,
    isLoading,
    error,
  };
};
