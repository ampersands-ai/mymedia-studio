import { useWebhookMonitoring } from "@/hooks/admin/useWebhookMonitoring";
import { WebhookStatsCards } from "@/components/admin/webhook/WebhookStatsCards";
import { LiveWebhookFeed } from "@/components/admin/webhook/LiveWebhookFeed";
import { ErrorAnalysisPanel } from "@/components/admin/webhook/ErrorAnalysisPanel";
import { WebhookCharts } from "@/components/admin/webhook/WebhookCharts";
import { WebhookActionsPanel } from "@/components/admin/webhook/WebhookActionsPanel";
import { Badge } from "@/components/ui/badge";
import { Activity } from "lucide-react";

const WebhookMonitor = () => {
  const {
    stats,
    statsLoading,
    recentWebhooks,
    webhooksLoading,
    storageFailures,
    stuckGenerations,
    providerStats,
    refetchAll,
  } = useWebhookMonitoring();

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Activity className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Webhook Monitor</h1>
          </div>
          <p className="text-muted-foreground mt-1">
            Real-time monitoring of webhook health, storage failures, and system performance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            Auto-refresh: 10-30s
          </Badge>
        </div>
      </div>

      {/* Stats Cards */}
      <WebhookStatsCards stats={stats} loading={statsLoading} />

      {/* Actions Panel */}
      <WebhookActionsPanel 
        stuckGenerations={stuckGenerations} 
        onRefresh={refetchAll}
      />

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Live Feed */}
        <LiveWebhookFeed 
          webhooks={recentWebhooks} 
          loading={webhooksLoading}
        />

        {/* Error Analysis */}
        <ErrorAnalysisPanel
          storageFailures={storageFailures}
          providerStats={providerStats}
          stuckGenerations={stuckGenerations}
        />
      </div>

      {/* Charts */}
      <WebhookCharts providerStats={providerStats} />
    </div>
  );
};

export default WebhookMonitor;
