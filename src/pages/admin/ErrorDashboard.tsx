import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, AlertTriangle, Info, Activity } from "lucide-react";
import { format } from "date-fns";

interface ErrorLog {
  id: string;
  error_type: string;
  severity: string;
  error_message: string;
  route_name: string;
  created_at: string;
  user_id?: string;
  metadata?: any;
}

interface FunctionLog {
  id: string;
  function_name: string;
  log_level: string;
  message: string;
  error_message?: string;
  created_at: string;
  user_id?: string;
  context?: any;
}

export default function ErrorDashboard() {
  const { data: errors, isLoading: isLoadingErrors } = useQuery({
    queryKey: ['error-dashboard'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_error_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data as ErrorLog[];
    },
    refetchInterval: 10000,
  });

  const { data: functionLogs, isLoading: isLoadingFunctions } = useQuery({
    queryKey: ['function-logs-dashboard'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('function_logs')
        .select('*')
        .in('log_level', ['error', 'critical'])
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data as FunctionLog[];
    },
    refetchInterval: 10000,
  });

  const isLoading = isLoadingErrors || isLoadingFunctions;

  const groupedErrors = errors?.reduce((acc, error) => {
    const key = error.error_type;
    if (!acc[key]) acc[key] = [];
    acc[key].push(error);
    return acc;
  }, {} as Record<string, ErrorLog[]>);

  const groupedFunctionLogs = functionLogs?.reduce((acc, log) => {
    const key = log.function_name;
    if (!acc[key]) acc[key] = [];
    acc[key].push(log);
    return acc;
  }, {} as Record<string, FunctionLog[]>);

  const totalErrors = (errors?.length || 0) + (functionLogs?.length || 0);
  const criticalErrors = (errors?.filter(e => e.severity === 'critical').length || 0) + 
                         (functionLogs?.filter(l => l.log_level === 'critical').length || 0);

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    const variants: Record<string, any> = {
      critical: 'destructive',
      high: 'default',
      medium: 'secondary',
      low: 'outline',
    };
    return variants[severity] || 'outline';
  };

  if (isLoading) {
    return <div className="p-6">Loading error dashboard...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Error Dashboard</h1>
        <p className="text-muted-foreground">Real-time error monitoring and tracking</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Errors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalErrors}</div>
            <p className="text-xs text-muted-foreground">Frontend & Backend combined</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Critical Errors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{criticalErrors}</div>
            <p className="text-xs text-muted-foreground">Requires immediate attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Backend Errors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{functionLogs?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Edge function errors</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="frontend" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="frontend">Frontend Errors ({errors?.length || 0})</TabsTrigger>
          <TabsTrigger value="backend">Backend Errors ({functionLogs?.length || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="frontend">
          <Card>
            <CardHeader>
              <CardTitle>Frontend Errors</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {errors?.map((error) => (
              <div
                key={error.id}
                className="flex items-start gap-4 p-4 border rounded-lg"
              >
                <div className="mt-1">
                  {getSeverityIcon(error.severity)}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={getSeverityBadge(error.severity)}>
                      {error.severity}
                    </Badge>
                    <span className="font-mono text-sm">{error.error_type}</span>
                  </div>
                  <p className="text-sm font-medium">{error.error_message}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Route: {error.route_name}</span>
                    <span>
                      {format(new Date(error.created_at), 'MMM dd, HH:mm:ss')}
                    </span>
                  </div>
                </div>
              </div>
            ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="backend">
          <Card>
            <CardHeader>
              <CardTitle>Backend Errors (Edge Functions)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {functionLogs?.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-4 p-4 border rounded-lg"
                  >
                    <div className="mt-1">
                      {log.log_level === 'critical' ? (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                      )}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={log.log_level === 'critical' ? 'destructive' : 'default'}>
                          {log.log_level}
                        </Badge>
                        <span className="font-mono text-sm">
                          <Activity className="h-3 w-3 inline mr-1" />
                          {log.function_name}
                        </span>
                      </div>
                      <p className="text-sm font-medium">{log.message}</p>
                      {log.error_message && (
                        <p className="text-xs text-muted-foreground">{log.error_message}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{format(new Date(log.created_at), 'MMM dd, HH:mm:ss')}</span>
                        {log.user_id && <span>User: {log.user_id.slice(0, 8)}...</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {groupedErrors && Object.keys(groupedErrors).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Error Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(groupedErrors).map(([type, typeErrors]) => (
                <div
                  key={type}
                  className="flex items-center justify-between p-3 border rounded"
                >
                  <span className="font-mono text-sm">{type}</span>
                  <Badge variant="outline">{typeErrors.length} occurrences</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
