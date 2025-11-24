import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { EdgeLogger } from "../_shared/edge-logger.ts";
import { getResponseHeaders, handleCorsPreflight } from "../_shared/cors.ts";

const roleManagementSchema = z.object({
  user_id: z.string().uuid(),
  role: z.enum(['admin', 'moderator', 'user']),
  action: z.enum(['grant', 'revoke']),
});

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();
  const logger = new EdgeLogger('manage-user-role', requestId);
  const startTime = Date.now();

  // Get response headers (includes CORS + security headers)
  const responseHeaders = getResponseHeaders(req);

  // Handle CORS preflight with secure origin validation
  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  interface RequestBody {
    user_id?: string;
    role?: string;
    action?: string;
  }

  interface AuthUser {
    id: string;
  }

  let body: RequestBody | undefined;
  let user: AuthUser | undefined;

  try {
    logger.info('Processing role management request');
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
      logger.warn('Non-admin user attempted role management', { userId: user.id });
      throw new Error('Forbidden: Admin access required');
    }

    // Validate and parse request body
    body = await req.json();
    const { user_id, role, action } = roleManagementSchema.parse(body);

    logger.info('Role management request validated', { 
      metadata: { targetUserId: user_id, role, action, adminId: user.id }
    });

    // Prevent self-modification
    if (user_id === user.id) {
      logger.warn('Admin attempted to modify own role', { userId: user.id });
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

    logger.info('Role management completed successfully', {
      metadata: { targetUserId: user_id, role, action }
    });
    logger.logDuration('Role management request', startTime);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    logger.error('Role management failed', error as Error, {
      metadata: {
        adminUserId: user?.id,
        targetUserId: body?.user_id,
        role: body?.role,
        action: body?.action,
      }
    });

    const message = (error as Error)?.message || 'An error occurred';
    const status = message.includes('Unauthorized') || message.includes('authorization') ? 401
      : message.includes('Forbidden') ? 403
      : message.includes('not found') ? 404
      : 400;
    
    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
