import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface RecentGeneration {
  id: string;
  type: 'image' | 'video';
  prompt: string;
  output_url: string;
  storage_path: string | null;
  created_at: string;
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

const KNOWN_BUCKETS = ['generated-content', 'storyboard-videos', 'faceless-videos', 'voice-previews'];

const buildStorageUrl = (storagePath: string): string => {
  const firstSegment = storagePath.split('/')[0];
  
  if (KNOWN_BUCKETS.includes(firstSegment)) {
    const bucket = firstSegment;
    const pathWithoutBucket = storagePath.substring(bucket.length + 1);
    return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${pathWithoutBucket}`;
  }
  
  return `${SUPABASE_URL}/storage/v1/object/public/generated-content/${storagePath}`;
};

export const useRecentGenerations = (limit = 24) => {
  const { user } = useAuth();

  const { data: generations = [], isLoading } = useQuery<RecentGeneration[]>({
    queryKey: ['recent-generations-for-editor', user?.id, limit],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('generations')
        .select('id, type, prompt, output_url, storage_path, created_at')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .in('type', ['image', 'video'])
        .not('output_url', 'is', null)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return (data || []) as RecentGeneration[];
    },
    enabled: !!user?.id,
    staleTime: 60 * 1000, // 1 minute
  });

  const generationsWithUrls = generations.map(gen => ({
    ...gen,
    fullUrl: gen.output_url || (gen.storage_path ? buildStorageUrl(gen.storage_path) : null),
  }));

  return {
    generations: generationsWithUrls,
    isLoading,
  };
};
