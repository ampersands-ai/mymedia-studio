import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, CheckCircle2, AlertCircle, Clock, XCircle, Activity } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface APIHealth {
  api_name: string;
  display_name: string;
  category: string;
  current_status: string;
  last_check: string | null;
  response_time_ms: number | null;
  uptime_percentage: number;
  is_critical: boolean;
}

interface HealthAlert {
  id: string;
  api_config_id: string;
  severity: string;
  message: string;
  consecutive_failures: number;
  failure_started_at: string;
  resolved: boolean;
  created_at: string;
  api_config: {
    display_name: string;
  };
}

export default function APIHealthMonitor() {
  const queryClient = useQueryClient();

  // Fetch API health summary
  const { data: healthData, isLoading } = useQuery({
    queryKey: ['api-health-summary'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_api_health_summary');
      if (error) throw error;
      return data as APIHealth[];
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch active alerts
  const { data: alerts } = useQuery({
    queryKey: ['api-health-alerts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('api_health_alerts')
        .select(`
          id,
          api_config_id,
          severity,
          message,
          consecutive_failures,
          failure_started_at,
          resolved,
          created_at,
          api_config:external_api_configs(display_name)
        `)
        .eq('resolved', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as unknown as HealthAlert[];
    },
    refetchInterval: 30000,
  });

  // Manually trigger health check
  const triggerHealthCheck = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/api-health-checker`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) throw new Error('Health check failed');
      return response.json();
    },
    onSuccess: () => {
      toast.success('Health check completed');
      queryClient.invalidateQueries({ queryKey: ['api-health-summary'] });
    },
    onError: (error: Error | unknown) => {
      const message = error instanceof Error ? error.message : 'Failed to run health check';
      toast.error(message);
    },
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'degraded':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      case 'unhealthy':
      case 'error':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'timeout':
        return <AlertCircle className="h-5 w-5 text-orange-600" />;
      default:
        return <Activity className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string): { variant: 'default' | 'destructive' | 'outline'; className?: string } => {
    switch (status) {
      case 'healthy':
        return { variant: 'default', className: 'bg-green-100 text-green-800' };
      case 'degraded':
        return { variant: 'default', className: 'bg-yellow-100 text-yellow-800' };
      case 'unhealthy':
      case 'error':
        return { variant: 'destructive' };
      case 'timeout':
        return { variant: 'default', className: 'bg-orange-100 text-orange-800' };
      default:
        return { variant: 'outline' };
    }
  };

  const getCategoryBadge = (category: string) => {
    const colors: Record<string, string> = {
      image: 'bg-blue-100 text-blue-800',
      video: 'bg-purple-100 text-purple-800',
      audio: 'bg-pink-100 text-pink-800',
      storage: 'bg-indigo-100 text-indigo-800',
      payment: 'bg-green-100 text-green-800',
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

  const healthyAPIs = healthData?.filter(api => api.current_status === 'healthy').length || 0;
  const totalAPIs = healthData?.length || 0;
  const criticalIssues = healthData?.filter(api =>
    api.is_critical && api.current_status !== 'healthy'
  ).length || 0;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">API Health Monitor</h1>
          <p className="text-muted-foreground">
            External API monitoring and status dashboard
          </p>
        </div>
        <Button
          onClick={() => triggerHealthCheck.mutate()}
          disabled={triggerHealthCheck.isPending}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${triggerHealthCheck.isPending ? 'animate-spin' : ''}`} />
          Run Check Now
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Total APIs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalAPIs}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {healthyAPIs} healthy
            </p>
          </CardContent>
        </Card>

        <Card className={criticalIssues > 0 ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className={`h-4 w-4 ${criticalIssues > 0 ? 'text-red-600' : 'text-green-600'}`} />
              Critical Issues
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${criticalIssues > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {criticalIssues}
            </div>
            <p className={`text-xs mt-1 ${criticalIssues > 0 ? 'text-red-700' : 'text-green-700'}`}>
              {criticalIssues > 0 ? 'Immediate attention required' : 'All systems operational'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Uptime (24h)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {healthData ? (healthData.reduce((acc, api) => acc + api.uptime_percentage, 0) / healthData.length).toFixed(1) : 0}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Average across all APIs
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Active Alerts */}
      {alerts && alerts.length > 0 && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Active Alerts ({alerts.length})
            </CardTitle>
            <CardDescription>Critical API issues requiring attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div key={alert.id} className="flex items-start gap-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-red-900">{alert.message}</p>
                    <div className="flex items-center gap-4 text-sm text-red-700 mt-2">
                      <span>{alert.consecutive_failures} consecutive failures</span>
                      <span>Started {formatDistanceToNow(new Date(alert.failure_started_at), { addSuffix: true })}</span>
                    </div>
                  </div>
                  <Badge variant="destructive">{alert.severity}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* API Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {healthData?.map((api) => {
          const badgeProps = getStatusBadge(api.current_status);

          return (
            <Card key={api.api_name} className={api.current_status !== 'healthy' ? 'border-orange-200' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(api.current_status)}
                    <CardTitle className="text-base">{api.display_name}</CardTitle>
                  </div>
                  {api.is_critical && (
                    <Badge variant="outline" className="text-xs">Critical</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge {...badgeProps}>{api.current_status}</Badge>
                  <Badge variant="outline" className={getCategoryBadge(api.category)}>
                    {api.category}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Response Time</p>
                    <p className="font-semibold">
                      {api.response_time_ms ? `${api.response_time_ms}ms` : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Uptime (24h)</p>
                    <p className="font-semibold">{api.uptime_percentage.toFixed(1)}%</p>
                  </div>
                </div>

                {api.last_check && (
                  <p className="text-xs text-muted-foreground">
                    Last checked {formatDistanceToNow(new Date(api.last_check), { addSuffix: true })}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
