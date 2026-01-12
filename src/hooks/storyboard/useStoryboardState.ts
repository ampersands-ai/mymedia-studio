import { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { 
  saveCriticalId, 
  loadCriticalId, 
  clearCriticalId, 
  verifyStoryboard 
} from '@/lib/state-persistence';

const STORYBOARD_ID_KEY = 'currentStoryboardId';
const STORYBOARD_EXPIRY_HOURS = 168; // 7 days

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
  intro_video_url?: string;
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
  aspect_ratio?: string | null;
  render_mode?: 'quick' | 'customize';
  subtitle_settings?: {
    style?: string;
    fontFamily?: string;
    fontSize?: number;
    position?: string;
    [key: string]: unknown;
  };
  music_settings?: {
    volume?: number;
    fadeIn?: number;
    fadeOut?: number;
    [key: string]: unknown;
  };
  image_animation_settings?: {
    zoom?: number;
    position?: string;
  };
}

export const useStoryboardState = () => {
  // Initialize from localStorage on mount with verification
  const [currentStoryboardId, setCurrentStoryboardId] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);

  // Verify storyboard exists on mount
  useEffect(() => {
    const verifyAndLoadStoryboard = async () => {
      const savedId = loadCriticalId(STORYBOARD_ID_KEY, STORYBOARD_EXPIRY_HOURS);
      
      if (savedId) {
        const storyboardState = await verifyStoryboard(savedId);
        
        if (storyboardState.exists) {
          setCurrentStoryboardId(savedId);
        } else if (storyboardState.verified) {
          // Storyboard definitely doesn't exist in DB (verified=true), safe to clear
          logger.info('Storyboard not found in database, clearing local state');
          clearCriticalId(STORYBOARD_ID_KEY);
        } else {
          // Couldn't verify (network/auth issue) - preserve existing ID
          logger.warn('Could not verify storyboard, preserving local state');
          setCurrentStoryboardId(savedId);
        }
      }
      setIsVerified(true);
    };
    
    verifyAndLoadStoryboard();
  }, []);

  // Wrapper to persist storyboard ID to localStorage
  const setAndPersistStoryboardId = useCallback((id: string | null) => {
    setCurrentStoryboardId(id);
    saveCriticalId(STORYBOARD_ID_KEY, id);
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
      if (e.key === STORYBOARD_ID_KEY) {
        // Re-verify when storage changes from another tab
        const newId = e.newValue ? JSON.parse(e.newValue).id : null;
        setCurrentStoryboardId(newId);
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

      if (error) {
        // If storyboard doesn't exist, clear the ID
        if (error.code === 'PGRST116') {
          logger.info('Storyboard query returned no results, clearing ID');
          clearCriticalId(STORYBOARD_ID_KEY);
          setCurrentStoryboardId(null);
        }
        throw error;
      }
      return data as Storyboard;
    },
    enabled: !!currentStoryboardId && isVerified,
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
