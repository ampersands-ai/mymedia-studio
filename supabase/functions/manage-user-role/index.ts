import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Inline helper: sanitize errors before logging
function sanitizeError(error: any): any {
  if (error && typeof error === 'object') {
    const { authorization, token, api_key, apiKey, secret, ...safe } = error;
    return safe;
  }
  return error;
}

// Inline helper: log errors to console
function logError(context: string, error: any, metadata?: any): void {
  console.error(`[ERROR] ${context}:`, sanitizeError(error), metadata);
}

// Inline helper: create standardized error response
function createErrorResponse(error: any, headers: any, context: string, metadata?: any): Response {
  logError(context, error, metadata);
  const message = error?.message || 'An error occurred';
  const status = message.includes('Unauthorized') || message.includes('authorization') ? 401
    : message.includes('Forbidden') ? 403
    : message.includes('not found') ? 404
    : 400;
  
  return new Response(
    JSON.stringify({ error: message }),
    { status, headers: { ...headers, 'Content-Type': 'application/json' } }
  );
}

const roleManagementSchema = z.object({
  user_id: z.string().uuid(),
  role: z.enum(['admin', 'moderator', 'user']),
  action: z.enum(['grant', 'revoke']),
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let body: any;
  let user: any;

  try {
    // Authenticate the requesting user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user: authUser }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !authUser) {
      throw new Error('Unauthorized');
    }

    user = authUser;

    // Verify admin role using service role client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleError || !roleData) {
      throw new Error('Forbidden: Admin access required');
    }

    // Validate and parse request body
    body = await req.json();
    const { user_id, role, action } = roleManagementSchema.parse(body);

    // Prevent self-modification
    if (user_id === user.id) {
      throw new Error('Cannot modify your own role');
    }

    if (action === 'grant') {
      // Add role with granted_by tracking
      const { error: insertError } = await supabaseAdmin
        .from('user_roles')
        .insert({
          user_id,
          role,
          granted_by: user.id,
        });

      if (insertError) {
        throw insertError;
      }

      // Log to audit trail
      await supabaseAdmin.from('audit_logs').insert({
        user_id: user.id,
        action: 'role_granted',
        resource_type: 'user_role',
        resource_id: user_id,
        metadata: {
          role,
          granted_to: user_id,
        }
      });
    } else {
      // Revoke role
      const { error: deleteError } = await supabaseAdmin
        .from('user_roles')
        .delete()
        .eq('user_id', user_id)
        .eq('role', role);

      if (deleteError) {
        throw deleteError;
      }

      // Log to audit trail
      await supabaseAdmin.from('audit_logs').insert({
        user_id: user.id,
        action: 'role_revoked',
        resource_type: 'user_role',
        resource_id: user_id,
        metadata: {
          role,
          revoked_from: user_id,
        }
      });
    }

    console.log(`[SUCCESS] Role ${action} completed: ${role} for user ${user_id}`);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return createErrorResponse(error, corsHeaders, 'manage-user-role', {
      admin_user_id: user?.id,
      target_user_id: body?.user_id,
      role: body?.role,
      action: body?.action,
    });
  }
});
