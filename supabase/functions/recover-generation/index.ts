/**
 * Unified Generation Recovery Router
 * Routes recovery requests to provider-specific recovery functions
 */


import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getProviderConfig } from "../_shared/providers/registry.ts";
import { webhookLogger } from "../_shared/logger.ts";
import { getResponseHeaders, handleCorsPreflight } from "../_shared/cors.ts";
import { getErrorMessage } from "../_shared/error-utils.ts";



Deno.serve(async (req) => {
  const responseHeaders = getResponseHeaders(req);

  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  try {
    const { generation_id } = await req.json();
    
    if (!generation_id) {
      return new Response(
        JSON.stringify({ error: 'generation_id is required' }),
        { status: 400, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }

    webhookLogger.info('Recovery router invoked', { generationId: generation_id });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get generation to determine provider
    const { data: generation, error: genError } = await supabase
      .from('generations')
      .select('provider')
      .eq('id', generation_id)
      .single();

    if (genError || !generation) {
      webhookLogger.error('Generation not found', genError, { generationId: generation_id });
      return new Response(
        JSON.stringify({ error: 'Generation not found' }),
        { status: 404, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const provider = generation.provider;
    const providerConfig = getProviderConfig(provider);

    if (!providerConfig) {
      webhookLogger.error('Unknown provider', null, { 
        generationId: generation_id,
        provider 
      });
      return new Response(
        JSON.stringify({ error: `Unknown provider: ${provider}` }),
        { status: 400, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if provider has recovery function
    if (!providerConfig.recovery) {
      webhookLogger.info('No recovery function for provider', { 
        generationId: generation_id,
        provider 
      });
      return new Response(
        JSON.stringify({ 
          error: `Provider ${provider} does not support recovery`,
          provider 
        }),
        { status: 400, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }

    webhookLogger.info('Routing to provider recovery', { 
      generationId: generation_id,
      provider,
      recoveryPath: providerConfig.recovery 
    });

    // Route to provider-specific recovery function
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const recoveryUrl = `${supabaseUrl}${providerConfig.recovery}`;

    const recoveryResponse = await fetch(recoveryUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
      },
      body: JSON.stringify({ generation_id })
    });

    const recoveryResult = await recoveryResponse.json();

    if (!recoveryResponse.ok) {
      webhookLogger.error('Provider recovery failed', new Error(JSON.stringify(recoveryResult)), {
        generationId: generation_id,
        provider
      });
    } else {
      webhookLogger.success(generation_id, {
        provider,
        recovered: true
      });
    }

    return new Response(
      JSON.stringify({
        success: recoveryResponse.ok,
        provider,
        result: recoveryResult
      }),
      { 
        status: recoveryResponse.status,
        headers: { ...responseHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    webhookLogger.error('Recovery router failed', error, {});
    return new Response(
      JSON.stringify({ 
        error: 'Recovery failed',
        message: getErrorMessage(error)
      }),
      { status: 500, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
