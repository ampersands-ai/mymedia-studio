import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Voice {
  voice_id: string;
  name: string;
  category?: string;
  description?: string;
  preview_url?: string;
  labels?: Record<string, string>;
}

export function useVoices() {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVoices = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('get-voices');

      if (fnError) throw fnError;

      if (data?.voices && Array.isArray(data.voices)) {
        setVoices(data.voices);
      } else {
        // Fallback to popular ElevenLabs voices
        setVoices([
          { voice_id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George', category: 'premade', description: 'British male voice' },
          { voice_id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', category: 'premade', description: 'American female voice' },
          { voice_id: 'TX3LPaxmHKxFdv7VOQHJ', name: 'Liam', category: 'premade', description: 'American male voice' },
          { voice_id: 'XrExE9yKIg1WjnnlVkGX', name: 'Matilda', category: 'premade', description: 'American female voice' },
          { voice_id: 'pqHfZKP75CvOlQylNhV4', name: 'Bill', category: 'premade', description: 'American male voice' },
          { voice_id: 'nPczCjzI2devNBz1zQrb', name: 'Brian', category: 'premade', description: 'American male voice' },
          { voice_id: 'cgSgspJ2msm6clMCkdW9', name: 'Jessica', category: 'premade', description: 'American female voice' },
          { voice_id: 'iP95p4xoKVk53GoZ742B', name: 'Chris', category: 'premade', description: 'American male voice' },
        ]);
      }
    } catch (err) {
      console.error('Error fetching voices:', err);
      setError(err instanceof Error ? err.message : 'Failed to load voices');
      // Use fallback voices on error
      setVoices([
        { voice_id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George', category: 'premade', description: 'British male voice' },
        { voice_id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', category: 'premade', description: 'American female voice' },
        { voice_id: 'TX3LPaxmHKxFdv7VOQHJ', name: 'Liam', category: 'premade', description: 'American male voice' },
        { voice_id: 'XrExE9yKIg1WjnnlVkGX', name: 'Matilda', category: 'premade', description: 'American female voice' },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVoices();
  }, [fetchVoices]);

  return {
    voices,
    isLoading,
    error,
    refresh: fetchVoices,
  };
}
