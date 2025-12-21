import { useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useVideoEditorStore } from '../store';
import { RenderStatus, VideoEditorJob } from '../types';

interface UseVideoEditorRenderReturn {
  submitRender: () => Promise<void>;
  cancelRender: () => void;
  retryRender: () => Promise<void>;
  isRendering: boolean;
  currentJob: VideoEditorJob | null;
}

export const useVideoEditorRender = (): UseVideoEditorRenderReturn => {
  const { user } = useAuth();
  const {
    clips,
    audioTrack,
    subtitleConfig,
    outputSettings,
    currentJobId,
    renderStatus,
    buildShotstackPayload,
    getTotalDuration,
    getEstimatedCredits,
    setRenderStatus,
    setRenderProgress,
    setCurrentJobId,
    setFinalVideoUrl,
    setErrorMessage,
  } = useVideoEditorStore();

  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const currentJobRef = useRef<VideoEditorJob | null>(null);

  // Set up realtime subscription for job updates
  useEffect(() => {
    if (!currentJobId) return;

    const channel = supabase
      .channel(`video-editor-job-${currentJobId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'video_editor_jobs',
          filter: `id=eq.${currentJobId}`,
        },
        (payload) => {
          const job = payload.new as VideoEditorJob;
          currentJobRef.current = job;
          
          setRenderStatus(job.status as RenderStatus);
          
          if (job.status === 'done' && job.final_video_url) {
            setFinalVideoUrl(job.final_video_url);
            setRenderProgress(100);
            toast.success('Video rendered successfully!');
          } else if (job.status === 'failed') {
            setErrorMessage(job.error_message || 'Render failed');
            toast.error(job.error_message || 'Render failed');
          } else if (job.status === 'rendering') {
            // Estimate progress based on time
            setRenderProgress(50);
          } else if (job.status === 'saving') {
            setRenderProgress(90);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentJobId, setRenderStatus, setRenderProgress, setFinalVideoUrl, setErrorMessage]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  const submitRender = useCallback(async () => {
    if (!user) {
      toast.error('You must be logged in to render videos');
      return;
    }

    if (clips.length === 0) {
      toast.error('Add at least one clip to render');
      return;
    }

    const totalDuration = getTotalDuration();
    const estimatedCredits = getEstimatedCredits();

    try {
      setRenderStatus('uploading');
      setRenderProgress(10);
      setErrorMessage(null);

      // Build Shotstack payload
      const payload = buildShotstackPayload();

      // Call edge function to start render
      const { data, error } = await supabase.functions.invoke('render-video-editor', {
        body: {
          clips: clips.map(c => ({
            ...c,
            asset: undefined, // Don't send full asset object
          })),
          audioTrack: audioTrack ? {
            ...audioTrack,
            asset: undefined,
          } : null,
          subtitleConfig,
          outputSettings,
          totalDuration,
          estimatedCredits,
          shotstackPayload: payload,
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to start render');
      }

      if (!data?.jobId) {
        throw new Error('No job ID returned');
      }

      setCurrentJobId(data.jobId);
      setRenderStatus('queued');
      setRenderProgress(20);
      toast.info('Render job started...');

      // Start polling for status updates as backup to realtime
      pollingRef.current = setInterval(async () => {
        try {
          const { data: statusData, error: statusError } = await supabase.functions.invoke(
            'status-video-editor',
            { body: { jobId: data.jobId } }
          );

          if (statusError) {
            console.error('Status poll error:', statusError);
            return;
          }

          if (statusData?.status === 'done' || statusData?.status === 'failed') {
            if (pollingRef.current) {
              clearInterval(pollingRef.current);
              pollingRef.current = null;
            }
          }
        } catch (err) {
          console.error('Polling error:', err);
        }
      }, 5000); // Poll every 5 seconds

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start render';
      setErrorMessage(message);
      setRenderStatus('failed');
      toast.error(message);
    }
  }, [
    user,
    clips,
    audioTrack,
    subtitleConfig,
    outputSettings,
    getTotalDuration,
    getEstimatedCredits,
    buildShotstackPayload,
    setRenderStatus,
    setRenderProgress,
    setCurrentJobId,
    setErrorMessage,
  ]);

  const cancelRender = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    setRenderStatus('idle');
    setCurrentJobId(null);
    setRenderProgress(0);
    toast.info('Render cancelled');
  }, [setRenderStatus, setCurrentJobId, setRenderProgress]);

  const retryRender = useCallback(async () => {
    setErrorMessage(null);
    setRenderStatus('idle');
    setCurrentJobId(null);
    setFinalVideoUrl(null);
    await submitRender();
  }, [submitRender, setErrorMessage, setRenderStatus, setCurrentJobId, setFinalVideoUrl]);

  const isRendering = ['uploading', 'queued', 'fetching', 'rendering', 'saving'].includes(renderStatus);

  return {
    submitRender,
    cancelRender,
    retryRender,
    isRendering,
    currentJob: currentJobRef.current,
  };
};
