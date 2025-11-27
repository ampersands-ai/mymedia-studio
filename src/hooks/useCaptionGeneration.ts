import { useState, useCallback } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { CaptionData, GenerationOutput } from "@/types/custom-creation";
import { logger } from '@/lib/logger';

/**
 * Caption and hashtags management
 * Generate, regenerate, copy functionality
 */
export const useCaptionGeneration = (
  generatedOutputs: GenerationOutput[],
  prompt: string,
  selectedModel: string | null,
  filteredModels: Array<{ 
    id: string; 
    model_name: string; 
    record_id: string;
    content_type?: string;
    capabilities?: string[] 
  }>
) => {
  const [captionData, setCaptionData] = useState<CaptionData | null>(null);
  const [isGeneratingCaption, setIsGeneratingCaption] = useState(false);

  /**
   * Generate caption and hashtags
   * @param outputs - Optional fresh outputs array to avoid stale state
   */
  const generateCaption = useCallback(async (outputs?: GenerationOutput[]) => {
    const outputsToUse = outputs || generatedOutputs;
    if (outputsToUse.length === 0) return;
    
    // Prevent concurrent calls
    if (isGeneratingCaption) {
      logger.warn('Caption generation already in progress', {
        component: 'useCaptionGeneration',
        operation: 'generateCaption'
      });
      return;
    }
    
    setIsGeneratingCaption(true);
    try {
      const selectedModelData = filteredModels.find(m => m.record_id === selectedModel);
      const { data: captionResult, error } = await supabase.functions.invoke('generate-caption', {
        body: {
          generation_id: outputsToUse[0].id,
          prompt: prompt,
          content_type: selectedModelData?.content_type || 'image',
          model_name: selectedModelData?.model_name || 'AI Model'
        }
      });
      
      if (error) throw error;
      
      setCaptionData({
        caption: captionResult.caption,
        hashtags: captionResult.hashtags,
        generated_at: captionResult.generated_at
      });
    } catch (err) {
      logger.error('Caption generation failed', err instanceof Error ? err : new Error(String(err)), {
        component: 'useCaptionGeneration',
        operation: 'generateCaption',
        generationId: outputsToUse[0]?.id
      });
      toast.error("Failed to generate caption. Please try again.");
    } finally {
      setIsGeneratingCaption(false);
    }
  }, [generatedOutputs, prompt, selectedModel, filteredModels, isGeneratingCaption]);

  /**
   * Regenerate caption
   */
  const regenerateCaption = useCallback(async () => {
    await generateCaption();
  }, [generateCaption]);

  /**
   * Copy caption to clipboard
   */
  const copyCaptionToClipboard = useCallback(() => {
    if (!captionData) return;
    navigator.clipboard.writeText(captionData.caption);
    toast.success("Caption copied!");
  }, [captionData]);

  /**
   * Copy all hashtags to clipboard
   */
  const copyHashtagsToClipboard = useCallback(() => {
    if (!captionData) return;
    const hashtagText = captionData.hashtags.join(' ');
    navigator.clipboard.writeText(hashtagText);
    toast.success("All hashtags copied!");
  }, [captionData]);

  return {
    captionData,
    setCaptionData,
    isGeneratingCaption,
    generateCaption,
    regenerateCaption,
    copyCaptionToClipboard,
    copyHashtagsToClipboard,
  };
};
