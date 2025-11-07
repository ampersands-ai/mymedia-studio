import { useState, useCallback } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { CaptionData, GenerationOutput } from "@/types/custom-creation";

/**
 * Caption and hashtags management
 * Generate, regenerate, copy functionality
 */
export const useCaptionGeneration = (
  generatedOutputs: GenerationOutput[],
  prompt: string,
  selectedModel: string | null,
  filteredModels: any[]
) => {
  const [captionData, setCaptionData] = useState<CaptionData | null>(null);
  const [isGeneratingCaption, setIsGeneratingCaption] = useState(false);

  /**
   * Generate caption and hashtags
   */
  const generateCaption = useCallback(async () => {
    if (generatedOutputs.length === 0) return;
    
    setIsGeneratingCaption(true);
    try {
      const selectedModelData = filteredModels.find(m => m.record_id === selectedModel);
      const { data: captionResult, error } = await supabase.functions.invoke('generate-caption', {
        body: {
          generation_id: generatedOutputs[0].id,
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
      
      toast.success("Caption and hashtags generated!");
    } catch (err) {
      console.error("Caption generation failed:", err);
      toast.error("Failed to generate caption");
    } finally {
      setIsGeneratingCaption(false);
    }
  }, [generatedOutputs, prompt, selectedModel, filteredModels]);

  /**
   * Regenerate caption
   */
  const regenerateCaption = useCallback(async () => {
    await generateCaption();
    toast.success("Caption regenerated!");
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
