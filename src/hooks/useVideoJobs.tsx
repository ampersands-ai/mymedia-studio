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
      toast.success('Video generation started! This will take 3-5 minutes.');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create video job');
    },
  });

  return { 
    jobs, 
    isLoading, 
    createJob,
    isCreating: createJob.isPending
  };
}
