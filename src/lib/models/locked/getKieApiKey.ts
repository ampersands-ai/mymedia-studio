import { supabase } from "@/integrations/supabase/client";

/**
 * Retrieves the appropriate KIE AI API key for a given model
 * Maps specific model types to their dedicated API keys
 */
export async function getKieApiKey(modelId: string, recordId: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke('get-api-key', {
    body: { 
      provider: 'kie_ai',
      modelId,
      recordId
    }
  });

  if (error) {
    console.error('Error getting KIE AI API key:', error);
    throw new Error(`Failed to retrieve KIE AI API key: ${error.message}`);
  }

  if (!data?.apiKey) {
    throw new Error('KIE AI API key not found in response');
  }

  return data.apiKey;
}
