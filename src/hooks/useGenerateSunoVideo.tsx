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
      
      if (error) {
        // Parse HTTP status from error if available
        const status = (error as any)?.status;
        throw { ...error, status };
      }
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
      
      const status = error?.status;
      const errorMessage = error?.message || 'Failed to start video generation';
      const errorDetails = error?.details || error?.error;
      
      // Map status codes to user-friendly messages
      let description = errorDetails || errorMessage;
      
      if (status === 401) {
        description = 'Please sign in again to continue';
      } else if (status === 402) {
        description = 'You need 5 credits to generate a video. Please add more credits.';
      } else if (status === 400) {
        // Use backend validation message
        description = errorMessage;
      } else if (status === 500) {
        description = 'Video provider error—please try again in a moment';
      } else if (description.includes('Edge Function')) {
        description = 'Service temporarily unavailable. Please try again.';
      }
      
      toast.error('Failed to generate video', {
        description,
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
