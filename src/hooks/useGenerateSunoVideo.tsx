import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logger, generateRequestId } from "@/lib/logger";

const videoLogger = logger.child({ component: 'useGenerateSunoVideo' });

interface GenerateVideoParams {
  generationId: string;
  outputIndex: number;
}

interface VideoError {
  status: number;
  message: string;
  details?: string;
}

export function useGenerateSunoVideo() {
  const queryClient = useQueryClient();

  const { mutate, isPending, error } = useMutation({
    mutationFn: async ({ generationId, outputIndex }: GenerateVideoParams) => {
      const requestId = generateRequestId();
      const timer = videoLogger.startTimer('generateVideo', { requestId, generationId, outputIndex });
      
      // Ensure we have a valid user session and forward it explicitly
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        videoLogger.warn('No session found for video generation', { requestId });
        throw {
          status: 401,
          message: 'Please sign in again to continue'
        } as VideoError;
      }

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-suno-mp4`;
      
      videoLogger.info('Starting video generation', { 
        requestId, 
        generationId, 
        outputIndex 
      });
      
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

      let data: Record<string, unknown> | null = null;
      try { 
        data = await resp.json(); 
      } catch { 
        videoLogger.warn('Failed to parse JSON response', { requestId });
      }

      if (!resp.ok) {
        const status = resp.status;
        const message = data?.error as string || data?.message as string || 'Failed to start video generation';
        const details = data?.details as string || data?.error as string || undefined;
        
        videoLogger.error('Video generation failed', new Error(message), { 
          requestId, 
          status, 
          details 
        });
        
        throw { status, message, details } as VideoError;
      }

      timer.end({ success: true });
      videoLogger.info('Video generation started successfully', { requestId, generationId });
      
      return data;
    },
    onSuccess: (_data, variables) => {
      toast.success('🎬 Video generation started!', {
        description: 'Your music video will be ready in ~30 seconds',
        duration: 5000
      });
      
      // Invalidate all relevant queries to trigger immediate UI updates
      queryClient.invalidateQueries({ queryKey: ['generations'] });
      queryClient.invalidateQueries({ 
        queryKey: ['child-video-generations', variables.generationId] 
      });
    },
    onError: (error: VideoError) => {
      videoLogger.error('Video generation mutation error', new Error(error.message), {
        status: error.status,
        details: error.details
      });
      
      const status = error?.status;
      const errorMessage = error?.message || 'Failed to start video generation';
      const errorDetails = error?.details || error?.message;
      
      // Map status codes to user-friendly messages
      let description = errorDetails || errorMessage;
      
      if (status === 401) {
        description = 'Please sign in again to continue';
      } else if (status === 402) {
        description = 'You need 1 credit to generate a video. Please add more credits.';
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
