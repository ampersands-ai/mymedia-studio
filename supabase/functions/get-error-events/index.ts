import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: responseHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verify authentication
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify admin role
    const { data: roles } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!roles || roles.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Forbidden - Admin access required' }),
        { status: 403, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse query parameters
    const url = new URL(req.url)
    const severity = url.searchParams.get('severity')
    const category = url.searchParams.get('category')
    const resolved = url.searchParams.get('resolved')
    const limit = parseInt(url.searchParams.get('limit') || '50')
    const offset = parseInt(url.searchParams.get('offset') || '0')
    const timeWindow = url.searchParams.get('timeWindow') || '24h' // 1h, 24h, 7d, 30d

    // Build query
    let query = supabaseClient
      .from('error_events')
      .select(`
        id,
        severity,
        category,
        message,
        error_code,
        user_id,
        request_id,
        function_name,
        endpoint,
        metadata,
        user_facing,
        user_message,
        resolved,
        resolved_at,
        resolved_by,
        resolution_notes,
        admin_notified,
        created_at
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (severity) {
      query = query.eq('severity', severity)
    }
    if (category) {
      query = query.eq('category', category)
    }
    if (resolved !== null) {
      query = query.eq('resolved', resolved === 'true')
    }

    // Apply time window
    const now = new Date()
    let since: Date
    switch (timeWindow) {
      case '1h':
        since = new Date(now.getTime() - 60 * 60 * 1000)
        break
      case '24h':
        since = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        break
      case '7d':
        since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case '30d':
        since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      default:
        since = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    }
    query = query.gte('created_at', since.toISOString())

    const { data, error, count } = await query

    if (error) throw error

    // Get aggregated stats
    const { data: stats } = await supabaseClient
      .from('error_events')
      .select('severity, category', { count: 'exact', head: false })
      .gte('created_at', since.toISOString())

    // Calculate stats
    const aggregatedStats = {
      total: count || 0,
      bySeverity: {
        critical: stats?.filter(s => s.severity === 'critical').length || 0,
        error: stats?.filter(s => s.severity === 'error').length || 0,
        warning: stats?.filter(s => s.severity === 'warning').length || 0,
        info: stats?.filter(s => s.severity === 'info').length || 0,
      },
      byCategory: stats?.reduce((acc: Record<string, number>, item: any) => {
        acc[item.category] = (acc[item.category] || 0) + 1
        return acc
      }, {}) || {},
      unresolved: stats?.filter((s: any) => s.resolved === false).length || 0,
    }

    return new Response(
      JSON.stringify({
        data,
        pagination: {
          limit,
          offset,
          total: count,
        },
        stats: aggregatedStats,
      }),
      { headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error fetching error events:', error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : String(error) || 'Internal server error'
      }),
      { status: 500, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
