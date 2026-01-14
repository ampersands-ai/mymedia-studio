import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface BlackboardStoryboardSummary {
  id: string;
  aspectRatio: string;
  status: string;
  sceneCount: number;
  hasImages: boolean;
  hasVideos: boolean;
  createdAt: string;
  updatedAt: string;
  previewImageUrl?: string;
}

interface DbStoryboard {
  id: string;
  aspect_ratio: string | null;
  status: string | null;
  final_video_url: string | null;
  created_at: string;
  updated_at: string;
}

interface DbScene {
  storyboard_id: string;
  generated_image_url: string | null;
  generated_video_url: string | null;
  order_number: number;
}

export function useBlackboardStoryboardList() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['blackboard-storyboards-list', user?.id],
    queryFn: async (): Promise<BlackboardStoryboardSummary[]> => {
      if (!user) return [];

      // Fetch all storyboards for the user
      const { data: storyboards, error: storyboardError } = await supabase
        .from('blackboard_storyboards')
        .select('id, aspect_ratio, status, final_video_url, created_at, updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (storyboardError) throw storyboardError;
      if (!storyboards || storyboards.length === 0) return [];

      // Fetch scene counts and first image for each storyboard
      const storyboardIds = storyboards.map((s: DbStoryboard) => s.id);
      
      const { data: scenes, error: scenesError } = await supabase
        .from('blackboard_scenes')
        .select('storyboard_id, generated_image_url, generated_video_url, order_number')
        .in('storyboard_id', storyboardIds)
        .order('order_number', { ascending: true });

      if (scenesError) throw scenesError;

      // Group scenes by storyboard
      const scenesByStoryboard: Record<string, DbScene[]> = {};
      for (const scene of (scenes || []) as DbScene[]) {
        if (!scenesByStoryboard[scene.storyboard_id]) {
          scenesByStoryboard[scene.storyboard_id] = [];
        }
        scenesByStoryboard[scene.storyboard_id].push(scene);
      }

      return storyboards.map((storyboard: DbStoryboard) => {
        const storyboardScenes = scenesByStoryboard[storyboard.id] || [];
        const firstSceneWithImage = storyboardScenes.find((s: DbScene) => s.generated_image_url);
        
        return {
          id: storyboard.id,
          aspectRatio: storyboard.aspect_ratio || 'hd',
          status: storyboard.status || 'draft',
          sceneCount: storyboardScenes.length,
          hasImages: storyboardScenes.some((s: DbScene) => s.generated_image_url),
          hasVideos: storyboardScenes.some((s: DbScene) => s.generated_video_url),
          createdAt: storyboard.created_at,
          updatedAt: storyboard.updated_at,
          previewImageUrl: firstSceneWithImage?.generated_image_url || undefined,
        };
      });
    },
    enabled: !!user,
    staleTime: 30000, // 30 seconds
  });

  return {
    storyboards: query.data || [],
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}
