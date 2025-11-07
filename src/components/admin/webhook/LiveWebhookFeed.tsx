import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RecentWebhook } from "@/hooks/admin/useWebhookMonitoring";
import { formatDistanceToNow } from "date-fns";
import { CheckCircle2, XCircle, Clock, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LiveWebhookFeedProps {
  webhooks: RecentWebhook[];
  loading: boolean;
}

export const LiveWebhookFeed = ({ webhooks, loading }: LiveWebhookFeedProps) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'processing':
        return <Clock className="h-4 w-4 text-yellow-500 animate-pulse" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500 hover:bg-green-600">Success</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'processing':
        return <Badge variant="secondary" className="bg-yellow-500 hover:bg-yellow-600">Processing</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Live Webhook Activity</CardTitle>
          <CardDescription>Loading recent webhooks...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Live Webhook Activity</CardTitle>
        <CardDescription>Last 50 webhook calls (auto-refresh: 10s)</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] pr-4">
          <div className="space-y-2">
            {webhooks.map((webhook) => (
              <div
                key={webhook.id}
                className="flex items-start gap-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="pt-1">
                  {getStatusIcon(webhook.status)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-mono text-muted-foreground">
                      {formatDistanceToNow(new Date(webhook.created_at), { addSuffix: true })}
                    </span>
                    {getStatusBadge(webhook.status)}
                    <Badge variant="outline" className="font-mono text-xs">
                      {webhook.model_id}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="text-xs bg-muted px-2 py-1 rounded">
                      {webhook.id.slice(0, 8)}...
                    </code>
                    {webhook.storage_path && (
                      <span className="text-xs text-green-600 dark:text-green-400">
                        ✓ Storage
                      </span>
                    )}
                    {webhook.status === 'failed' && webhook.provider_response?.error && (
                      <span className="text-xs text-red-600 dark:text-red-400 truncate">
                        {webhook.provider_response.error}
                      </span>
                    )}
                  </div>
                  {webhook.status === 'failed' && webhook.provider_response?.storage_error && (
                    <div className="mt-2 text-xs bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-2 rounded">
                      Storage Error: {webhook.provider_response.storage_error}
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(`/admin/all-generations?search=${webhook.id}`, '_blank')}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {webhooks.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                No webhook activity found
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
