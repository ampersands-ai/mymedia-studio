import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * API Health Checker Edge Function
 *
 * Runs health checks on all configured external APIs
 * Can be triggered:
 * 1. Via cron (every 5 minutes)
 * 2. Manually by admins
 * 3. After detecting API errors
 *
 * Workflow:
 * 1. Fetch all enabled API configs
 * 2. Perform health check on each API
 * 3. Record results
 * 4. Create alerts if needed
 * 5. Notify admins if critical
 */

serve(async (req) => {
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('🏥 Starting API health checks...')

    // Fetch all enabled API configs
    const { data: apiConfigs, error: configError } = await supabaseClient
      .from('external_api_configs')
      .select('*')
      .eq('is_enabled', true)

    if (configError) {
      throw new Error(`Failed to fetch API configs: ${configError.message}`)
    }

    console.log(`Found ${apiConfigs.length} APIs to check`)

    const results = []

    // Perform health checks
    for (const config of apiConfigs) {
      console.log(`Checking ${config.display_name}...`)

      const startTime = Date.now()
      let status = 'healthy'
      let statusCode = null
      let errorMessage = null
      let responseTime = null

      try {
        // Perform HTTP request
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), config.timeout_seconds * 1000)

        const response = await fetch(config.health_check_url, {
          method: config.health_check_method || 'GET',
          headers: {
            'User-Agent': 'Artifio-Health-Checker/1.0',
            ...(config.name === 'elevenlabs' && { 'xi-api-key': Deno.env.get('ELEVENLABS_API_KEY') }),
            ...(config.name === 'azure-tts' && { 'Ocp-Apim-Subscription-Key': Deno.env.get('AZURE_TTS_KEY') }),
          },
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        responseTime = Date.now() - startTime
        statusCode = response.status

        // Determine health status
        if (response.status === (config.expected_status_code || 200)) {
          if (responseTime > config.expected_response_time_ms) {
            status = 'degraded'
          } else {
            status = 'healthy'
          }
        } else if (response.status >= 500) {
          status = 'unhealthy'
          errorMessage = `Server error: ${response.status}`
        } else if (response.status >= 400) {
          status = 'degraded'
          errorMessage = `Client error: ${response.status}`
        }

        console.log(`✅ ${config.display_name}: ${status} (${responseTime}ms)`)
      } catch (error: any) {
        responseTime = Date.now() - startTime

        if (error.name === 'AbortError') {
          status = 'timeout'
          errorMessage = `Timeout after ${config.timeout_seconds}s`
        } else {
          status = 'error'
          errorMessage = error.message || 'Unknown error'
        }

        console.log(`❌ ${config.display_name}: ${status} - ${errorMessage}`)
      }

      // Record health check result
      const { error: insertError } = await supabaseClient
        .from('api_health_checks')
        .insert({
          api_config_id: config.id,
          status,
          response_time_ms: responseTime,
          status_code: statusCode,
          error_message: errorMessage,
        })

      if (insertError) {
        console.error(`Failed to record health check for ${config.name}:`, insertError)
      }

      // Check if we need to create an alert
      if (status !== 'healthy' && config.is_critical) {
        await handleUnhealthyAPI(supabaseClient, config, status, errorMessage)
      }

      results.push({
        api: config.name,
        status,
        response_time_ms: responseTime,
      })
    }

    console.log('✅ Health checks completed')

    return new Response(
      JSON.stringify({
        success: true,
        checked_at: new Date().toISOString(),
        results,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('❌ Health check error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Health check failed';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
})

/**
 * Handle unhealthy API detection
 * - Check for consecutive failures
 * - Create alert if threshold exceeded
 * - Notify admins if needed
 */
async function handleUnhealthyAPI(
  supabase: any,
  config: any,
  status: string,
  errorMessage: string | null
) {
  // Get recent health checks to count consecutive failures
  const { data: recentChecks } = await supabase
    .from('api_health_checks')
    .select('status')
    .eq('api_config_id', config.id)
    .order('checked_at', { ascending: false })
    .limit(config.alert_threshold)

  if (!recentChecks) return

  // Count consecutive failures
  let consecutiveFailures = 0
  for (const check of recentChecks) {
    if (check.status !== 'healthy') {
      consecutiveFailures++
    } else {
      break
    }
  }

  console.log(`${config.display_name}: ${consecutiveFailures} consecutive failures`)

  // Check if threshold exceeded
  if (consecutiveFailures >= config.alert_threshold) {
    // Check if alert already exists and unresolved
    const { data: existingAlert } = await supabase
      .from('api_health_alerts')
      .select('id')
      .eq('api_config_id', config.id)
      .eq('resolved', false)
      .single()

    if (!existingAlert) {
      // Create new alert
      const { error: alertError } = await supabase
        .from('api_health_alerts')
        .insert({
          api_config_id: config.id,
          severity: 'critical',
          message: `${config.display_name} is ${status}. ${errorMessage || 'No response'}`,
          consecutive_failures: consecutiveFailures,
          failure_started_at: new Date().toISOString(),
        })

      if (alertError) {
        console.error('Failed to create alert:', alertError)
      } else {
        console.log(`🚨 Alert created for ${config.display_name}`)

        // TODO: Send notification (email/webhook)
        // This would integrate with your notification system
      }
    }
  }
}
