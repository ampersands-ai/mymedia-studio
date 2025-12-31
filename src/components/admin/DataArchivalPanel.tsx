/**
 * Admin panel for managing data archival
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Archive, 
  Database, 
  Trash2, 
  Play, 
  Calendar,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { 
  useArchivalStats, 
  useArchivalHistory, 
  useRunArchival,
  useCreatePartitions,
  useDropOldPartitions 
} from '@/hooks/useDataArchival';
import { formatDistanceToNow } from 'date-fns';

export function DataArchivalPanel() {
  const { data: stats, isLoading: statsLoading } = useArchivalStats();
  const { data: history, isLoading: historyLoading } = useArchivalHistory(10);
  const runArchival = useRunArchival();
  const createPartitions = useCreatePartitions();
  const dropOldPartitions = useDropOldPartitions();

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Database className="h-4 w-4 text-blue-500" />
              API Call Logs
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <p className="text-2xl font-bold">{stats?.api_call_logs.pending || 0}</p>
                <p className="text-xs text-muted-foreground">
                  Records pending archival (&gt;30 days)
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Archive className="h-4 w-4 text-purple-500" />
              Audit Logs
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <p className="text-2xl font-bold">{stats?.audit_logs.pending || 0}</p>
                <p className="text-xs text-muted-foreground">
                  Records pending archival (&gt;90 days)
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4 text-green-500" />
              Generations
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <p className="text-2xl font-bold">{stats?.generations.pending || 0}</p>
                <p className="text-xs text-muted-foreground">
                  Records pending archival (&gt;180 days)
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Archival Actions</CardTitle>
          <CardDescription>
            Manage data archival and partition maintenance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => runArchival.mutate()}
              disabled={runArchival.isPending}
            >
              <Play className="h-4 w-4 mr-2" />
              {runArchival.isPending ? 'Running...' : 'Run Archival Now'}
            </Button>

            <Button
              variant="outline"
              onClick={() => createPartitions.mutate()}
              disabled={createPartitions.isPending}
            >
              <Database className="h-4 w-4 mr-2" />
              {createPartitions.isPending ? 'Creating...' : 'Create Future Partitions'}
            </Button>

            <Button
              variant="destructive"
              onClick={() => dropOldPartitions.mutate(12)}
              disabled={dropOldPartitions.isPending}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {dropOldPartitions.isPending ? 'Dropping...' : 'Drop Old Partitions'}
            </Button>
          </div>

          <div className="text-sm text-muted-foreground">
            <p><strong>Retention Policies:</strong></p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>API Call Logs: 30 days in main table, archived after</li>
              <li>Audit Logs: 90 days in main table, archived after</li>
              <li>Generations: 180 days in main table, archived after</li>
              <li>Archived partitions kept for 12 months before deletion</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Recent Runs */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Archival Runs</CardTitle>
          <CardDescription>
            History of data archival operations
          </CardDescription>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : history && history.length > 0 ? (
            <div className="space-y-2">
              {history.map((run) => (
                <div
                  key={run.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {run.error_message ? (
                      <AlertCircle className="h-4 w-4 text-destructive" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    )}
                    <div>
                      <p className="font-medium">{run.table_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(run.run_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {run.error_message ? (
                      <Badge variant="destructive">Error</Badge>
                    ) : (
                      <>
                        <Badge variant="secondary">
                          {run.archived_count} archived
                        </Badge>
                        <Badge variant="outline">
                          {run.deleted_count} deleted
                        </Badge>
                      </>
                    )}
                    {run.duration_ms && (
                      <span className="text-xs text-muted-foreground">
                        {run.duration_ms}ms
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              No archival runs recorded yet
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
