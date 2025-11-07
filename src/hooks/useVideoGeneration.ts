import { useState, useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useGenerateSunoVideo } from "@/hooks/useGenerateSunoVideo";

/**
 * Video-from-audio generation management
 * Tracks video generation state and child video generations
 */
export const useVideoGeneration = (parentGenerationId: string | null) => {
  const queryClient = useQueryClient();
  const { generateVideo, isGenerating: isGeneratingVideo } = useGenerateSunoVideo();
  const [generatingVideoIndex, setGeneratingVideoIndex] = useState<number | null>(null);

  /**
   * Query child generations (audio + video)
   */
  const { data: childVideoGenerations = [] } = useQuery({
    queryKey: ['child-video-generations', parentGenerationId],
    queryFn: async () => {
      if (!parentGenerationId) return [];
      
      const { data, error } = await supabase
        .from('generations')
        .select('id, storage_path, output_index, status, type')
        .eq('parent_generation_id', parentGenerationId)
        .in('type', ['audio', 'video'])
        .order('output_index', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!parentGenerationId,
    refetchInterval: (query) => {
      // Poll every 5 seconds if any videos are pending/processing
      const data = query.state.data || [];
      const hasProcessing = data.some((v: any) => 
        v.status === 'pending' || v.status === 'processing'
      );
      return hasProcessing ? 5000 : false;
    },
  });

  /**
   * Realtime subscription for video generation updates
   */
  useEffect(() => {
    if (!parentGenerationId) return;

    const channel = supabase
      .channel(`video-generations-${parentGenerationId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'generations',
          filter: `parent_generation_id=eq.${parentGenerationId}`,
        },
        () => {
          queryClient.invalidateQueries({ 
            queryKey: ['child-video-generations', parentGenerationId] 
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [parentGenerationId, queryClient]);

  /**
   * Generate video from audio output
   */
  const handleGenerateVideo = useCallback((outputIndex: number) => {
    if (!parentGenerationId) return;
    
    setGeneratingVideoIndex(outputIndex);
    generateVideo({ 
      generationId: parentGenerationId, 
      outputIndex 
    }, {
      onSuccess: () => {
        setGeneratingVideoIndex(null);
      },
      onError: () => {
        setGeneratingVideoIndex(null);
      }
    });
  }, [parentGenerationId, generateVideo]);

  return {
    childVideoGenerations,
    generatingVideoIndex,
    setGeneratingVideoIndex,
    handleGenerateVideo,
    isGeneratingVideo,
  };
};
