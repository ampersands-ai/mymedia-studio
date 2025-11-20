import { supabase } from "@/integrations/supabase/client";

/**
 * Retrieves the appropriate Runware API key for a given model
 * Maps specific model types to their dedicated API keys
 */
export async function getRunwareApiKey(modelId: string, recordId: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke('get-api-key', {
    body: { 
      provider: 'runware',
      modelId,
      recordId
    }
  });

  if (error) {
    console.error('Error getting Runware API key:', error);
    throw new Error(`Failed to retrieve Runware API key: ${error.message}`);
  }

  if (!data?.apiKey) {
    throw new Error('Runware API key not found in response');
  }

  return data.apiKey;
}
