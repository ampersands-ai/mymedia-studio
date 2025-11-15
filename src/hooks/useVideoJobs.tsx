import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { VideoJob, VideoJobInput } from '@/types/video';
import { logger } from '@/lib/logger';

const PINNED_JOB_KEY = 'pinnedVideoJobId';
const CLEARED_FLAG_KEY = 'videoJobsCleared';

// Safe localStorage helpers
const getPinnedJobId = (): string | null => {
  try {
    return localStorage.getItem(PINNED_JOB_KEY);
  } catch {
    return null;
  }
};

const getCleared = (): boolean => {
  try {
    return localStorage.getItem(CLEARED_FLAG_KEY) === '1';
  } catch {
    return false;
  }
};

const setCleared = (value: boolean): void => {
  try {
    if (value) {
      localStorage.setItem(CLEARED_FLAG_KEY, '1');
    } else {
      localStorage.removeItem(CLEARED_FLAG_KEY);
    }
  } catch {}
};

export function useVideoJobs() {
  const queryClient = useQueryClient();
  const [pinnedJobId, setPinnedJobId] = useState<string | null>(getPinnedJobId());

  // Fetch user's latest active job or pinned job
  const { data: jobs, isLoading } = useQuery({
    queryKey: ['video-jobs'],
    queryFn: async () => {
      // Return empty if user cleared the generation
      if (getCleared()) {
        return [];
      }
      
      const pinnedId = getPinnedJobId();
      const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();
      const fourHoursCutoff = Date.now() - 4 * 60 * 60 * 1000;
      
      // If we have a pinned job, fetch it first (regardless of status)
      if (pinnedId) {
        const { data: pinnedData, error: pinnedError } = await supabase
          .from('video_jobs')
          .select('*')
          .eq('id', pinnedId)
          .single();
        
        if (!pinnedError && pinnedData) {
          // Check if job is older than 4 hours
          const jobTime = new Date(pinnedData.updated_at).getTime();
          
          if (jobTime >= fourHoursCutoff) {
            // Job is fresh enough, return it
            return [pinnedData];
          } else {
            // Job is too old, clear the pin and fall through to recent jobs
            try {
              localStorage.removeItem(PINNED_JOB_KEY);
              setPinnedJobId(null);
            } catch {}
          }
        } else {
          // If pinned job doesn't exist, clear the pin silently and fall through
          try {
            localStorage.removeItem(PINNED_JOB_KEY);
            setPinnedJobId(null);
          } catch {}
        }
      }
      
      // Otherwise fetch the most recent job (within last 4 hours, any status)
      const { data, error } = await supabase
        .from('video_jobs')
        .select('*')
        .gte('updated_at', fourHoursAgo)
        .order('updated_at', { ascending: false })
        .limit(1);
      
      if (error) throw error;
      return (data || []) as VideoJob[];
    },
    refetchInterval: (query) => {
      const jobs = query.state.data || [];
      if (jobs.length === 0) return false;
      
      const firstJob = jobs[0];
      const activeStatuses = [
        'pending', 'generating_script', 'awaiting_script_approval',
        'generating_voice', 'awaiting_voice_approval', 'fetching_video', 'assembling'
      ];
      
      // Continue polling if job is active OR if it's completed/failed but pinned
      const isActive = activeStatuses.includes(firstJob.status);
      const pinnedId = getPinnedJobId();
      const isPinnedAndRecent = pinnedId === firstJob.id;
      
      return (isActive || isPinnedAndRecent) ? 10000 : false;
    },
  });

  // Realtime subscription for status updates
  useEffect(() => {
    const channel = supabase
      .channel('video-jobs-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'video_jobs' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['video-jobs'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Sync pinned job across multiple hook instances
  useEffect(() => {
    const sync = () => setPinnedJobId(getPinnedJobId());
    window.addEventListener('videojobs:pin-change', sync as any);
    window.addEventListener('storage', sync as any);
    return () => {
      window.removeEventListener('videojobs:pin-change', sync as any);
      window.removeEventListener('storage', sync as any);
    };
  }, []);

  // Pin/unpin helpers
  const pinJob = (jobId: string) => {
    try {
      localStorage.setItem(PINNED_JOB_KEY, jobId);
      setCleared(false);
      setPinnedJobId(jobId);
      // Notify other hook instances in this document
      window.dispatchEvent(new CustomEvent('videojobs:pin-change'));
    } catch {}
    queryClient.invalidateQueries({ queryKey: ['video-jobs'] });
  };

  const clearPinnedJob = () => {
    try {
      localStorage.removeItem(PINNED_JOB_KEY);
      setCleared(true);
      setPinnedJobId(null);
      // Notify other hook instances in this document
      window.dispatchEvent(new CustomEvent('videojobs:pin-change'));
    } catch {}
    queryClient.invalidateQueries({ queryKey: ['video-jobs'] });
  };
  // Create video job mutation
  const createJob = useMutation({
    mutationFn: async (input: VideoJobInput) => {
      const { data, error } = await supabase.functions.invoke('create-video-job', {
        body: input,
      });
      
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data;
    },
    onMutate: async () => {
      // Cancel outgoing refetches to prevent race conditions
      await queryClient.cancelQueries({ queryKey: ['video-jobs'] });

      // Ensure cleared flag is off so query won't hide results
      setCleared(false);

      // Don't clear anything - let old job stay visible until new one appears
      // This prevents the blank state flash
    },
    onSuccess: (data) => {
      // Clear the cleared flag now that we have a new job
      setCleared(false);
      
      // Pin the newly created job and show it immediately
      if (data.job?.id) {
        pinJob(data.job.id);
        queryClient.setQueryData(['video-jobs'], [data.job]);
      }
      queryClient.invalidateQueries({ queryKey: ['video-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['user-tokens'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create video job');
      // Refetch to restore accurate state after error
      queryClient.invalidateQueries({ queryKey: ['video-jobs'] });
    },
  });

  // Approve script mutation (with optional editing)
  const approveScript = useMutation({
    mutationFn: async ({ jobId, editedScript }: { jobId: string; editedScript?: string }) => {
      // Check session before calling function
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Please sign in to continue');
      }

      // Retry helper for transient failures
      const invokeWithRetry = async (attempt = 1): Promise<any> => {
        try {
          const { data, error } = await supabase.functions.invoke('approve-script', {
            body: { job_id: jobId, edited_script: editedScript },
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          });

          if (error) throw error;
          if (data?.error) throw new Error(data.error);
          return data;
        } catch (err: any) {
          const errorMsg = err?.message || String(err);
          // Retry once on "Failed to send" or 503 errors
          if (attempt === 1 && (errorMsg.includes('Failed to send a request to the Edge Function') || errorMsg.includes('503'))) {
            logger.debug('Retrying after transient error', {
              component: 'useVideoJobs',
              operation: 'approveScript',
              attempt,
              error: errorMsg
            });
            await new Promise(resolve => setTimeout(resolve, 500));
            return invokeWithRetry(2);
          }
          throw err;
        }
      };

      return invokeWithRetry();
    },
    onSuccess: async () => {
      // Force immediate refetch to update UI
      await queryClient.refetchQueries({ queryKey: ['video-jobs'] });
    },
    onError: (error: any) => {
      const message = error.message || 'Failed to approve script';
      
      // Surface helpful messages
      if (message.includes('sign in')) {
        toast.error('Please sign in to continue');
      } else if (message.includes('429') || message.includes('rate limit')) {
        toast.error('Service temporarily busy. Please try again in a moment.');
      } else if (message.includes('timeout') || message.includes('timed out')) {
        toast.error('Request timed out. Please try again.');
      } else if (message.includes('quota') || message.includes('limit exceeded')) {
        toast.error('API quota exceeded. Please contact support.');
      } else {
        toast.error(message);
      }
    },
  });

  // Approve voiceover mutation
  const approveVoiceover = useMutation({
    mutationFn: async (jobId: string) => {
      logger.debug('Starting voiceover approval', {
        component: 'useVideoJobs',
        operation: 'approveVoiceover',
        jobId
      });
      
      // Check session before calling function
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Please sign in to continue');
      }
      
      logger.debug('Session valid, invoking approve-voiceover function', {
        component: 'useVideoJobs',
        operation: 'approveVoiceover',
        jobId
      });
      
      // Retry helper for transient failures
      const invokeWithRetry = async (attempt = 1): Promise<any> => {
        try {
          const { data, error } = await supabase.functions.invoke('approve-voiceover', {
            body: { job_id: jobId },
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          });

          logger.debug('Function response received', {
            component: 'useVideoJobs',
            operation: 'approveVoiceover',
            jobId,
            attempt,
            hasData: !!data,
            hasError: !!error
          });
          
          if (error) {
            logger.error('Function invocation error', error as Error, {
              component: 'useVideoJobs',
              operation: 'approveVoiceover',
              jobId
            });
            throw error;
          }
          if (data?.error) {
            logger.error('Function returned error', new Error(data.error), {
              component: 'useVideoJobs',
              operation: 'approveVoiceover',
              jobId
            });
            throw new Error(data.error);
          }
          
          logger.debug('Voiceover approval successful', {
            component: 'useVideoJobs',
            operation: 'approveVoiceover',
            jobId
          });
          return data;
        } catch (err: any) {
          const errorMsg = err?.message || String(err);
          logger.error('Attempt failed', err as Error, {
            component: 'useVideoJobs',
            operation: 'approveVoiceover',
            jobId,
            attempt,
            errorMsg
          });
          
          // Retry once on "Failed to send" or 503 errors
          if (attempt === 1 && (errorMsg.includes('Failed to send a request to the Edge Function') || errorMsg.includes('503'))) {
            logger.debug('Retrying after transient error', {
              component: 'useVideoJobs',
              operation: 'approveVoiceover',
              jobId,
              attempt
            });
            await new Promise(resolve => setTimeout(resolve, 500));
            return invokeWithRetry(2);
          }
          throw err;
        }
      };

      return invokeWithRetry();
    },
    onSuccess: async () => {
      logger.debug('Mutation successful, refetching jobs', {
        component: 'useVideoJobs',
        operation: 'approveVoiceover'
      });
      // Force immediate refetch to update UI
      await queryClient.refetchQueries({ queryKey: ['video-jobs'] });
    },
    onError: (error: any) => {
      logger.error('Mutation error', error as Error, {
        component: 'useVideoJobs',
        operation: 'approveVoiceover'
      });
      const message = error.message || 'Failed to approve voiceover';
      
      // Parse specific error types for better user feedback
      if (message.includes('sign in')) {
        toast.error('Please sign in to continue');
      } else if (message.includes('Shotstack')) {
        toast.error('Video assembly failed. Please try again or contact support.');
      } else if (message.includes('Pixabay')) {
        toast.error('Failed to fetch background media. Please try again.');
      } else if (message.includes('timeout') || message.includes('timed out')) {
        toast.error('Request timed out. Please try again.');
      } else if (message.includes('429') || message.includes('rate limit')) {
        toast.error('Service temporarily busy. Please try again in a moment.');
      } else {
        toast.error(message);
      }
      
      // Refresh job data to show updated error state
      queryClient.invalidateQueries({ queryKey: ['video-jobs'] });
    },
  });

  // Cancel video job mutation with optimistic updates
  const cancelJob = useMutation({
    mutationFn: async (jobId: string) => {
      const { data, error } = await supabase
        .from('video_jobs')
        .update({ 
          status: 'failed',
          error_message: 'Cancelled by user',
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId)
        .in('status', [
          'pending', 'generating_script', 'awaiting_script_approval',
          'generating_voice', 'awaiting_voice_approval', 'fetching_video', 'assembling'
        ])
        .select('id');
      
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error('Unable to cancel this job as it may have already completed or been cancelled.');
      }
    },
    onMutate: async (jobId: string) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['video-jobs'] });
      
      // Snapshot previous value
      const previous = queryClient.getQueryData<VideoJob[]>(['video-jobs']);
      
      // Optimistically remove the job from the list
      queryClient.setQueryData<VideoJob[]>(['video-jobs'], (old) => 
        old ? old.filter(j => j.id !== jobId) : old
      );
      
      return { previous };
    },
    onError: (error: any, _jobId, context) => {
      // Rollback on error
      if (context?.previous) {
        queryClient.setQueryData(['video-jobs'], context.previous);
      }
      toast.error(error.message || 'Failed to cancel video job');
    },
    onSuccess: async () => {
      // Clear the pinned job so it doesn't reappear in UI
      clearPinnedJob();
      toast.success('Video job cancelled successfully');
      await queryClient.refetchQueries({ queryKey: ['video-jobs'] });
    },
  });

  // Generate caption and hashtags mutation
  const generateCaption = useMutation({
    mutationFn: async ({ jobId, topic, script }: { jobId: string; topic: string; script: string }) => {
      const { data, error } = await supabase.functions.invoke('generate-caption', {
        body: { 
          video_job_id: jobId,
          prompt: `Video Topic: ${topic}\n\nScript: ${script}`,
          content_type: 'video'
        }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      // Force immediate refetch to update UI
      await queryClient.refetchQueries({ queryKey: ['video-jobs'] });
    },
    onError: (error: any) => {
      logger.error('Caption generation error', error as Error, {
        component: 'useVideoJobs',
        operation: 'generateCaption'
      });
      toast.error(error.message || 'Failed to generate caption');
    }
  });

  // Force recover/sync stuck job
  const recoverJob = useMutation({
    mutationFn: async (jobId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/recover-stuck-jobs?job_id=${jobId}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to recover job');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['video-jobs'] });
      toast.success('Job status synced successfully');
    },
    onError: (error: any) => {
      logger.error('Recovery error', error as Error, {
        component: 'useVideoJobs',
        operation: 'recoverJob'
      });
      toast.error(error.message || 'Failed to sync job status');
    }
  });

  // Dismiss error mutation
  const dismissError = useMutation({
    mutationFn: async (jobId: string) => {
      const { error } = await supabase
        .from('video_jobs')
        .update({ error_details: null, updated_at: new Date().toISOString() })
        .eq('id', jobId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Error dismissed');
      queryClient.invalidateQueries({ queryKey: ['video-jobs'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to dismiss error');
    },
  });

  return { 
    jobs, 
    isLoading,
    pinnedJobId,
    pinJob,
    clearPinnedJob,
    createJob,
    isCreating: createJob.isPending,
    approveScript,
    isApprovingScript: approveScript.isPending,
    approveVoiceover,
    isApprovingVoiceover: approveVoiceover.isPending,
    cancelJob,
    isCancelling: cancelJob.isPending,
    generateCaption,
    isGeneratingCaption: generateCaption.isPending,
    recoverJob,
    isRecoveringJob: recoverJob.isPending,
    dismissError,
    isDismissingError: dismissError.isPending,
  };
}