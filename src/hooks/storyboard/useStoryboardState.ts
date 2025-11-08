import { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Scene {
  id: string;
  order_number: number;
  voice_over_text: string;
  image_prompt: string;
  image_preview_url?: string;
  video_url?: string;
  is_edited: boolean;
  storyboard_id: string;
  created_at: string;
  updated_at: string;
}

interface Storyboard {
  id: string;
  user_id: string;
  topic: string;
  duration: number;
  style: string;
  tone: string;
  voice_id: string;
  voice_name: string;
  intro_image_prompt: string;
  intro_voiceover_text: string;
  intro_image_preview_url?: string;
  status: 'draft' | 'rendering' | 'complete' | 'failed';
  template_id?: string;
  video_url?: string;
  video_storage_path?: string;
  render_job_id?: string;
  tokens_cost: number;
  estimated_render_cost: number;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  video_quality?: string;
  subtitle_settings?: {
    style?: string;
    fontFamily?: string;
    fontSize?: number;
    position?: string;
    [key: string]: any;
  };
  music_settings?: {
    volume?: number;
    fadeIn?: number;
    fadeOut?: number;
    [key: string]: any;
  };
  image_animation_settings?: {
    zoom?: number;
    position?: string;
  };
}

export const useStoryboardState = () => {
  // Initialize from localStorage on mount
  const [currentStoryboardId, setCurrentStoryboardId] = useState<string | null>(() => {
    return localStorage.getItem('currentStoryboardId');
  });
  
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);

  // Wrapper to persist storyboard ID to localStorage
  const setAndPersistStoryboardId = useCallback((id: string | null) => {
    setCurrentStoryboardId(id);
    if (id) {
      localStorage.setItem('currentStoryboardId', id);
    } else {
      localStorage.removeItem('currentStoryboardId');
    }
    // Notify other hook instances in the same tab
    window.dispatchEvent(new CustomEvent('storyboard-id-changed', { detail: id }));
  }, []);

  // Sync storyboard ID across all hook instances (same tab and cross-tab)
  useEffect(() => {
    const onCustomEvent = (e: Event) => {
      const ce = e as CustomEvent<string | null>;
      setCurrentStoryboardId(ce.detail ?? null);
    };
    
    const onStorageEvent = (e: StorageEvent) => {
      if (e.key === 'currentStoryboardId') {
        setCurrentStoryboardId(e.newValue);
      }
    };
    
    window.addEventListener('storyboard-id-changed', onCustomEvent as EventListener);
    window.addEventListener('storage', onStorageEvent);
    
    return () => {
      window.removeEventListener('storyboard-id-changed', onCustomEvent as EventListener);
      window.removeEventListener('storage', onStorageEvent);
    };
  }, []);

  // Fetch current storyboard
  const { data: storyboard, isLoading: isLoadingStoryboard } = useQuery({
    queryKey: ['storyboard', currentStoryboardId],
    queryFn: async () => {
      if (!currentStoryboardId) return null;

      const { data, error } = await supabase
        .from('storyboards')
        .select('*')
        .eq('id', currentStoryboardId)
        .single();

      if (error) throw error;
      return data as Storyboard;
    },
    enabled: !!currentStoryboardId,
  });

  // Fetch scenes for current storyboard
  const { data: scenes = [], isLoading: isLoadingScenes } = useQuery({
    queryKey: ['storyboard-scenes', currentStoryboardId],
    queryFn: async () => {
      if (!currentStoryboardId) return [];

      const { data, error } = await supabase
        .from('storyboard_scenes')
        .select('*')
        .eq('storyboard_id', currentStoryboardId)
        .order('order_number', { ascending: true });

      if (error) throw error;
      return data as Scene[];
    },
    enabled: !!currentStoryboardId,
  });

  // Set first scene as active when scenes load
  useEffect(() => {
    if (scenes.length > 0 && !activeSceneId) {
      setActiveSceneId(scenes[0].id);
    }
  }, [scenes, activeSceneId]);

  return {
    currentStoryboardId,
    setAndPersistStoryboardId,
    activeSceneId,
    setActiveSceneId,
    storyboard,
    scenes,
    isLoading: isLoadingStoryboard || isLoadingScenes,
  };
};

export type { Scene, Storyboard };
