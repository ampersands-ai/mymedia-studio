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
        .maybeSingle();

      if (fetchError) {
        console.error('[useGenerationPolling] Initial fetch error:', fetchError);
        return;
      }

      if (data) {
        console.log('[useGenerationPolling] Initial status:', data.status);

        // If we already have an output URL, treat as completed immediately
        if (data.output_url) {
          setOutputUrl(data.output_url);
          setStatus('completed');
          console.log('[useGenerationPolling] Initial: derived completed from output_url');
          return;
        }

        setStatus(data.status as 'pending' | 'processing' | 'completed' | 'failed');

        if (data.status === 'failed') {
          const providerResponse = data.provider_response as any;
          const errorMsg = providerResponse?.error || 'Generation failed';
          setError(errorMsg);
          return;
        }

        // Fallback: if parent has no output_url yet, check for completed children
        try {
          const { data: child, error: childError } = await supabase
            .from('generations')
            .select('output_url, output_index, status')
            .eq('parent_generation_id', generationId)
            .eq('status', 'completed')
            .order('output_index', { ascending: true })
            .limit(1)
            .maybeSingle();

          if (childError) {
            console.warn('[useGenerationPolling] Initial: child lookup error:', childError);
          } else if (child?.output_url) {
            setOutputUrl(child.output_url);
            setStatus('completed');
            console.log('[useGenerationPolling] Initial: derived completed from child output_url');
          }
        } catch (e) {
          console.warn('[useGenerationPolling] Initial: child lookup threw error:', e);
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
        async (payload: any) => {
          console.log('[useGenerationPolling] Realtime update:', payload.new);
          const newStatus = payload.new.status as 'pending' | 'processing' | 'completed' | 'failed';

          // If we receive an output URL, consider it completed immediately
          if (payload.new.output_url) {
            setOutputUrl(payload.new.output_url);
            setStatus('completed');
            console.log('[useGenerationPolling] Realtime: derived completed from output_url');
            return;
          }

          setStatus(newStatus);
          
          if (newStatus === 'completed') {
            // Fallback for cases where status is completed but URL not yet copied on parent
            try {
              const { data: child } = await supabase
                .from('generations')
                .select('output_url, output_index, status')
                .eq('parent_generation_id', generationId)
                .eq('status', 'completed')
                .order('output_index', { ascending: true })
                .limit(1)
                .maybeSingle();

              if (child?.output_url) {
                setOutputUrl(child.output_url);
                setStatus('completed');
                console.log('[useGenerationPolling] Realtime: derived completed from child output_url');
              }
            } catch (e) {
              console.warn('[useGenerationPolling] Realtime: child lookup error:', e);
            }
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
        .maybeSingle();

      if (fetchError) {
        console.error('[useGenerationPolling] Poll error:', fetchError);
        return;
      }

      if (data) {
        console.log('[useGenerationPolling] Poll update:', data.status);

        // If output URL is present, complete immediately
        if (data.output_url) {
          setOutputUrl(data.output_url);
          setStatus('completed');
          console.log('[useGenerationPolling] Poll: derived completed from output_url');
          clearInterval(pollInterval);
          return;
        }

        setStatus(data.status as 'pending' | 'processing' | 'completed' | 'failed');
        
        if (data.status === 'failed') {
          const providerResponse = data.provider_response as any;
          const errorMsg = providerResponse?.error || 'Generation failed';
          setError(errorMsg);
          console.error('[useGenerationPolling] Poll: Generation failed');
          clearInterval(pollInterval);
          return;
        }

        if (data.status === 'completed' || data.status === 'processing') {
          // Fallback: check completed children for output_url
          try {
            const { data: child } = await supabase
              .from('generations')
              .select('output_url, output_index, status')
              .eq('parent_generation_id', generationId)
              .eq('status', 'completed')
              .order('output_index', { ascending: true })
              .limit(1)
              .maybeSingle();

            if (child?.output_url) {
              setOutputUrl(child.output_url);
              setStatus('completed');
              console.log('[useGenerationPolling] Poll: derived completed from child output_url');
              clearInterval(pollInterval);
            }
          } catch (e) {
            console.warn('[useGenerationPolling] Poll: child lookup error:', e);
          }
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
