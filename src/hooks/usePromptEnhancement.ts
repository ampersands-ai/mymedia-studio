import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

export const usePromptEnhancement = () => {
  const [isEnhancing, setIsEnhancing] = useState(false);

  const enhancePrompt = async (prompt: string, category?: string): Promise<string | null> => {
    if (!prompt || prompt.trim().length === 0) {
      toast.error('Please enter a prompt first');
      return null;
    }

    setIsEnhancing(true);
    try {
      const { data, error } = await supabase.functions.invoke('enhance-prompt', {
        body: { prompt, category }
      });

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      if (!data?.enhanced_prompt) {
        throw new Error('No enhanced prompt received');
      }

      return data.enhanced_prompt;

    } catch (error) {
      logger.error('Prompt enhancement failed', error as Error, {
        component: 'usePromptEnhancement',
        operation: 'enhancePrompt',
        category,
        promptLength: prompt.length
      });
      toast.error(error instanceof Error ? error.message : 'Failed to enhance prompt', { duration: 2000 });
      return null;
    } finally {
      setIsEnhancing(false);
    }
  };

  return {
    enhancePrompt,
    isEnhancing
  };
};
