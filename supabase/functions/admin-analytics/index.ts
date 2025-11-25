/**
 * Admin Analytics Edge Function
 *
 * SECURITY: Replaces client-side admin SDK usage
 * Only accessible by users with admin role
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { EdgeLogger } from '../_shared/edge-logger.ts';
import { getResponseHeaders, handleCorsPreflight } from '../_shared/cors.ts';
import { toError, getErrorMessage } from '../_shared/error-utils.ts';

Deno.serve(async (req: Request) => {
  const responseHeaders = getResponseHeaders(req);
  const logger = new EdgeLogger('admin-analytics', crypto.randomUUID());

  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Create client with user's auth token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: responseHeaders }
      );
    }

    const supabaseClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      logger.warn('Unauthenticated request');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: responseHeaders }
      );
    }

    // Verify user has admin role
    const { data: userRole, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleError || !userRole) {
      logger.warn('Non-admin user attempted to access admin analytics', {
        metadata: { userId: user.id }
      });
      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin access required' }),
        { status: 403, headers: responseHeaders }
      );
    }

    // Now safe to use admin SDK with service role
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    logger.info('Fetching admin analytics', { metadata: { adminId: user.id } });

    // Fetch user data using admin SDK
    const { data: usersData, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
    if (usersError) {
      throw new Error(`Failed to fetch users: ${usersError.message}`);
    }

    // Fetch generation data
    const { data: generations, error: genError } = await supabaseAdmin
      .from('generations')
      .select('user_id, status, created_at');

    if (genError) {
      throw new Error(`Failed to fetch generations: ${genError.message}`);
    }

    // Calculate analytics
    const totalUsers = usersData?.users?.length || 0;
    const activeUsers = new Set((generations || []).map(g => g.user_id)).size;
    const completedGens = (generations || []).filter(g => g.status === 'completed').length;
    const totalGens = generations?.length || 0;

    const analytics = {
      userEngagement: {
        totalUsers,
        activeUsers,
        successRate: totalGens > 0 ? ((completedGens / totalGens) * 100).toFixed(1) : '0',
        avgGensPerUser: totalUsers > 0 ? (totalGens / totalUsers).toFixed(1) : '0'
      },
      users: usersData.users,
      generations
    };

    logger.info('Admin analytics fetched successfully', {
      metadata: {
        adminId: user.id,
        totalUsers,
        totalGenerations: totalGens
      }
    });

    return new Response(
      JSON.stringify({ success: true, data: analytics }),
      { status: 200, headers: responseHeaders }
    );

  } catch (error) {
    const err = toError(error);
    logger.error('Error fetching admin analytics', err);

    return new Response(
      JSON.stringify({ error: getErrorMessage(err) }),
      { status: 500, headers: responseHeaders }
    );
  }
});
