import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface AdminAlertPayload {
  error_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  function_name: string;
  error_message: string;
  error_stack?: string;
  user_id?: string;
  user_email?: string;
  route_name?: string;
  prompt?: string;
  generation_id?: string;
  model_name?: string;
  provider?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Send an admin alert email for backend errors
 * This is a fire-and-forget operation - failures are logged but don't throw
 */
export async function sendAdminErrorAlert(payload: AdminAlertPayload): Promise<void> {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check if admin notifications are enabled
    const { data: settings } = await supabase
      .from('app_settings')
      .select('setting_value')
      .eq('setting_key', 'admin_notifications')
      .single();

    if (!settings?.setting_value?.error_alerts?.enabled) {
      console.log('[admin-alerts] Error alerts disabled, skipping');
      return;
    }

    const alertConfig = settings.setting_value.error_alerts;
    const minSeverity = alertConfig.min_severity || 'low';
    const severityRank: Record<string, number> = { low: 0, medium: 1, high: 2, critical: 3 };

    // Only send if severity meets threshold
    if (severityRank[payload.severity] < severityRank[minSeverity]) {
      console.log(`[admin-alerts] Severity ${payload.severity} below threshold ${minSeverity}, skipping`);
      return;
    }

    // Get user email if we have user_id but no email
    let userEmail = payload.user_email;
    if (!userEmail && payload.user_id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', payload.user_id)
        .single();
      userEmail = profile?.email;
    }

    // Log error to database first
    const { data: errorRecord } = await supabase
      .from('user_error_logs')
      .insert({
        user_id: payload.user_id || null,
        error_type: payload.error_type,
        severity: payload.severity,
        route_name: payload.route_name || payload.function_name,
        route_path: `/functions/${payload.function_name}`,
        component_name: payload.function_name,
        error_message: payload.error_message,
        error_stack: payload.error_stack,
        metadata: {
          ...payload.metadata,
          source: 'edge_function',
          function_name: payload.function_name,
          prompt: payload.prompt,
          generation_id: payload.generation_id,
          model_name: payload.model_name,
          provider: payload.provider,
        },
      })
      .select()
      .single();

    // Trigger email alert with comprehensive details
    await supabase.functions.invoke('send-error-alert', {
      body: {
        error_id: errorRecord?.id,
        error_type: payload.error_type,
        severity: payload.severity,
        route_name: payload.route_name || payload.function_name,
        error_message: payload.error_message,
        error_stack: payload.error_stack,
        component_name: payload.function_name,
        user_action: 'Edge function execution',
        user_id: payload.user_id,
        user_email: userEmail,
        prompt: payload.prompt,
        generation_id: payload.generation_id,
        model_name: payload.model_name,
        provider: payload.provider,
        affected_scripts: [`supabase/functions/${payload.function_name}/index.ts`],
        metadata: payload.metadata,
      }
    });

    console.log(`[admin-alerts] Alert sent for ${payload.function_name}: ${payload.severity}`);
  } catch (err) {
    // Log but don't throw - admin alerts should never break the main flow
    console.error('[admin-alerts] Failed to send admin alert:', err);
  }
}

/**
 * Quick helper for critical errors
 */
export function alertCriticalError(
  functionName: string,
  error: Error | string,
  metadata?: Record<string, unknown>
): Promise<void> {
  const errorMessage = error instanceof Error ? error.message : error;
  const errorStack = error instanceof Error ? error.stack : undefined;
  
  return sendAdminErrorAlert({
    error_type: 'edge_function_error',
    severity: 'critical',
    function_name: functionName,
    error_message: errorMessage,
    error_stack: errorStack,
    user_id: metadata?.userId as string,
    user_email: metadata?.userEmail as string,
    prompt: metadata?.prompt as string,
    generation_id: metadata?.generationId as string,
    model_name: metadata?.modelName as string,
    provider: metadata?.provider as string,
    metadata,
  });
}

/**
 * Quick helper for high severity errors
 */
export function alertHighError(
  functionName: string,
  error: Error | string,
  userId?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  const errorMessage = error instanceof Error ? error.message : error;
  const errorStack = error instanceof Error ? error.stack : undefined;
  
  return sendAdminErrorAlert({
    error_type: 'edge_function_error',
    severity: 'high',
    function_name: functionName,
    error_message: errorMessage,
    error_stack: errorStack,
    user_id: userId,
    user_email: metadata?.userEmail as string,
    prompt: metadata?.prompt as string,
    generation_id: metadata?.generationId as string,
    model_name: metadata?.modelName as string,
    provider: metadata?.provider as string,
    metadata,
  });
}
