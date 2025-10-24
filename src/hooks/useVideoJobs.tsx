import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { VideoJob, VideoJobInput } from '@/types/video';

export function useVideoJobs() {
  const queryClient = useQueryClient();

  // Fetch user's video jobs
  const { data: jobs, isLoading } = useQuery({
    queryKey: ['video-jobs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('video_jobs')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []) as VideoJob[];
    },
    refetchInterval: (query) => {
      // Poll every 10s if there are active jobs
      const hasActive = query.state.data?.some(j => 
        ['pending', 'generating_script', 'generating_voice', 'fetching_video', 'assembling'].includes(j.status)
      );
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
      const { data, error } = await supabase.functions.invoke('approve-script', {
        body: { job_id: jobId, edited_script: editedScript },
      });
      
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['video-jobs'] });
      toast.success('Voiceover generation started! This will take about 1 minute.');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to approve script');
    },
  });

  // Approve voiceover mutation
  const approveVoiceover = useMutation({
    mutationFn: async (jobId: string) => {
      const { data, error } = await supabase.functions.invoke('approve-voiceover', {
        body: { job_id: jobId },
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
    isCancelling: cancelJob.isPending
  };
}