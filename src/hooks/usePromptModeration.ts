import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

interface ModerationResult {
  flagged: boolean;
  categories: string[];
  message?: string;
}

export const usePromptModeration = () => {
  const [isChecking, setIsChecking] = useState(false);

  const checkPrompt = async (prompt: string): Promise<ModerationResult> => {
    if (!prompt || prompt.trim().length === 0) {
      return { flagged: false, categories: [] };
    }

    setIsChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke('moderate-prompt', {
        body: { prompt }
      });

      if (error) {
        logger.error('Prompt moderation failed', error as Error, {
          component: 'usePromptModeration',
          operation: 'checkPrompt',
        });
        // Fail open - don't block generation on moderation errors
        return { flagged: false, categories: [] };
      }

      if (data?.flagged) {
        toast.error(data.message || 'Your prompt contains inappropriate content. Please revise.', {
          duration: 5000,
        });
      }

      return data as ModerationResult;

    } catch (error) {
      logger.error('Prompt moderation error', error as Error, {
        component: 'usePromptModeration',
        operation: 'checkPrompt',
      });
      // Fail open
      return { flagged: false, categories: [] };
    } finally {
      setIsChecking(false);
    }
  };

  return {
    checkPrompt,
    isChecking
  };
};
