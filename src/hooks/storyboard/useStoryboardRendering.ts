import { useState, useCallback, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Storyboard } from './useStoryboardState';
import { logger } from '@/lib/logger';

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
    mutationFn: async ({ confirmRerender = false, notifyOnCompletion = true }: { confirmRerender?: boolean; notifyOnCompletion?: boolean } = {}) => {
      const { data, error } = await supabase.functions.invoke('render-storyboard-video', {
        body: { 
          storyboardId: currentStoryboardId,
          confirmRerender,
          notifyOnCompletion
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
    onError: (error: Error) => {
      logger.error('Render video start failed', error, {
        component: 'useStoryboardRendering',
        operation: 'renderVideoMutation',
        storyboardId: currentStoryboardId
      });
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
    onError: (error: Error) => {
      logger.error('Cancel render failed', error, {
        component: 'useStoryboardRendering',
        operation: 'cancelRenderMutation',
        storyboardId: currentStoryboardId
      });
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
          logger.warn('Rendering timeout detected, attempting recovery', {
            component: 'useStoryboardRendering',
            operation: 'pollRenderStatus',
            storyboardId: currentStoryboardId,
            elapsedMinutes: Math.round((Date.now() - renderingStartTime) / 60000)
          });
          
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
              logger.info('Video recovered after timeout', {
                component: 'useStoryboardRendering',
                operation: 'manualFetch',
                storyboardId: currentStoryboardId
              });
              setIsRendering(false);
              setRenderingStartTime(null);
              setEstimatedRenderTime(null);
              queryClient.invalidateQueries({ queryKey: ['storyboard', currentStoryboardId] });
            } else {
              logger.warn('Manual fetch failed, rendering still in progress', {
                component: 'useStoryboardRendering',
                operation: 'manualFetch',
                storyboardId: currentStoryboardId
              });
            }
          }
        }
      } catch (error) {
        logger.error('Poll render status error', error instanceof Error ? error : new Error(String(error)), {
          component: 'useStoryboardRendering',
          operation: 'pollRenderStatus',
          storyboardId: currentStoryboardId
        });
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

  const renderVideo = useCallback(async (confirmRerender = false, notifyOnCompletion = true) => {
    if (!currentStoryboardId) return null;
    return renderVideoMutation.mutateAsync({ confirmRerender, notifyOnCompletion });
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
        queryClient.invalidateQueries({ queryKey: ['storyboard', currentStoryboardId] });
        return;
      }

      logger.debug('Checking video status', {
        component: 'useStoryboardRendering',
        operation: 'refreshStatus',
        storyboardId: currentStoryboardId
      });

      const { data, error } = await supabase.functions.invoke(
        'fetch-video-status',
        { body: { renderJobId: storyboardData.render_job_id } }
      );

      if (error) throw error;

      if (data.status === 'complete') {
        logger.info('Video status check: complete', {
          component: 'useStoryboardRendering',
          operation: 'refreshStatus',
          storyboardId: currentStoryboardId
        });
        setIsRendering(false);
        setRenderingStartTime(null);
        queryClient.invalidateQueries({ queryKey: ['storyboard', currentStoryboardId] });
      } else if (data.status === 'failed') {
        logger.warn('Video rendering failed', {
          component: 'useStoryboardRendering',
          operation: 'refreshStatus',
          storyboardId: currentStoryboardId
        });
        setIsRendering(false);
        setRenderingStartTime(null);
      } else {
        logger.debug('Video still rendering', {
          component: 'useStoryboardRendering',
          operation: 'refreshStatus',
          storyboardId: currentStoryboardId,
          status: data.status
        });
      }
    } catch (error) {
      logger.error('Video status check failed', error as Error, {
        component: 'useStoryboardRendering',
        operation: 'refreshStatus',
        storyboardId: currentStoryboardId
      });
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
