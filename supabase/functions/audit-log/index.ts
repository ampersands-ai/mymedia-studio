import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import { EdgeLogger } from "../_shared/edge-logger.ts";
import { getResponseHeaders, handleCorsPreflight } from "../_shared/cors.ts";

// Input validation schema with strict limits
const auditLogSchema = z.object({
  action: z.string()
    .min(1, 'Action is required')
    .max(100, 'Action too long')
    .regex(/^[a-z_]+$/, 'Action must be lowercase with underscores only'),
  resource_type: z.string()
    .max(50, 'Resource type too long')
    .optional(),
  resource_id: z.string()
    .uuid('Invalid resource ID format')
    .optional(),
  metadata: z.record(z.any())
    .refine(
      (data) => {
        try {
          const jsonStr = JSON.stringify(data);
          return jsonStr.length <= 10000; // 10KB limit
        } catch {
          return false;
        }
      },
      { message: 'Metadata too large (max 10KB)' }
    )
    .optional()
    .default({})
});

Deno.serve(async (req) => {
  const responseHeaders = getResponseHeaders(req);
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  const logger = new EdgeLogger('audit-log', requestId);

  try {
    // Get user from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Get authenticated user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse and validate request body
    let requestBody;
    try {
      requestBody = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { status: 400, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate input using zod schema
    let validatedData;
    try {
      validatedData = auditLogSchema.parse(requestBody);
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        logger.error('Validation error', validationError as Error, {
          metadata: { errors: validationError.errors }
        });
        return new Response(
          JSON.stringify({
            error: 'Invalid input',
            details: validationError.errors.map(e => e.message).join(', ')
          }),
          { status: 400, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw validationError;
    }

    // Extract anonymized data from IP/user-agent
    // We store only country code and device type, not raw values
    const rawIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '';
    const rawUserAgent = (req.headers.get('user-agent') || '').toLowerCase();
    
    // Extract device type from user-agent (privacy-safe)
    let device_type = 'unknown';
    if (rawUserAgent.includes('mobile') || rawUserAgent.includes('android') || rawUserAgent.includes('iphone')) {
      device_type = 'mobile';
    } else if (rawUserAgent.includes('tablet') || rawUserAgent.includes('ipad')) {
      device_type = 'tablet';
    } else if (rawUserAgent.includes('bot') || rawUserAgent.includes('crawler')) {
      device_type = 'bot';
    } else if (rawUserAgent.length > 0) {
      device_type = 'desktop';
    }
    
    // Note: For real country detection, you'd use a geo-IP service
    // For now, we store 'XX' as placeholder - can be enhanced with Cloudflare headers
    const country_code = req.headers.get('cf-ipcountry') || 'XX';

    // Use service role to bypass RLS for inserting
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Insert audit log with anonymized data (no raw IP or user-agent)
    const { error: insertError } = await supabaseAdmin
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action: validatedData.action,
        resource_type: validatedData.resource_type || null,
        resource_id: validatedData.resource_id || null,
        country_code,
        device_type,
        metadata: validatedData.metadata,
      });

    if (insertError) {
      logger.error('Database error in audit-log', insertError instanceof Error ? insertError : new Error(String(insertError) || 'Database error'));
      return new Response(
        JSON.stringify({ error: 'Failed to create audit log' }),
        { status: 500, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logger.info('Audit log recorded', { 
      metadata: { action: validatedData.action, userId: user.id }
    });
    logger.logDuration('Audit log', startTime);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    // Log full error server-side for debugging
    logger.error('Error in audit-log function', error as any);

    // Return generic error to client (no sensitive details)
    return new Response(
      JSON.stringify({ error: 'An error occurred while processing your request' }),
      { status: 500, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
