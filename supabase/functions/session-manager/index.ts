import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { EdgeLogger } from '../_shared/edge-logger.ts';
import { getResponseHeaders, handleCorsPreflight } from "../_shared/cors.ts";



interface SessionRequest {
  action: 'create' | 'list' | 'revoke' | 'update_activity';
  session_id?: string;
}

Deno.serve(async (req) => {
  const responseHeaders = getResponseHeaders(req);

  const requestId = crypto.randomUUID();
  const logger = new EdgeLogger('session-manager', requestId);
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  try {
    // Get user from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client with user's auth for verification
    const supabaseUserClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );
    
    // Initialize service role client for database operations (bypasses RLS)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Get authenticated user using user client
    const { data: { user }, error: userError } = await supabaseUserClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, session_id }: SessionRequest = await req.json();

    // Use the authenticated client instead of service role
    // This ensures RLS policies are enforced

    const ip_address = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const user_agent = req.headers.get('user-agent') || 'unknown';

    switch (action) {
      case 'create': {
        // Create new session record
        const sessionId = crypto.randomUUID();
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

        const { error: insertError } = await supabaseClient
          .from('user_sessions')
          .insert({
            user_id: user.id,
            session_id: sessionId,
            ip_address,
            user_agent,
            expires_at: expiresAt.toISOString(),
          });

        if (insertError) {
          const errorMsg = insertError && typeof insertError === 'object' && 'message' in insertError ? insertError.message : 'Database error';
          logger.error('Error creating session', insertError instanceof Error ? insertError : new Error(String(errorMsg)), { userId: user.id });
          throw insertError;
        }

        // Log session creation to audit logs
        await supabaseClient.from('audit_logs').insert({
          user_id: user.id,
          action: 'session_created',
          resource_type: 'session',
          resource_id: sessionId,
          ip_address,
          user_agent,
          metadata: { expires_at: expiresAt.toISOString() },
        });

        return new Response(
          JSON.stringify({ success: true, session_id: sessionId }),
          { status: 200, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'list': {
        // List all active sessions for the user
        const { data: sessions, error: listError } = await supabaseClient
          .from('user_sessions')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .order('last_activity_at', { ascending: false });

        if (listError) {
          logger.error('Error listing sessions', listError, { userId: user.id });
          throw listError;
        }

        return new Response(
          JSON.stringify({ sessions }),
          { status: 200, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'revoke': {
        if (!session_id) {
          return new Response(
            JSON.stringify({ error: 'Missing session_id' }),
            { status: 400, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Revoke specific session
        const { error: revokeError } = await supabaseClient
          .from('user_sessions')
          .update({ is_active: false })
          .eq('session_id', session_id)
          .eq('user_id', user.id);

        if (revokeError) {
          logger.error('Error revoking session', revokeError, { 
            userId: user.id, 
            metadata: { session_id } 
          });
          throw revokeError;
        }

        // Log the revocation
        await supabaseClient.from('audit_logs').insert({
          user_id: user.id,
          action: 'session_revoked',
          resource_type: 'session',
          resource_id: session_id,
          ip_address,
          user_agent,
          metadata: { session_id },
        });

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'update_activity': {
        if (!session_id) {
          return new Response(
            JSON.stringify({ error: 'Missing session_id' }),
            { status: 400, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Update last activity timestamp
        const { error: updateError } = await supabaseClient
          .from('user_sessions')
          .update({ last_activity_at: new Date().toISOString() })
          .eq('session_id', session_id)
          .eq('user_id', user.id)
          .eq('is_active', true);

        if (updateError) {
          const errorMsg = updateError && typeof updateError === 'object' && 'message' in updateError ? updateError.message : 'Database error';
          logger.error('Error updating session activity', updateError instanceof Error ? updateError : new Error(String(errorMsg)), {
            userId: user.id,
            metadata: { session_id }
          });
          throw updateError;
        }

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
        );
    }

  } catch (error) {
    logger.error('Error in session-manager function', error instanceof Error ? error : new Error(String(error)));
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
