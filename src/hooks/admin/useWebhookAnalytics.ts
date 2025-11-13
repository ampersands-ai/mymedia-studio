import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";

export interface WebhookAnalyticsSummary {
  totalEvents: number;
  successRate: number;
  avgDuration: number;
  p95Duration: number;
  errorRate: number;
}

export interface ProviderStats {
  provider: string;
  totalEvents: number;
  successCount: number;
  failureCount: number;
  successRate: number;
  avgDuration: number;
  p95Duration: number;
}

export interface TimeSeriesData {
  timestamp: string;
  provider: string;
  status: string;
  eventCount: number;
  avgDuration: number;
}

export interface ErrorBreakdown {
  provider: string;
  errorCode: string;
  errorCount: number;
  errorMessages: string[];
}

export interface WebhookAnalytics {
  summary: WebhookAnalyticsSummary;
  byProvider: ProviderStats[];
  timeSeries: TimeSeriesData[];
  errorBreakdown: ErrorBreakdown[];
}

export type TimeRangeOption = '1h' | '24h' | '7d' | '30d' | 'custom';

export function useWebhookAnalytics() {
  const [timeRange, setTimeRange] = useState<TimeRangeOption>('24h');
  const [provider, setProvider] = useState<string | null>(null);
  const [customStart, setCustomStart] = useState<string | null>(null);
  const [customEnd, setCustomEnd] = useState<string | null>(null);

  const fetchAnalytics = async (): Promise<WebhookAnalytics> => {
    const { data, error } = await supabase.functions.invoke('get-webhook-analytics', {
      body: {
        timeRange,
        provider: provider || undefined,
        customStart: timeRange === 'custom' ? customStart : undefined,
        customEnd: timeRange === 'custom' ? customEnd : undefined,
      },
    });

    if (error) throw error;
    return data;
  };

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['webhook-analytics', timeRange, provider, customStart, customEnd],
    queryFn: fetchAnalytics,
    refetchInterval: 30000, // Auto-refresh every 30 seconds
    staleTime: 20000,
  });

  return {
    analytics: data,
    isLoading,
    error,
    refetch,
    timeRange,
    setTimeRange,
    provider,
    setProvider,
    customStart,
    setCustomStart,
    customEnd,
    setCustomEnd,
  };
}
