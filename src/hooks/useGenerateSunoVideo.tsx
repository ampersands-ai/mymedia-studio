import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface GenerateVideoParams {
  generationId: string;
  outputIndex: number;
}

export function useGenerateSunoVideo() {
  const queryClient = useQueryClient();

  const { mutate, isPending, error } = useMutation({
    mutationFn: async ({ generationId, outputIndex }: GenerateVideoParams) => {
      const { data, error } = await supabase.functions.invoke('generate-suno-mp4', {
        body: { 
          generation_id: generationId, 
          output_index: outputIndex 
        }
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success('🎬 Video generation started!', {
        description: 'Your music video will be ready in ~30 seconds',
        duration: 5000
      });
      
      // Invalidate generations query to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['generations'] });
    },
    onError: (error: any) => {
      console.error('Video generation error:', error);
      
      const errorMessage = error?.message || 'Failed to start video generation';
      const errorDetails = error?.details || error?.error;
      
      toast.error('Failed to generate video', {
        description: errorDetails || errorMessage,
        duration: 8000
      });
    }
  });

  return { 
    generateVideo: mutate, 
    isGenerating: isPending, 
    error 
  };
}
