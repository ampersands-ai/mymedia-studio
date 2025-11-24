import { useWebhookAnalytics } from "@/hooks/admin/useWebhookAnalytics";
import { WebhookAnalyticsSummaryCards } from "./WebhookAnalyticsSummaryCards";
import { WebhookEventVolumeChart } from "./WebhookEventVolumeChart";
import { WebhookProviderStatsTable } from "./WebhookProviderStatsTable";
import { WebhookErrorAnalysisPanel } from "./WebhookErrorAnalysisPanel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export const WebhookAnalyticsDashboard = () => {
  const {
    analytics,
    isLoading,
    error,
    refetch,
    timeRange,
    setTimeRange,
    provider,
    setProvider,
  } = useWebhookAnalytics();

  const handleRefresh = () => {
    refetch();
  };

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-destructive">Failed to load analytics: {error.message}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Webhook Analytics</CardTitle>
              <CardDescription>
                Comprehensive insights into webhook performance and reliability
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Time Range</label>
              <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as '1h' | '24h' | '7d' | '30d' | 'custom')}>
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="1h">1 Hour</TabsTrigger>
                  <TabsTrigger value="24h">24 Hours</TabsTrigger>
                  <TabsTrigger value="7d">7 Days</TabsTrigger>
                  <TabsTrigger value="30d">30 Days</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <div className="w-48">
              <label className="text-sm font-medium mb-2 block">Provider</label>
              <Select value={provider || 'all'} onValueChange={(v) => setProvider(v === 'all' ? null : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Providers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Providers</SelectItem>
                  <SelectItem value="kie-ai">KIE AI</SelectItem>
                  <SelectItem value="midjourney">Midjourney</SelectItem>
                  <SelectItem value="json2video">JSON2Video</SelectItem>
                  <SelectItem value="dodo-payments">Dodo Payments</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : analytics ? (
        <WebhookAnalyticsSummaryCards summary={analytics.summary} />
      ) : null}

      {/* Event Volume Chart */}
      {isLoading ? (
        <Skeleton className="h-96" />
      ) : analytics ? (
        <WebhookEventVolumeChart timeSeries={analytics.timeSeries} />
      ) : null}

      {/* Provider Stats and Error Analysis */}
      <div className="grid gap-6 lg:grid-cols-2">
        {isLoading ? (
          <>
            <Skeleton className="h-96" />
            <Skeleton className="h-96" />
          </>
        ) : analytics ? (
          <>
            <WebhookProviderStatsTable providers={analytics.byProvider} />
            <WebhookErrorAnalysisPanel errors={analytics.errorBreakdown} />
          </>
        ) : null}
      </div>
    </div>
  );
};
