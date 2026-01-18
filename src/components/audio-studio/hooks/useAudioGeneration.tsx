import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { AudioTrack, Genre, Mood } from '../types/audio-studio.types';

interface GenerationState {
  isGenerating: boolean;
  progress: number;
  currentStep: string;
}

interface TTSOptions {
  text: string;
  voiceId: string;
  speed?: number;
  stability?: number;
  similarityBoost?: number;
}

interface SFXOptions {
  prompt: string;
  duration?: number;
  category?: string;
}

interface MusicOptions {
  prompt: string;
  duration?: number;
  genre?: Genre;
  mood?: Mood;
}

export function useAudioGeneration() {
  const [state, setState] = useState<GenerationState>({
    isGenerating: false,
    progress: 0,
    currentStep: '',
  });

  const updateProgress = useCallback((progress: number, step: string) => {
    setState(prev => ({ ...prev, progress, currentStep: step }));
  }, []);

  const generateTTS = useCallback(async (options: TTSOptions): Promise<AudioTrack | null> => {
    setState({ isGenerating: true, progress: 0, currentStep: 'Initializing...' });

    try {
      updateProgress(10, 'Connecting to voice service...');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            text: options.text,
            voiceId: options.voiceId,
            speed: options.speed ?? 1.0,
            stability: options.stability ?? 0.5,
            similarityBoost: options.similarityBoost ?? 0.75,
          }),
        }
      );

      updateProgress(50, 'Generating speech...');

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'TTS generation failed');
      }

      updateProgress(80, 'Processing audio...');

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      // Create audio element to get duration
      const audio = new Audio(audioUrl);
      await new Promise((resolve) => {
        audio.addEventListener('loadedmetadata', resolve);
      });

      updateProgress(100, 'Complete!');

      const track: AudioTrack = {
        id: crypto.randomUUID(),
        title: options.text.slice(0, 50) + (options.text.length > 50 ? '...' : ''),
        artist: 'AI Voice',
        duration: Math.round(audio.duration),
        audioUrl,
        type: 'voiceover',
        createdAt: new Date().toISOString(),
      };

      toast.success('Voice generated successfully!');
      return track;
    } catch (error) {
      console.error('TTS generation error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate voice');
      return null;
    } finally {
      setState({ isGenerating: false, progress: 0, currentStep: '' });
    }
  }, [updateProgress]);

  const generateSFX = useCallback(async (options: SFXOptions): Promise<AudioTrack | null> => {
    setState({ isGenerating: true, progress: 0, currentStep: 'Initializing...' });

    try {
      updateProgress(10, 'Connecting to sound service...');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-sfx`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            prompt: options.prompt,
            duration: options.duration ?? 5,
          }),
        }
      );

      updateProgress(50, 'Generating sound effect...');

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'SFX generation failed');
      }

      updateProgress(80, 'Processing audio...');

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      const audio = new Audio(audioUrl);
      await new Promise((resolve) => {
        audio.addEventListener('loadedmetadata', resolve);
      });

      updateProgress(100, 'Complete!');

      const track: AudioTrack = {
        id: crypto.randomUUID(),
        title: options.prompt.slice(0, 50) + (options.prompt.length > 50 ? '...' : ''),
        artist: 'AI SFX',
        duration: Math.round(audio.duration),
        audioUrl,
        type: 'sfx',
        createdAt: new Date().toISOString(),
      };

      toast.success('Sound effect generated successfully!');
      return track;
    } catch (error) {
      console.error('SFX generation error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate sound effect');
      return null;
    } finally {
      setState({ isGenerating: false, progress: 0, currentStep: '' });
    }
  }, [updateProgress]);

  const generateMusic = useCallback(async (options: MusicOptions): Promise<AudioTrack | null> => {
    setState({ isGenerating: true, progress: 0, currentStep: 'Initializing...' });

    try {
      updateProgress(10, 'Connecting to music service...');

      // Build prompt with genre and mood
      let fullPrompt = options.prompt;
      if (options.genre) {
        fullPrompt = `${options.genre} style: ${fullPrompt}`;
      }
      if (options.mood) {
        fullPrompt = `${options.mood} mood, ${fullPrompt}`;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-music`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            prompt: fullPrompt,
            duration: options.duration ?? 30,
          }),
        }
      );

      updateProgress(50, 'Generating music...');

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Music generation failed');
      }

      updateProgress(80, 'Processing audio...');

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      const audio = new Audio(audioUrl);
      await new Promise((resolve) => {
        audio.addEventListener('loadedmetadata', resolve);
      });

      updateProgress(100, 'Complete!');

      const track: AudioTrack = {
        id: crypto.randomUUID(),
        title: options.prompt.slice(0, 50) + (options.prompt.length > 50 ? '...' : ''),
        artist: 'AI Studio',
        duration: Math.round(audio.duration),
        audioUrl,
        type: 'song',
        genre: options.genre,
        mood: options.mood,
        createdAt: new Date().toISOString(),
      };

      toast.success('Music generated successfully!');
      return track;
    } catch (error) {
      console.error('Music generation error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate music');
      return null;
    } finally {
      setState({ isGenerating: false, progress: 0, currentStep: '' });
    }
  }, [updateProgress]);

  const saveToLibrary = useCallback(async (track: AudioTrack, userId: string): Promise<boolean> => {
    try {
      // First upload the audio file to storage
      const response = await fetch(track.audioUrl);
      const blob = await response.blob();
      const fileName = `${userId}/${track.id}.mp3`;

      const { error: uploadError } = await supabase.storage
        .from('audio-library')
        .upload(fileName, blob, {
          contentType: 'audio/mpeg',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('audio-library')
        .getPublicUrl(fileName);

      // Save to database
      const { error: dbError } = await supabase
        .from('user_audio_library')
        .insert({
          id: track.id,
          user_id: userId,
          title: track.title,
          artist: track.artist,
          duration: track.duration,
          audio_url: publicUrl,
          storage_path: fileName,
          type: track.type,
          genre: track.genre,
          mood: track.mood,
          is_liked: track.isLiked ?? false,
          file_size_bytes: blob.size,
        });

      if (dbError) throw dbError;

      toast.success('Saved to library!');
      return true;
    } catch (error) {
      console.error('Save to library error:', error);
      toast.error('Failed to save to library');
      return false;
    }
  }, []);

  return {
    ...state,
    generateTTS,
    generateSFX,
    generateMusic,
    saveToLibrary,
  };
}
