import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { VideoJob, VideoJobInput } from '@/types/video';

export function useVideoJobs() {
  const queryClient = useQueryClient();

  // Fetch user's video jobs (exclude completed/failed ones - they go to History)
  const { data: jobs, isLoading } = useQuery({
    queryKey: ['video-jobs'],
    queryFn: async () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('video_jobs')
        .select('*')
        .neq('status', 'completed')
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
      toast.success('Video generation started! Script will be ready for review shortly.');
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['video-jobs'] });
      toast.success('Voiceover generation started! This will take about 1 minute.');
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['video-jobs'] });
      toast.success('Video assembly started! This will take 2-3 more minutes.');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to approve voiceover');
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['video-jobs'] });
      toast.info('Video job cancelled');
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['video-jobs'] });
      toast.success('Caption and hashtags generated!');
    },
    onError: (error: any) => {
      console.error('Caption generation error:', error);
      toast.error(error.message || 'Failed to generate caption');
    }
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
  };
}