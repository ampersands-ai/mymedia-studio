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
      // Ensure we have a valid user session and forward it explicitly
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw {
          status: 401,
          message: 'Please sign in again to continue'
        };
      }

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-suno-mp4`;
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
        },
        body: JSON.stringify({
          generation_id: generationId,
          output_index: outputIndex
        })
      });

      let data: any = null;
      try { data = await resp.json(); } catch { /* ignore non-JSON */ }

      if (!resp.ok) {
        const status = resp.status;
        const message = data?.error || data?.message || 'Failed to start video generation';
        const details = data?.details || data?.error || undefined;
        throw { status, message, details };
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
