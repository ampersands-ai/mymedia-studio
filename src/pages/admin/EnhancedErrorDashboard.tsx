import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, AlertTriangle, Info, Activity, CheckCircle2, RefreshCw, Filter, XCircle } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { useState } from "react";

interface ErrorEvent {
  id: string;
  severity: 'critical' | 'error' | 'warning' | 'info';
  category: string;
  message: string;
  error_code: string | null;
  stack_trace: string | null;
  user_id: string | null;
  request_id: string | null;
  function_name: string | null;
  endpoint: string | null;
  metadata: any;
  user_facing: boolean;
  user_message: string | null;
  resolved: boolean;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;
  admin_notified: boolean;
  created_at: string;
}

interface ErrorStats {
  total: number;
  bySeverity: {
    critical: number;
    error: number;
    warning: number;
    info: number;
  };
  byCategory: Record<string, number>;
  unresolved: number;
}

export default function EnhancedErrorDashboard() {
  const queryClient = useQueryClient();
  const [timeWindow, setTimeWindow] = useState<'1h' | '24h' | '7d' | '30d'>('24h');
  const [severityFilter, setSeverityFilter] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [resolvedFilter, setResolvedFilter] = useState<string>('false');
  const [selectedError, setSelectedError] = useState<ErrorEvent | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');

  // Fetch error events using the new centralized system
  const { data: errorData, isLoading, refetch } = useQuery({
    queryKey: ['error-events', timeWindow, severityFilter, categoryFilter, resolvedFilter],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const params = new URLSearchParams({
        timeWindow,
        resolved: resolvedFilter,
        limit: '100',
        offset: '0',
      });

      if (severityFilter) params.append('severity', severityFilter);
      if (categoryFilter) params.append('category', categoryFilter);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-error-events?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch error events');
      }

      const result = await response.json();
      return {
        errors: result.data as ErrorEvent[],
        stats: result.stats as ErrorStats,
        pagination: result.pagination,
      };
    },
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Resolve error mutation
  const resolveError = useMutation({
    mutationFn: async ({ errorId, notes }: { errorId: string; notes: string }) => {
      const { data, error } = await supabase.rpc('resolve_error_event', {
        p_error_id: errorId,
        p_resolution_notes: notes,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Error marked as resolved');
      queryClient.invalidateQueries({ queryKey: ['error-events'] });
      setSelectedError(null);
      setResolutionNotes('');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to resolve error');
    },
  });

  const errors = errorData?.errors || [];
  const stats = errorData?.stats;

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getSeverityBadgeVariant = (severity: string): any => {
    switch (severity) {
      case 'critical':
      case 'error':
        return 'destructive';
      case 'warning':
        return 'default';
      default:
        return 'secondary';
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      authentication: 'bg-purple-100 text-purple-800',
      generation: 'bg-blue-100 text-blue-800',
      payment: 'bg-green-100 text-green-800',
      api: 'bg-orange-100 text-orange-800',
      database: 'bg-red-100 text-red-800',
      webhook: 'bg-indigo-100 text-indigo-800',
      video: 'bg-pink-100 text-pink-800',
      storyboard: 'bg-teal-100 text-teal-800',
      workflow: 'bg-cyan-100 text-cyan-800',
      system: 'bg-gray-100 text-gray-800',
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Error Monitoring Dashboard</h1>
          <p className="text-muted-foreground">
            Real-time error tracking and resolution
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Total Errors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.total || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Last {timeWindow}
            </p>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              Critical
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              {stats?.bySeverity.critical || 0}
            </div>
            <p className="text-xs text-red-700 mt-1">Immediate attention required</p>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <XCircle className="h-4 w-4 text-orange-600" />
              Errors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">
              {stats?.bySeverity.error || 0}
            </div>
            <p className="text-xs text-orange-700 mt-1">Action needed</p>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              Unresolved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">
              {stats?.unresolved || 0}
            </div>
            <p className="text-xs text-yellow-700 mt-1">Pending resolution</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Time Window</label>
              <Select value={timeWindow} onValueChange={(v: any) => setTimeWindow(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1h">Last Hour</SelectItem>
                  <SelectItem value="24h">Last 24 Hours</SelectItem>
                  <SelectItem value="7d">Last 7 Days</SelectItem>
                  <SelectItem value="30d">Last 30 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Severity</label>
              <Select value={severityFilter || 'all'} onValueChange={(v) => setSeverityFilter(v === 'all' ? null : v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Category</label>
              <Select value={categoryFilter || 'all'} onValueChange={(v) => setCategoryFilter(v === 'all' ? null : v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="authentication">Authentication</SelectItem>
                  <SelectItem value="generation">Generation</SelectItem>
                  <SelectItem value="payment">Payment</SelectItem>
                  <SelectItem value="api">API</SelectItem>
                  <SelectItem value="database">Database</SelectItem>
                  <SelectItem value="webhook">Webhook</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="storyboard">Storyboard</SelectItem>
                  <SelectItem value="workflow">Workflow</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select value={resolvedFilter} onValueChange={setResolvedFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="false">Unresolved Only</SelectItem>
                  <SelectItem value="true">Resolved Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error List */}
      <Card>
        <CardHeader>
          <CardTitle>Error Events ({errors.length})</CardTitle>
          <CardDescription>
            Click on an error to view details and resolve
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {errors.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
                <p className="text-lg font-medium">No errors found</p>
                <p className="text-sm">System is healthy ✨</p>
              </div>
            ) : (
              errors.map((error) => (
                <div
                  key={error.id}
                  onClick={() => setSelectedError(error)}
                  className="flex items-start gap-4 p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                >
                  <div className="mt-1">{getSeverityIcon(error.severity)}</div>

                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={getSeverityBadgeVariant(error.severity)}>
                        {error.severity.toUpperCase()}
                      </Badge>
                      <Badge className={getCategoryColor(error.category)} variant="outline">
                        {error.category}
                      </Badge>
                      {error.user_facing && (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700">
                          User-Facing
                        </Badge>
                      )}
                      {error.resolved && (
                        <Badge variant="outline" className="bg-green-50 text-green-700">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Resolved
                        </Badge>
                      )}
                      {error.error_code && (
                        <span className="font-mono text-xs text-muted-foreground">
                          {error.error_code}
                        </span>
                      )}
                    </div>

                    <p className="text-sm font-medium">{error.message}</p>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                      <span>
                        {formatDistanceToNow(new Date(error.created_at), { addSuffix: true })}
                      </span>
                      {error.function_name && <span>Function: {error.function_name}</span>}
                      {error.endpoint && <span>Endpoint: {error.endpoint}</span>}
                      {error.user_id && (
                        <span className="font-mono">User: {error.user_id.slice(0, 8)}...</span>
                      )}
                      {error.request_id && (
                        <span className="font-mono">Request: {error.request_id.slice(0, 8)}...</span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Error Detail Dialog */}
      <Dialog open={!!selectedError} onOpenChange={() => setSelectedError(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedError && getSeverityIcon(selectedError.severity)}
              Error Details
            </DialogTitle>
            <DialogDescription>
              {selectedError && format(new Date(selectedError.created_at), 'PPpp')}
            </DialogDescription>
          </DialogHeader>

          {selectedError && (
            <div className="space-y-4">
              {/* Badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={getSeverityBadgeVariant(selectedError.severity)}>
                  {selectedError.severity.toUpperCase()}
                </Badge>
                <Badge className={getCategoryColor(selectedError.category)} variant="outline">
                  {selectedError.category}
                </Badge>
                {selectedError.error_code && (
                  <Badge variant="outline">{selectedError.error_code}</Badge>
                )}
              </div>

              {/* Message */}
              <div>
                <h4 className="font-semibold mb-2">Error Message</h4>
                <p className="text-sm bg-accent p-3 rounded">{selectedError.message}</p>
              </div>

              {/* User Message */}
              {selectedError.user_message && (
                <div>
                  <h4 className="font-semibold mb-2">User-Facing Message</h4>
                  <p className="text-sm bg-blue-50 p-3 rounded border border-blue-200">
                    {selectedError.user_message}
                  </p>
                </div>
              )}

              {/* Stack Trace */}
              {selectedError.stack_trace && (
                <div>
                  <h4 className="font-semibold mb-2">Stack Trace</h4>
                  <pre className="text-xs bg-gray-900 text-gray-100 p-3 rounded overflow-x-auto">
                    {selectedError.stack_trace}
                  </pre>
                </div>
              )}

              {/* Metadata */}
              {selectedError.metadata && Object.keys(selectedError.metadata).length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Metadata</h4>
                  <pre className="text-xs bg-accent p-3 rounded overflow-x-auto">
                    {JSON.stringify(selectedError.metadata, null, 2)}
                  </pre>
                </div>
              )}

              {/* Context */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                {selectedError.function_name && (
                  <div>
                    <span className="font-semibold">Function:</span> {selectedError.function_name}
                  </div>
                )}
                {selectedError.endpoint && (
                  <div>
                    <span className="font-semibold">Endpoint:</span> {selectedError.endpoint}
                  </div>
                )}
                {selectedError.user_id && (
                  <div>
                    <span className="font-semibold">User ID:</span> {selectedError.user_id}
                  </div>
                )}
                {selectedError.request_id && (
                  <div>
                    <span className="font-semibold">Request ID:</span> {selectedError.request_id}
                  </div>
                )}
              </div>

              {/* Resolution */}
              {selectedError.resolved ? (
                <div className="bg-green-50 border border-green-200 p-4 rounded">
                  <h4 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Resolved
                  </h4>
                  <p className="text-sm text-green-700 mb-2">
                    Resolved {formatDistanceToNow(new Date(selectedError.resolved_at!), { addSuffix: true })}
                  </p>
                  {selectedError.resolution_notes && (
                    <p className="text-sm text-green-700">{selectedError.resolution_notes}</p>
                  )}
                </div>
              ) : (
                <div>
                  <h4 className="font-semibold mb-2">Resolution Notes</h4>
                  <Textarea
                    placeholder="Describe how this error was resolved..."
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    rows={3}
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            {selectedError && !selectedError.resolved && (
              <Button
                onClick={() =>
                  resolveError.mutate({
                    errorId: selectedError.id,
                    notes: resolutionNotes,
                  })
                }
                disabled={resolveError.isPending}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Mark as Resolved
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
