import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface GenerationPollingResult {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  outputUrl: string | null;
  error: string | null;
}

export const useGenerationPolling = (
  generationId: string | null, 
  enabled: boolean
): GenerationPollingResult => {
  const [status, setStatus] = useState<'pending' | 'processing' | 'completed' | 'failed'>('pending');
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!generationId || !enabled) return;

    console.log('[useGenerationPolling] Starting polling for generation:', generationId);

    // Initial fetch to get current status immediately
    const fetchInitialStatus = async () => {
      const { data, error: fetchError } = await supabase
        .from('generations')
        .select('status, output_url, provider_response')
        .eq('id', generationId)
        .single();

      if (fetchError) {
        console.error('[useGenerationPolling] Initial fetch error:', fetchError);
        return;
      }

      if (data) {
        console.log('[useGenerationPolling] Initial status:', data.status);
        setStatus(data.status as 'pending' | 'processing' | 'completed' | 'failed');
        
        if (data.status === 'completed') {
          setOutputUrl(data.output_url);
          console.log('[useGenerationPolling] Already completed:', data.output_url);
        } else if (data.status === 'failed') {
          const providerResponse = data.provider_response as any;
          const errorMsg = providerResponse?.error || 'Generation failed';
          setError(errorMsg);
        }
      }
    };

    fetchInitialStatus();

    // Set up realtime subscription
    const channel = supabase
      .channel(`generation-${generationId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'generations',
          filter: `id=eq.${generationId}`
        },
        (payload: any) => {
          console.log('[useGenerationPolling] Realtime update:', payload.new);
          const newStatus = payload.new.status as 'pending' | 'processing' | 'completed' | 'failed';
          setStatus(newStatus);
          
          if (newStatus === 'completed') {
            setOutputUrl(payload.new.output_url);
            console.log('[useGenerationPolling] Generation completed:', payload.new.output_url);
          } else if (newStatus === 'failed') {
            const providerResponse = payload.new.provider_response as any;
            const errorMsg = providerResponse?.error || 'Generation failed';
            setError(errorMsg);
            console.error('[useGenerationPolling] Generation failed:', errorMsg);
          }
        }
      )
      .subscribe();

    // Also poll as backup (every 3 seconds)
    const pollInterval = setInterval(async () => {
      const { data, error: fetchError } = await supabase
        .from('generations')
        .select('status, output_url, provider_response')
        .eq('id', generationId)
        .single();

      if (fetchError) {
        console.error('[useGenerationPolling] Poll error:', fetchError);
        return;
      }

      if (data) {
        console.log('[useGenerationPolling] Poll update:', data.status);
        setStatus(data.status as 'pending' | 'processing' | 'completed' | 'failed');
        
        if (data.status === 'completed') {
          setOutputUrl(data.output_url);
          console.log('[useGenerationPolling] Poll: Generation completed');
          clearInterval(pollInterval);
        } else if (data.status === 'failed') {
          const providerResponse = data.provider_response as any;
          const errorMsg = providerResponse?.error || 'Generation failed';
          setError(errorMsg);
          console.error('[useGenerationPolling] Poll: Generation failed');
          clearInterval(pollInterval);
        }
      }
    }, 3000);

    return () => {
      console.log('[useGenerationPolling] Cleanup for generation:', generationId);
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [generationId, enabled]);

  return { status, outputUrl, error };
};
