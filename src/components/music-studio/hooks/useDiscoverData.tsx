import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { AudioTrack, TrendingTrack, FeaturedPlaylist } from '../types/music-studio.types';

interface CommunityTrack {
  id: string;
  generation_id: string;
  user_id: string;
  prompt: string;
  content_type: string;
  model_id: string;
  output_url: string | null;
  parameters: Record<string, unknown>;
  views_count: number;
  likes_count: number;
  is_featured: boolean;
  shared_at: string;
  created_at: string;
}

function mapToAudioTrack(item: CommunityTrack, rank?: number): AudioTrack & { playCount?: number; rank?: number } {
  return {
    id: item.generation_id,
    title: item.prompt?.slice(0, 50) + (item.prompt?.length > 50 ? '...' : '') || 'Untitled',
    artist: 'Community',
    duration: 0,
    audioUrl: item.output_url || '',
    type: item.content_type === 'audio' ? 'song' : 'voiceover',
    createdAt: item.created_at,
    isLiked: false,
    ...(rank !== undefined && { 
      playCount: item.views_count || 0, 
      rank 
    }),
  };
}

export function useDiscoverData() {
  // Fetch community creations (audio only)
  const { data: communityTracks = [], isLoading: isLoadingCommunity } = useQuery({
    queryKey: ['community-creations', 'audio'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('community_creations')
        .select('*')
        .eq('content_type', 'audio')
        .not('output_url', 'is', null)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error fetching community creations:', error);
        return [];
      }

      return (data as CommunityTrack[]).map((item, index) => mapToAudioTrack(item, index + 1));
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Fetch trending (by views/likes)
  const { data: trendingTracks = [], isLoading: isLoadingTrending } = useQuery({
    queryKey: ['trending-creations', 'audio'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('community_creations')
        .select('*')
        .eq('content_type', 'audio')
        .not('output_url', 'is', null)
        .order('views_count', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching trending:', error);
        return [];
      }

      return (data as CommunityTrack[]).map((item, index) => ({
        ...mapToAudioTrack(item, index + 1),
        playCount: item.views_count || 0,
        rank: index + 1,
      })) as TrendingTrack[];
    },
    staleTime: 1000 * 60 * 5,
  });

  // Fetch featured
  const { data: featuredTracks = [], isLoading: isLoadingFeatured } = useQuery({
    queryKey: ['featured-creations', 'audio'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('community_creations')
        .select('*')
        .eq('content_type', 'audio')
        .eq('is_featured', true)
        .not('output_url', 'is', null)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching featured:', error);
        return [];
      }

      return (data as CommunityTrack[]).map((item) => mapToAudioTrack(item));
    },
    staleTime: 1000 * 60 * 5,
  });

  // Mock playlists (these would come from a playlists table in a full implementation)
  const playlists: FeaturedPlaylist[] = [
    { id: 'p1', name: 'Chill Vibes', description: 'Relaxing AI-generated beats', trackCount: communityTracks.length, coverUrls: [] },
    { id: 'p2', name: 'Workout Energy', description: 'High-energy tracks', trackCount: trendingTracks.length, coverUrls: [] },
  ];

  return {
    communityTracks,
    trendingTracks,
    featuredTracks,
    playlists,
    isLoading: isLoadingCommunity || isLoadingTrending || isLoadingFeatured,
  };
}
