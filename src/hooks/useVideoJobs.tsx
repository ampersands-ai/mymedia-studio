import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { VideoJob, VideoJobInput } from '@/types/video';

export function useVideoJobs() {
  const queryClient = useQueryClient();

  // Fetch user's latest job (includes completed to keep inline preview visible)
  const { data: jobs, isLoading } = useQuery({
    queryKey: ['video-jobs'],
    queryFn: async () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('video_jobs')
        .select('*')
        .neq('status', 'failed')
        .gte('updated_at', twoHoursAgo)
        .order('updated_at', { ascending: false })
        .limit(1);
      
      if (error) throw error;
      return (data || []) as VideoJob[];
    },
    refetchInterval: (query) => {
      // Poll every 10s if there are any active jobs (all non-completed are active)
      const hasActive = query.state.data && query.state.data.length > 0;
      return hasActive ? 10000 : false;
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['video-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['user-tokens'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create video job');
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
            console.log('[approve-script] Retrying after transient error...');
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
      const { data: { session } } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.functions.invoke('approve-voiceover', {
        body: { job_id: jobId },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });
      
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: async () => {
      // Force immediate refetch to update UI
      await queryClient.refetchQueries({ queryKey: ['video-jobs'] });
    },
    onError: (error: any) => {
      const message = error.message || 'Failed to approve voiceover';
      
      // Parse specific error types for better user feedback
      if (message.includes('Shotstack')) {
        toast.error('Video assembly failed. Please try again or contact support.');
      } else if (message.includes('validation')) {
        toast.error('Video validation failed. Please try again.');
      } else if (message.includes('timeout') || message.includes('timed out')) {
        toast.error('Request timed out. Please try again.');
      } else {
        toast.error(message);
      }
      
      // Refresh job data to show updated error state
      queryClient.invalidateQueries({ queryKey: ['video-jobs'] });
    },
  });

  // Cancel video job mutation
  const cancelJob = useMutation({
    mutationFn: async (jobId: string) => {
      const { error } = await supabase
        .from('video_jobs')
        .update({ 
          status: 'failed',
          error_message: 'Cancelled by user'
        })
        .eq('id', jobId)
        .in('status', [
          'pending', 'generating_script', 'awaiting_script_approval',
          'generating_voice', 'awaiting_voice_approval', 'fetching_video', 'assembling'
        ]);
      
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success('Video job cancelled successfully');
      // Force immediate refetch to update UI
      await queryClient.refetchQueries({ queryKey: ['video-jobs'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to cancel video job');
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
      console.error('Caption generation error:', error);
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
      console.error('Recovery error:', error);
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