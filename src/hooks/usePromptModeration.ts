import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ModerationResponse {
  flagged: boolean;
  exempt: boolean;
  flaggedCategories: string[];
  categories: Record<string, boolean>;
  categoryScores: Record<string, number>;
}

interface UsePromptModerationReturn {
  checkPrompt: (prompt: string) => Promise<ModerationResponse | null>;
  isChecking: boolean;
  error: string | null;
}

export function usePromptModeration(): UsePromptModerationReturn {
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkPrompt = useCallback(async (prompt: string): Promise<ModerationResponse | null> => {
    if (!prompt.trim()) {
      return null;
    }

    setIsChecking(true);
    setError(null);

    try {
      // Get current user ID for exemption check
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error: funcError } = await supabase.functions.invoke('moderate-prompt', {
        body: { 
          prompt,
          userId: user?.id 
        },
      });

      if (funcError) {
        console.error('Moderation error:', funcError);
        setError('Failed to check prompt');
        return null;
      }

      return data as ModerationResponse;
    } catch (err) {
      console.error('Moderation error:', err);
      setError('Failed to check prompt');
      return null;
    } finally {
      setIsChecking(false);
    }
  }, []);

  return { checkPrompt, isChecking, error };
}
