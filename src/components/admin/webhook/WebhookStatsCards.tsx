import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, AlertCircle, Clock, Zap } from "lucide-react";
import { WebhookStats } from "@/hooks/admin/useWebhookMonitoring";
import { Skeleton } from "@/components/ui/skeleton";

interface WebhookStatsCardsProps {
  stats?: WebhookStats;
  loading: boolean;
}

export const WebhookStatsCards = ({ stats, loading }: WebhookStatsCardsProps) => {
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4 rounded-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-1" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 95) return "text-green-600 dark:text-green-400";
    if (rate >= 85) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${getSuccessRateColor(stats.successRate)}`}>
            {stats.successRate}%
          </div>
          <p className="text-xs text-muted-foreground">
            {stats.completedCount} / {stats.totalWebhooks} webhooks (24h)
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Storage Failures</CardTitle>
          <AlertCircle className={`h-4 w-4 ${stats.storageFailures > 0 ? 'text-red-500' : 'text-muted-foreground'}`} />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${stats.storageFailures > 0 ? 'text-red-600 dark:text-red-400' : 'text-foreground'}`}>
            {stats.storageFailures}
          </div>
          <p className="text-xs text-muted-foreground">
            Last 24 hours
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Stuck Generations</CardTitle>
          <Clock className={`h-4 w-4 ${stats.stuckGenerations > 0 ? 'text-orange-500' : 'text-muted-foreground'}`} />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${stats.stuckGenerations > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-foreground'}`}>
            {stats.stuckGenerations}
          </div>
          <p className="text-xs text-muted-foreground">
            Processing &gt; 30 minutes
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg Latency</CardTitle>
          <Zap className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.averageLatency}ms</div>
          <p className="text-xs text-muted-foreground">
            Webhook processing time
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
