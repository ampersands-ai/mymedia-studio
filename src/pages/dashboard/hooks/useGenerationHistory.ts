import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Generation {
  id: string;
  type: string;
  prompt: string;
  output_url: string | null;
  storage_path: string | null;
  status: string;
  tokens_used: number;
  created_at: string;
  enhanced_prompt: string | null;
  ai_caption: string | null;
  ai_hashtags: string[] | null;
  caption_generated_at: string | null;
  completed_at?: string | null;
  settings?: Record<string, unknown> | null;
  provider_response?: {
    data?: {
      failMsg?: string;
    };
    error?: string;
    error_type?: string;
  };
  has_dispute?: boolean;
  dispute_status?: string;
  parent_generation_id?: string | null;
  output_index?: number;
  is_batch_output?: boolean;
  workflow_execution_id?: string | null;
  is_video_job?: boolean;
  video_job_data?: Record<string, unknown>;
  source_table?: 'generation' | 'video_job' | 'storyboard' | 'video_editor_job';
  video_job_id?: string | null;
  storyboard_id?: string | null;
  video_editor_job_id?: string | null;
  model_id?: string | null;
  model_record_id?: string | null;
}

interface UseGenerationHistoryOptions {
  userId: string | undefined;
  currentPage: number;
  itemsPerPage: number;
  statusFilter: 'all' | 'completed' | 'failed' | 'pending';
  contentTypeFilter: 'all' | 'image' | 'video' | 'audio' | 'storyboard' | 'video_editor';
}

export const useGenerationHistory = ({
  userId,
  currentPage,
  itemsPerPage,
  statusFilter,
  contentTypeFilter,
}: UseGenerationHistoryOptions) => {
  // Fetch total count for pagination
  const { data: totalCount } = useQuery({
    queryKey: ["generations-count", userId, statusFilter, contentTypeFilter],
    queryFn: async () => {
      let query = supabase
        .from("user_content_history")
        .select("id", { count: 'exact', head: true } as any)
        .eq("user_id", userId!);

      if (statusFilter === 'completed') {
        query = query.eq('status', 'completed');
      } else if (statusFilter === 'failed') {
        query = query.eq('status', 'failed');
      } else if (statusFilter === 'pending') {
        query = query.in('status', ['pending', 'processing']);
      }

      if (contentTypeFilter === 'storyboard') {
        query = query.eq('source_table', 'storyboard');
      } else if (contentTypeFilter === 'video_editor') {
        query = query.eq('source_table', 'video_editor_job');
      } else if (contentTypeFilter === 'video') {
        query = query.eq('type', 'video');
      } else if (contentTypeFilter !== 'all') {
        query = query.eq('type', contentTypeFilter);
      }

      const { count } = await query;
      return count || 0;
    },
    enabled: !!userId,
  });

  // Fetch generations from unified view with server-side pagination
  const { data: generations, refetch, isRefetching, isLoading } = useQuery<Generation[]>({
    queryKey: ["generations", userId, currentPage, statusFilter, contentTypeFilter],
    queryFn: async () => {
      const offset = (currentPage - 1) * itemsPerPage;

      // Build query on the unified view
      let query = supabase
        .from("user_content_history")
        .select("*")
        .eq("user_id", userId!);

      // Apply status filter
      if (statusFilter === 'completed') {
        query = query.eq('status', 'completed');
      } else if (statusFilter === 'failed') {
        query = query.eq('status', 'failed');
      } else if (statusFilter === 'pending') {
        query = query.in('status', ['pending', 'processing']);
      }

      // Apply content type filter
      if (contentTypeFilter === 'storyboard') {
        query = query.eq('source_table', 'storyboard');
      } else if (contentTypeFilter === 'video') {
        query = query.eq('type', 'video');
      } else if (contentTypeFilter !== 'all') {
        query = query.eq('type', contentTypeFilter);
      }

      // Apply pagination and ordering
      const { data, error } = await query
        .order("created_at", { ascending: false })
        .range(offset, offset + itemsPerPage - 1);

      if (error) throw error;

      // Fetch disputes for these generations
      const generationIds = data?.map(g => g.id) || [];
      const { data: disputes } = await supabase
        .from("token_dispute_reports")
        .select("generation_id, status")
        .eq("user_id", userId!)
        .in("generation_id", generationIds);

      const disputeMap = new Map(disputes?.map((d: { generation_id: string; status: string }) => [d.generation_id, d.status]) || []);

      // Enrich with dispute info and source markers
      const enriched = (data || []).map(item => ({
        ...item,
        has_dispute: disputeMap.has(item.id),
        dispute_status: disputeMap.get(item.id),
        is_video_job: item.source_table === 'video_job',
        video_job_data: item.video_job_id ? { id: item.video_job_id } : null,
      }));

      return enriched as Generation[];
    },
    enabled: !!userId,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchInterval: (query) => {
      const hasPending = query.state.data?.some(g =>
        g.status === 'pending' || g.status === 'processing'
      );
      return hasPending ? 60000 : false;
    },
  });

  return {
    generations,
    totalCount,
    isLoading,
    isRefetching,
    refetch,
  };
};
