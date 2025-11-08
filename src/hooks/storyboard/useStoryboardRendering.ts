import { useState, useCallback, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Storyboard } from './useStoryboardState';

export const useStoryboardRendering = (
  currentStoryboardId: string | null,
  storyboard: Storyboard | null | undefined
) => {
  const queryClient = useQueryClient();
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderingStartTime, setRenderingStartTime] = useState<number | null>(null);
  const [estimatedRenderTime, setEstimatedRenderTime] = useState<number | null>(null);

  // Render video mutation
  const renderVideoMutation = useMutation({
    mutationFn: async ({ confirmRerender = false }: { confirmRerender?: boolean } = {}) => {
      const { data, error } = await supabase.functions.invoke('render-storyboard-video', {
        body: { 
          storyboardId: currentStoryboardId,
          confirmRerender
        },
      });

      if (error) throw error;
      
      // Check if confirmation is required
      if (data?.requiresConfirmation) {
        return { requiresConfirmation: true, ...data };
      }
      
      return data;
    },
    onSuccess: (data) => {
      // If confirmation is required, don't start rendering yet
      if (data?.requiresConfirmation) {
        return;
      }
      
      setIsRendering(true);
      setRenderingStartTime(Date.now());
      // Store the estimated render time (2x video duration)
      if (storyboard?.duration) {
        setEstimatedRenderTime(storyboard.duration * 2);
      }
    },
    onError: (error: any) => {
      console.error('[useStoryboard] Render start error:', error);
    },
  });

  // Cancel render mutation
  const cancelRenderMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('cancel-render', {
        body: { storyboardId: currentStoryboardId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      setIsRendering(false);
      setRenderProgress(0);
      setRenderingStartTime(null);
      queryClient.invalidateQueries({ queryKey: ['storyboard', currentStoryboardId] });
      toast.success('Render canceled. Status updated to draft.');
    },
    onError: (error: any) => {
      console.error('[useStoryboard] Cancel render error:', error);
      toast.error(`Failed to cancel render: ${error.message}`);
    },
  });

  // Poll render status with timeout detection and auto-recovery
  useEffect(() => {
    if (!isRendering || !currentStoryboardId) return;

    const interval = setInterval(async () => {
      try {
        // Pass storyboardId in body for better compatibility
        const { data, error } = await supabase.functions.invoke(
          'poll-storyboard-status',
          { body: { storyboardId: currentStoryboardId } }
        );

        if (error) throw error;

        // Calculate progress based on 2x the video duration
        const targetDuration = estimatedRenderTime || (storyboard ? storyboard.duration * 2 : 120);
        const elapsed = renderingStartTime ? (Date.now() - renderingStartTime) / 1000 : 0;
        
        // Progress goes from 0% to 90% over targetDuration seconds
        let calculatedProgress = 0;
        if (elapsed <= targetDuration) {
          calculatedProgress = Math.floor((elapsed / targetDuration) * 90);
        } else {
          calculatedProgress = 90; // Stay at 90% until complete
        }
        
        setRenderProgress(calculatedProgress);

        if (data.status === 'complete') {
          setRenderProgress(100);
          setIsRendering(false);
          setRenderingStartTime(null);
          setEstimatedRenderTime(null);
          queryClient.invalidateQueries({ queryKey: ['storyboard', currentStoryboardId] });
        } else if (data.status === 'failed') {
          setIsRendering(false);
          setRenderingStartTime(null);
          setEstimatedRenderTime(null);
        }

        // Phase 4: Timeout detection (10 minutes)
        if (renderingStartTime && Date.now() - renderingStartTime > 10 * 60 * 1000) {
          console.warn('[useStoryboard] Rendering timeout detected, attempting manual fetch...');
          
          // Try manual fetch from JSON2Video
          const { data: storyboardData } = await supabase
            .from('storyboards')
            .select('render_job_id')
            .eq('id', currentStoryboardId)
            .single();

          if (storyboardData?.render_job_id) {
            const { data: fetchData, error: fetchError } = await supabase.functions.invoke(
              'fetch-video-status',
              { body: { renderJobId: storyboardData.render_job_id } }
            );

            if (!fetchError && fetchData?.success) {
              console.log('[useStoryboard] Video recovered successfully');
              setIsRendering(false);
              setRenderingStartTime(null);
              setEstimatedRenderTime(null);
              queryClient.invalidateQueries({ queryKey: ['storyboard', currentStoryboardId] });
            } else {
              console.warn('[useStoryboard] Manual fetch failed, rendering still in progress');
            }
          }
        }
      } catch (error) {
        console.error('[useStoryboard] Poll error:', error);
      }
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(interval);
  }, [isRendering, currentStoryboardId, queryClient, renderingStartTime, estimatedRenderTime, storyboard]);

  // Realtime subscription for storyboard updates (webhook notifications)
  useEffect(() => {
    if (!currentStoryboardId) return;

    const channel = supabase
      .channel(`storyboard:${currentStoryboardId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'storyboards',
        filter: `id=eq.${currentStoryboardId}`
      }, (payload) => {
        const updatedStoryboard = payload.new as Storyboard;
        queryClient.setQueryData(['storyboard', currentStoryboardId], updatedStoryboard);
        
        // Update state when webhook notifies status change
        if (updatedStoryboard.status === 'complete' && isRendering) {
          setIsRendering(false);
          setRenderProgress(100);
        } else if (updatedStoryboard.status === 'failed' && isRendering) {
          setIsRendering(false);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentStoryboardId, queryClient, isRendering]);

  const renderVideo = useCallback(async (confirmRerender = false) => {
    if (!currentStoryboardId) return null;
    return renderVideoMutation.mutateAsync({ confirmRerender });
  }, [currentStoryboardId, renderVideoMutation]);

  const cancelRender = useCallback(() => {
    cancelRenderMutation.mutate();
  }, [cancelRenderMutation]);

  // Manual refresh status for stuck videos
  const refreshStatus = useCallback(async () => {
    if (!currentStoryboardId) return;

    try {
      const { data: storyboardData } = await supabase
        .from('storyboards')
        .select('render_job_id, status')
        .eq('id', currentStoryboardId)
        .single();

      if (!storyboardData?.render_job_id) {
        toast.error('No render job ID found');
        return;
      }

      if (storyboardData.status === 'complete') {
        toast.info('Video already complete!');
        queryClient.invalidateQueries({ queryKey: ['storyboard', currentStoryboardId] });
        return;
      }

      console.log('[useStoryboard] Checking video status...');

      const { data, error } = await supabase.functions.invoke(
        'fetch-video-status',
        { body: { renderJobId: storyboardData.render_job_id } }
      );

      if (error) throw error;

      if (data.status === 'complete') {
        console.log('[useStoryboard] Video is ready');
        setIsRendering(false);
        setRenderingStartTime(null);
        queryClient.invalidateQueries({ queryKey: ['storyboard', currentStoryboardId] });
      } else if (data.status === 'failed') {
        console.warn('[useStoryboard] Video rendering failed');
        setIsRendering(false);
        setRenderingStartTime(null);
      } else {
        console.log('[useStoryboard] Still rendering...');
      }
    } catch (error: any) {
      console.error('[useStoryboard] Failed to check status:', error);
    }
  }, [currentStoryboardId, queryClient]);

  return {
    isRendering,
    renderProgress,
    renderingStartTime,
    renderVideo,
    cancelRender,
    isCancelingRender: cancelRenderMutation.isPending,
    refreshStatus,
  };
};
