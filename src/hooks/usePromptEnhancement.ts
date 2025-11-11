import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

      toast.success('Prompt enhanced successfully!');
      return data.enhanced_prompt;

    } catch (error: any) {
      console.error('Error enhancing prompt:', error);
      toast.error(error.message || 'Failed to enhance prompt');
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
