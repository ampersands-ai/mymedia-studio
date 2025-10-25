import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

interface ApiCallLogData {
  videoJobId?: string;
  generationId?: string;
  userId: string;
  serviceName: 'elevenlabs' | 'anthropic' | 'pexels' | 'shotstack' | 'other';
  endpoint: string;
  httpMethod: string;
  stepName: string;
  requestPayload: any;
  requestHeaders?: any;
  additionalMetadata?: any;
}

interface ApiCallResponse {
  statusCode: number;
  payload: any;
  headers?: any;
  isError: boolean;
  errorMessage?: string;
  errorDetails?: any;
}

/**
 * Sanitize sensitive data from headers and payloads
 */
function sanitizeData(data: any): any {
  if (!data) return {};
  
  const sanitized = JSON.parse(JSON.stringify(data));
  
  // Remove sensitive keys
  const sensitiveKeys = [
    'api_key', 'apiKey', 'api-key',
    'authorization', 'Authorization',
    'xi-api-key', 'x-api-key',
    'bearer', 'Bearer',
    'token', 'Token',
    'secret', 'Secret'
  ];
  
  function removeSensitiveKeys(obj: any) {
    if (typeof obj !== 'object' || obj === null) return;
    
    for (const key of Object.keys(obj)) {
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive.toLowerCase()))) {
        obj[key] = '[REDACTED]';
      } else if (typeof obj[key] === 'object') {
        removeSensitiveKeys(obj[key]);
      }
    }
  }
  
  removeSensitiveKeys(sanitized);
  return sanitized;
}

/**
 * Log an API call to the database
 */
export async function logApiCall(
  supabase: any,
  logData: ApiCallLogData,
  requestSentAt: Date,
  response?: ApiCallResponse
): Promise<void> {
  try {
    const responseReceivedAt = response ? new Date() : null;
    const latencyMs = response && responseReceivedAt 
      ? responseReceivedAt.getTime() - requestSentAt.getTime() 
      : null;

    const { error } = await supabase.from('api_call_logs').insert({
      video_job_id: logData.videoJobId || null,
      generation_id: logData.generationId || null,
      user_id: logData.userId,
      service_name: logData.serviceName,
      endpoint: logData.endpoint,
      http_method: logData.httpMethod,
      step_name: logData.stepName,
      request_payload: sanitizeData(logData.requestPayload),
      request_headers: sanitizeData(logData.requestHeaders),
      request_sent_at: requestSentAt.toISOString(),
      response_payload: response ? sanitizeData(response.payload) : null,
      response_headers: response ? sanitizeData(response.headers) : null,
      response_status_code: response?.statusCode || null,
      response_received_at: responseReceivedAt?.toISOString() || null,
      is_error: response?.isError || false,
      error_message: response?.errorMessage || null,
      error_details: response?.errorDetails ? sanitizeData(response.errorDetails) : null,
      latency_ms: latencyMs,
      additional_metadata: logData.additionalMetadata || {}
    });

    if (error) {
      console.error('[API Logger] Failed to log API call:', error);
    }
  } catch (err) {
    console.error('[API Logger] Exception while logging:', err);
  }
}

/**
 * Update api_call_logs with generation_id after generation is created
 */
export async function linkApiLogsToGeneration(
  supabase: any,
  videoJobId: string,
  generationId: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('api_call_logs')
      .update({ generation_id: generationId })
      .eq('video_job_id', videoJobId)
      .is('generation_id', null);

    if (error) {
      console.error('[API Logger] Failed to link logs to generation:', error);
    } else {
      console.log(`[API Logger] Linked API logs to generation ${generationId}`);
    }
  } catch (err) {
    console.error('[API Logger] Exception while linking logs:', err);
  }
}
