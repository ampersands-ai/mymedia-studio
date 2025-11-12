import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, AlertTriangle, Info } from "lucide-react";
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

export default function ErrorDashboard() {
  const { data: errors, isLoading } = useQuery({
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
    refetchInterval: 10000, // Real-time updates every 10s
  });

  // Group errors by type
  const groupedErrors = errors?.reduce((acc, error) => {
    const key = error.error_type;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(error);
    return acc;
  }, {} as Record<string, ErrorLog[]>);

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
            <div className="text-2xl font-bold">{errors?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Last 100 errors</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Critical Errors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              {errors?.filter(e => e.severity === 'critical').length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Requires immediate attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Error Types</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Object.keys(groupedErrors || {}).length}
            </div>
            <p className="text-xs text-muted-foreground">Unique error categories</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Errors</CardTitle>
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
