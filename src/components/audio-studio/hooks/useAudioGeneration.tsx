import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { AudioTrack, Genre, Mood } from '../types/audio-studio.types';

// Import existing Kie.ai model configs - Pro and Fast TTS models
import { MODEL_CONFIG as TTS_PRO_CONFIG, SCHEMA as TTS_PRO_SCHEMA, preparePayload as prepareTTSProPayload, calculateCost as calculateTTSProCost } from '@/lib/models/locked/prompt_to_audio/ElevenLabs_TTS';
import { MODEL_CONFIG as TTS_FAST_CONFIG, SCHEMA as TTS_FAST_SCHEMA, preparePayload as prepareTTSFastPayload, calculateCost as calculateTTSFastCost } from '@/lib/models/locked/prompt_to_audio/ElevenLabs_Fast';
import { MODEL_CONFIG as SUNO_CONFIG, SCHEMA as SUNO_SCHEMA, preparePayload as prepareSunoPayload, calculateCost as calculateSunoCost } from '@/lib/models/locked/prompt_to_audio/Suno';

import { GENERATION_STATUS } from '@/constants/generation-status';
import { sanitizeForStorage } from '@/lib/database/sanitization';
import { getGenerationType } from '@/lib/models/registry';
import { reserveCredits } from '@/lib/models/creditDeduction';

// TTS Quality tiers
export type TTSQuality = 'fast' | 'pro';

interface GenerationState {
  isGenerating: boolean;
  progress: number;
  currentStep: string;
}

interface TTSOptions {
  text: string;
  voice?: string;
  quality?: TTSQuality; // 'fast' = Turbo V2.5 (3 credits), 'pro' = Multilingual V2 (6 credits)
  languageCode?: string; // Only supported by 'fast' model
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
  instrumental?: boolean;
}

const POLL_INTERVAL = 2000;
const MAX_POLL_TIME = 300000; // 5 minutes

export function useAudioGeneration() {
  const [state, setState] = useState<GenerationState>({
    isGenerating: false,
    progress: 0,
    currentStep: '',
  });

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollStartTimeRef = useRef<number>(0);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  const updateProgress = useCallback((progress: number, step: string) => {
    setState(prev => ({ ...prev, progress, currentStep: step }));
  }, []);

  const pollGeneration = useCallback(async (generationId: string): Promise<AudioTrack | null> => {
    return new Promise((resolve, reject) => {
      pollStartTimeRef.current = Date.now();

      pollIntervalRef.current = setInterval(async () => {
        try {
          const elapsed = Date.now() - pollStartTimeRef.current;
          
          if (elapsed > MAX_POLL_TIME) {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            reject(new Error('Generation timed out'));
            return;
          }

          // Update progress based on elapsed time
          const progressPercent = Math.min(90, 10 + (elapsed / MAX_POLL_TIME) * 80);
          updateProgress(progressPercent, 'Processing audio...');

          const { data: generation, error } = await supabase
            .from('generations')
            .select('*')
            .eq('id', generationId)
            .single();

          if (error) {
            console.error('Poll error:', error);
            return;
          }

          if (generation.status === GENERATION_STATUS.COMPLETED && generation.output_url) {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            updateProgress(100, 'Complete!');

            const track: AudioTrack = {
              id: generation.id,
              title: generation.prompt?.slice(0, 50) + (generation.prompt?.length > 50 ? '...' : '') || 'Untitled',
              artist: 'AI Studio',
              duration: 0, // Will be updated when audio loads
              audioUrl: generation.output_url,
              type: generation.type === 'audio' ? 'song' : 'voiceover',
              createdAt: generation.created_at,
            };

            resolve(track);
          } else if (generation.status === GENERATION_STATUS.FAILED) {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            reject(new Error('Generation failed'));
          }
        } catch (error) {
          console.error('Poll error:', error);
        }
      }, POLL_INTERVAL);
    });
  }, [updateProgress]);

  const generateTTS = useCallback(async (options: TTSOptions, userId: string): Promise<AudioTrack | null> => {
    setState({ isGenerating: true, progress: 0, currentStep: 'Initializing...' });

    try {
      // Select model based on quality tier (default to fast for cost efficiency)
      const useFast = options.quality !== 'pro';
      const modelConfig = useFast ? TTS_FAST_CONFIG : TTS_PRO_CONFIG;
      const modelSchema = useFast ? TTS_FAST_SCHEMA : TTS_PRO_SCHEMA;
      const preparePayload = useFast ? prepareTTSFastPayload : prepareTTSProPayload;
      const calculateCost = useFast ? calculateTTSFastCost : calculateTTSProCost;

      updateProgress(5, 'Reserving credits...');
      
      const inputs: Record<string, unknown> = {
        text: options.text,
        voice: options.voice ?? 'Brian',
        speed: options.speed ?? 1.0,
        stability: options.stability ?? 0.5,
        similarity_boost: options.similarityBoost ?? 0.75,
      };

      // Language code only supported by Fast model (Turbo V2.5)
      if (useFast && options.languageCode) {
        inputs.language_code = options.languageCode;
      }

      const cost = calculateCost(inputs);
      await reserveCredits(userId, cost);

      updateProgress(10, 'Creating generation...');

      // Create generation record
      const { data: generation, error: insertError } = await supabase
        .from('generations')
        .insert({
          user_id: userId,
          prompt: options.text,
          model_id: modelConfig.modelId,
          model_record_id: modelConfig.recordId,
          type: getGenerationType(modelConfig.contentType),
          status: GENERATION_STATUS.PROCESSING,
          tokens_used: cost,
          settings: sanitizeForStorage(inputs),
        })
        .select('id')
        .single();

      if (insertError || !generation) {
        throw new Error(`Failed to create generation: ${insertError?.message}`);
      }

      updateProgress(20, 'Connecting to voice service...');

      // Call generate-content edge function (uses Kie.ai provider)
      const { error: functionError } = await supabase.functions.invoke('generate-content', {
        body: {
          generationId: generation.id,
          prompt: options.text,
          custom_parameters: preparePayload(inputs),
          model_config: modelConfig,
          model_schema: modelSchema,
        },
      });

      if (functionError) {
        throw new Error(`TTS generation failed: ${functionError.message}`);
      }

      updateProgress(30, 'Generating speech...');

      // Poll for completion
      const track = await pollGeneration(generation.id);
      
      if (track) {
        track.type = 'voiceover';
        track.artist = useFast ? 'AI Voice (Turbo)' : 'AI Voice (Pro)';
        toast.success('Voice generated successfully!');
      }

      return track;
    } catch (error) {
      console.error('TTS generation error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate voice');
      return null;
    } finally {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      setState({ isGenerating: false, progress: 0, currentStep: '' });
    }
  }, [updateProgress, pollGeneration]);

  const generateSFX = useCallback(async (options: SFXOptions, userId: string): Promise<AudioTrack | null> => {
    // SFX uses Fast TTS model (cost-effective) with sound effect prompts
    setState({ isGenerating: true, progress: 0, currentStep: 'Initializing...' });

    try {
      updateProgress(5, 'Reserving credits...');
      
      // For SFX, we use the Fast TTS model with descriptive text
      const sfxPrompt = `[Sound effect: ${options.prompt}]`;
      const inputs = {
        text: sfxPrompt,
        voice: 'Brian',
        stability: 0.3,
        similarity_boost: 0.5,
      };

      const cost = calculateTTSFastCost(inputs);
      await reserveCredits(userId, cost);

      updateProgress(10, 'Creating generation...');

      const { data: generation, error: insertError } = await supabase
        .from('generations')
        .insert({
          user_id: userId,
          prompt: options.prompt,
          model_id: TTS_FAST_CONFIG.modelId,
          model_record_id: TTS_FAST_CONFIG.recordId,
          type: 'audio',
          status: GENERATION_STATUS.PROCESSING,
          tokens_used: cost,
          settings: sanitizeForStorage({ ...inputs, category: options.category }),
        })
        .select('id')
        .single();

      if (insertError || !generation) {
        throw new Error(`Failed to create generation: ${insertError?.message}`);
      }

      updateProgress(20, 'Connecting to sound service...');

      const { error: functionError } = await supabase.functions.invoke('generate-content', {
        body: {
          generationId: generation.id,
          prompt: sfxPrompt,
          custom_parameters: prepareTTSFastPayload(inputs),
          model_config: TTS_FAST_CONFIG,
          model_schema: TTS_FAST_SCHEMA,
        },
      });

      if (functionError) {
        throw new Error(`SFX generation failed: ${functionError.message}`);
      }

      updateProgress(30, 'Generating sound effect...');

      const track = await pollGeneration(generation.id);
      
      if (track) {
        track.type = 'sfx';
        track.artist = 'AI SFX';
        track.title = options.prompt.slice(0, 50) + (options.prompt.length > 50 ? '...' : '');
        toast.success('Sound effect generated successfully!');
      }

      return track;
    } catch (error) {
      console.error('SFX generation error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate sound effect');
      return null;
    } finally {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      setState({ isGenerating: false, progress: 0, currentStep: '' });
    }
  }, [updateProgress, pollGeneration]);

  const generateMusic = useCallback(async (options: MusicOptions, userId: string): Promise<AudioTrack | null> => {
    setState({ isGenerating: true, progress: 0, currentStep: 'Initializing...' });

    try {
      updateProgress(5, 'Reserving credits...');
      
      // Build prompt with genre and mood
      let fullPrompt = options.prompt;
      if (options.genre) {
        fullPrompt = `${options.genre} style: ${fullPrompt}`;
      }
      if (options.mood) {
        fullPrompt = `${options.mood} mood, ${fullPrompt}`;
      }

      const inputs = {
        prompt: fullPrompt,
        tags: options.genre || '',
        title: options.prompt.slice(0, 80),
        model: 'V5',
        customMode: false,
        instrumental: options.instrumental ?? false,
      };

      const cost = calculateSunoCost(inputs);
      await reserveCredits(userId, cost);

      updateProgress(10, 'Creating generation...');

      const { data: generation, error: insertError } = await supabase
        .from('generations')
        .insert({
          user_id: userId,
          prompt: fullPrompt,
          model_id: SUNO_CONFIG.modelId,
          model_record_id: SUNO_CONFIG.recordId,
          type: getGenerationType(SUNO_CONFIG.contentType),
          status: GENERATION_STATUS.PROCESSING,
          tokens_used: cost,
          settings: sanitizeForStorage({ ...inputs, genre: options.genre, mood: options.mood }),
        })
        .select('id')
        .single();

      if (insertError || !generation) {
        throw new Error(`Failed to create generation: ${insertError?.message}`);
      }

      updateProgress(20, 'Connecting to music service...');

      const { error: functionError } = await supabase.functions.invoke('generate-content', {
        body: {
          generationId: generation.id,
          prompt: fullPrompt,
          custom_parameters: prepareSunoPayload(inputs),
          model_config: SUNO_CONFIG,
          model_schema: SUNO_SCHEMA,
        },
      });

      if (functionError) {
        throw new Error(`Music generation failed: ${functionError.message}`);
      }

      updateProgress(30, 'Generating music...');

      const track = await pollGeneration(generation.id);
      
      if (track) {
        track.type = 'song';
        track.genre = options.genre;
        track.mood = options.mood;
        toast.success('Music generated successfully!');
      }

      return track;
    } catch (error) {
      console.error('Music generation error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate music');
      return null;
    } finally {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      setState({ isGenerating: false, progress: 0, currentStep: '' });
    }
  }, [updateProgress, pollGeneration]);

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
