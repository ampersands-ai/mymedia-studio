import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { AudioTrack } from '../types/music-studio.types';

type LibraryFilter = 'all' | 'songs' | 'voiceovers' | 'sfx' | 'stems' | 'favorites';

interface UseAudioLibraryOptions {
  filter?: LibraryFilter;
  searchQuery?: string;
}

export function useAudioLibrary(options: UseAudioLibraryOptions = {}) {
  const { filter = 'all', searchQuery = '' } = options;
  const { user } = useAuth();
  const [tracks, setTracks] = useState<AudioTrack[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTracks = useCallback(async () => {
    if (!user) {
      setTracks([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('user_audio_library')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      // Apply type filter
      if (filter === 'songs') {
        query = query.eq('type', 'song');
      } else if (filter === 'voiceovers') {
        query = query.eq('type', 'voiceover');
      } else if (filter === 'sfx') {
        query = query.eq('type', 'sfx');
      } else if (filter === 'stems') {
        query = query.eq('type', 'stem');
      } else if (filter === 'favorites') {
        query = query.eq('is_liked', true);
      }

      // Apply search
      if (searchQuery) {
        query = query.ilike('title', `%${searchQuery}%`);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mappedTracks: AudioTrack[] = (data || []).map((item: any) => ({
        id: item.id,
        title: item.title,
        artist: item.artist ?? 'AI Studio',
        duration: item.duration,
        audioUrl: item.audio_url ?? '',
        storagePath: item.storage_path ?? undefined,
        artworkUrl: item.artwork_url ?? undefined,
        type: item.type as AudioTrack['type'],
        genre: item.genre as AudioTrack['genre'],
        mood: item.mood as AudioTrack['mood'],
        createdAt: item.created_at,
        isLiked: item.is_liked ?? false,
      }));

      setTracks(mappedTracks);
    } catch (err) {
      console.error('Error fetching audio library:', err);
      setError(err instanceof Error ? err.message : 'Failed to load library');
    } finally {
      setIsLoading(false);
    }
  }, [user, filter, searchQuery]);

  useEffect(() => {
    fetchTracks();
  }, [fetchTracks]);

  const toggleLike = useCallback(async (trackId: string) => {
    if (!user) return;

    const track = tracks.find((t) => t.id === trackId);
    if (!track) return;

    const newLikedState = !track.isLiked;

    // Optimistic update
    setTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, isLiked: newLikedState } : t))
    );

    try {
      const { error } = await supabase
        .from('user_audio_library')
        .update({ is_liked: newLikedState })
        .eq('id', trackId)
        .eq('user_id', user.id);

      if (error) throw error;
    } catch (err) {
      // Revert on error
      setTracks((prev) =>
        prev.map((t) => (t.id === trackId ? { ...t, isLiked: !newLikedState } : t))
      );
      console.error('Error toggling like:', err);
    }
  }, [user, tracks]);

  const deleteTrack = useCallback(async (trackId: string) => {
    if (!user) return false;

    const track = tracks.find((t) => t.id === trackId);
    if (!track) return false;

    try {
      // Delete from storage if path exists
      if (track.storagePath) {
        await supabase.storage.from('audio-library').remove([track.storagePath]);
      }

      // Delete from database
      const { error } = await supabase
        .from('user_audio_library')
        .delete()
        .eq('id', trackId)
        .eq('user_id', user.id);

      if (error) throw error;

      setTracks((prev) => prev.filter((t) => t.id !== trackId));
      return true;
    } catch (err) {
      console.error('Error deleting track:', err);
      return false;
    }
  }, [user, tracks]);

  const incrementPlayCount = useCallback(async (trackId: string) => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('user_audio_library')
        .select('play_count')
        .eq('id', trackId)
        .single();

      if (data) {
        await supabase
          .from('user_audio_library')
          .update({ play_count: (data.play_count ?? 0) + 1 })
          .eq('id', trackId);
      }
    } catch (err) {
      console.error('Error incrementing play count:', err);
    }
  }, [user]);

  return {
    tracks,
    isLoading,
    error,
    refresh: fetchTracks,
    toggleLike,
    deleteTrack,
    incrementPlayCount,
  };
}
