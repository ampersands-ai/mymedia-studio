import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EdgeLogger } from "../_shared/edge-logger.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TimeRange {
  start: string;
  end: string;
}

interface AnalyticsQuery {
  timeRange: '1h' | '24h' | '7d' | '30d' | 'custom';
  customStart?: string;
  customEnd?: string;
  provider?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const logger = new EdgeLogger('get-webhook-analytics', crypto.randomUUID());

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get query parameters
    const url = new URL(req.url);
    const timeRange = url.searchParams.get('timeRange') || '24h';
    const provider = url.searchParams.get('provider') || null;
    const customStart = url.searchParams.get('customStart');
    const customEnd = url.searchParams.get('customEnd');

    logger.info('Fetching webhook analytics', {
      metadata: { timeRange, provider, customStart, customEnd }
    });

    // Calculate time range
    const now = new Date();
    let startDate: Date;
    
    switch (timeRange) {
      case '1h':
        startDate = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'custom':
        if (customStart) {
          startDate = new Date(customStart);
        } else {
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        }
        break;
      default:
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    const endDate = timeRange === 'custom' && customEnd ? new Date(customEnd) : now;

    // Build base query
    let query = supabase
      .from('webhook_analytics')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (provider) {
      query = query.eq('provider', provider);
    }

    // Fetch overall stats
    const { data: events, error: eventsError } = await query;

    if (eventsError) {
      throw eventsError;
    }

    // Calculate summary metrics
    const totalEvents = events.length;
    const successCount = events.filter(e => e.status === 'success').length;
    const failureCount = events.filter(e => e.status === 'failure').length;
    const successRate = totalEvents > 0 ? (successCount / totalEvents) * 100 : 0;
    const durations = events.filter(e => e.duration_ms).map(e => e.duration_ms);
    const avgDuration = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
    const sortedDurations = [...durations].sort((a, b) => a - b);
    const p95Duration = sortedDurations.length > 0 ? sortedDurations[Math.floor(sortedDurations.length * 0.95)] : 0;

    // Group by provider
    const providerGroups = events.reduce((acc, event) => {
      if (!acc[event.provider]) {
        acc[event.provider] = [];
      }
      acc[event.provider].push(event);
      return acc;
    }, {} as Record<string, any[]>);

    const byProvider = Object.entries(providerGroups).map(([provider, providerEvents]) => {
      const total = providerEvents.length;
      const success = providerEvents.filter(e => e.status === 'success').length;
      const failure = providerEvents.filter(e => e.status === 'failure').length;
      const providerDurations = providerEvents.filter(e => e.duration_ms).map(e => e.duration_ms);
      const avgDur = providerDurations.length > 0 ? providerDurations.reduce((a, b) => a + b, 0) / providerDurations.length : 0;
      const sorted = [...providerDurations].sort((a, b) => a - b);
      const p95 = sorted.length > 0 ? sorted[Math.floor(sorted.length * 0.95)] : 0;

      return {
        provider,
        totalEvents: total,
        successCount: success,
        failureCount: failure,
        successRate: total > 0 ? (success / total) * 100 : 0,
        avgDuration: Math.round(avgDur),
        p95Duration: Math.round(p95)
      };
    });

    // Time series data - group by hour
    const timeSeriesMap = new Map<string, any>();
    
    events.forEach(event => {
      const hour = new Date(event.created_at).toISOString().substring(0, 13) + ':00:00.000Z';
      const key = `${hour}-${event.provider}-${event.status}`;
      
      if (!timeSeriesMap.has(key)) {
        timeSeriesMap.set(key, {
          timestamp: hour,
          provider: event.provider,
          status: event.status,
          eventCount: 0,
          totalDuration: 0,
          count: 0
        });
      }
      
      const entry = timeSeriesMap.get(key)!;
      entry.eventCount++;
      if (event.duration_ms) {
        entry.totalDuration += event.duration_ms;
        entry.count++;
      }
    });

    const timeSeries = Array.from(timeSeriesMap.values()).map(entry => ({
      timestamp: entry.timestamp,
      provider: entry.provider,
      status: entry.status,
      eventCount: entry.eventCount,
      avgDuration: entry.count > 0 ? Math.round(entry.totalDuration / entry.count) : 0
    })).sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    // Error breakdown
    const errorMap = new Map<string, any>();
    
    events.filter(e => e.status === 'failure').forEach(event => {
      const key = `${event.provider}-${event.error_code || 'UNKNOWN'}`;
      
      if (!errorMap.has(key)) {
        errorMap.set(key, {
          provider: event.provider,
          errorCode: event.error_code || 'UNKNOWN',
          errorCount: 0,
          errorMessages: new Set()
        });
      }
      
      const entry = errorMap.get(key)!;
      entry.errorCount++;
      if (event.metadata?.error) {
        entry.errorMessages.add(event.metadata.error);
      }
    });

    const errorBreakdown = Array.from(errorMap.values()).map(entry => ({
      provider: entry.provider,
      errorCode: entry.errorCode,
      errorCount: entry.errorCount,
      errorMessages: Array.from(entry.errorMessages).slice(0, 5)
    })).sort((a, b) => b.errorCount - a.errorCount);

    const analytics = {
      summary: {
        totalEvents,
        successRate: Math.round(successRate * 100) / 100,
        avgDuration: Math.round(avgDuration),
        p95Duration: Math.round(p95Duration),
        errorRate: Math.round((failureCount / totalEvents) * 10000) / 100
      },
      byProvider,
      timeSeries,
      errorBreakdown
    };

    logger.logDuration('Analytics fetched', startTime, {
      metadata: { totalEvents, providers: byProvider.length }
    });

    return new Response(JSON.stringify(analytics), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    logger.error('Failed to fetch analytics', error as Error, {
      duration: Date.now() - startTime
    });

    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Failed to fetch analytics' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
