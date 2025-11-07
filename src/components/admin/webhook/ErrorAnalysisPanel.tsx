import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StorageFailure, ProviderStat, StuckGeneration } from "@/hooks/admin/useWebhookMonitoring";
import { formatDistanceToNow } from "date-fns";
import { AlertCircle, TrendingDown } from "lucide-react";

interface ErrorAnalysisPanelProps {
  storageFailures: StorageFailure[];
  providerStats: ProviderStat[];
  stuckGenerations: StuckGeneration[];
}

export const ErrorAnalysisPanel = ({ 
  storageFailures, 
  providerStats,
  stuckGenerations 
}: ErrorAnalysisPanelProps) => {
  const groupStorageErrors = () => {
    const groups: Record<string, StorageFailure[]> = {};
    storageFailures.forEach(failure => {
      const errorType = failure.error_message.includes('HTML') 
        ? 'HTML Response Error'
        : failure.error_message.includes('permission')
        ? 'Permission Denied'
        : failure.error_message.includes('bucket')
        ? 'Bucket Error'
        : 'Other Error';
      
      if (!groups[errorType]) groups[errorType] = [];
      groups[errorType].push(failure);
    });
    return groups;
  };

  const groupedErrors = groupStorageErrors();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-orange-500" />
          Error Analysis
        </CardTitle>
        <CardDescription>Detailed breakdown of failures and issues</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="storage" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="storage">
              Storage Failures
              {storageFailures.length > 0 && (
                <Badge variant="destructive" className="ml-2">{storageFailures.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="providers">Provider Stats</TabsTrigger>
            <TabsTrigger value="stuck">
              Stuck Jobs
              {stuckGenerations.length > 0 && (
                <Badge variant="secondary" className="ml-2 bg-orange-500">{stuckGenerations.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="storage" className="mt-4">
            <ScrollArea className="h-[400px] pr-4">
              {Object.entries(groupedErrors).map(([errorType, failures]) => (
                <div key={errorType} className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <h4 className="font-semibold">{errorType}</h4>
                    <Badge variant="outline">{failures.length}</Badge>
                  </div>
                  <div className="space-y-2">
                    {failures.slice(0, 5).map((failure) => (
                      <div
                        key={failure.id}
                        className="p-3 border rounded-lg bg-red-50 dark:bg-red-900/10"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <code className="text-xs bg-background px-2 py-1 rounded">
                            {failure.id.slice(0, 8)}...
                          </code>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(failure.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        <div className="text-xs text-red-700 dark:text-red-300 mb-1">
                          Model: <Badge variant="outline" className="ml-1">{failure.model_id}</Badge>
                        </div>
                        <div className="text-xs bg-background p-2 rounded mt-2 font-mono">
                          {failure.storage_error}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {storageFailures.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  No storage failures in the last 24 hours
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="providers" className="mt-4">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-3">
                {providerStats.map((stat) => (
                  <div
                    key={stat.model_id}
                    className="p-4 border rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono">
                          {stat.model_id}
                        </Badge>
                        {stat.failure_rate > 10 && (
                          <TrendingDown className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                      <div className={`text-lg font-bold ${
                        stat.failure_rate > 10 
                          ? 'text-red-600 dark:text-red-400' 
                          : stat.failure_rate > 5
                          ? 'text-yellow-600 dark:text-yellow-400'
                          : 'text-green-600 dark:text-green-400'
                      }`}>
                        {stat.failure_rate}% fail
                      </div>
                    </div>
                    <div className="flex gap-4 text-sm">
                      <span className="text-green-600 dark:text-green-400">
                        ✓ {stat.success_count} success
                      </span>
                      <span className="text-red-600 dark:text-red-400">
                        ✗ {stat.fail_count} failed
                      </span>
                    </div>
                  </div>
                ))}
                {providerStats.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    No provider data available
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="stuck" className="mt-4">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-2">
                {stuckGenerations.map((stuck) => (
                  <div
                    key={stuck.id}
                    className="p-3 border rounded-lg bg-orange-50 dark:bg-orange-900/10"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <code className="text-xs bg-background px-2 py-1 rounded">
                        {stuck.id.slice(0, 8)}...
                      </code>
                      <span className="text-xs text-muted-foreground">
                        Stuck for {formatDistanceToNow(new Date(stuck.created_at))}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <Badge variant="outline">{stuck.model_id}</Badge>
                      <span className="text-muted-foreground">
                        {stuck.tokens_used} tokens
                      </span>
                    </div>
                  </div>
                ))}
                {stuckGenerations.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    No stuck generations found
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
