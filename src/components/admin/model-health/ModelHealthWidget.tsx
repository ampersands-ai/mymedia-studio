import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle, CheckCircle, TrendingUp, Activity, Bell } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ModelHealthSummary {
  record_id: string;
  model_name: string;
  success_rate_percent_24h: number | null;
  avg_latency_ms: number | null;
  last_test_at: string | null;
  failed_tests_24h: number;
  total_tests_24h: number;
}

interface AlertHistory {
  id: string;
  model_id: string;
  failure_rate: number;
  created_at: string;
  email_sent: boolean;
}

export const ModelHealthWidget = () => {
  // Fetch model health summary
  const { data: healthData, isLoading: healthLoading } = useQuery({
    queryKey: ["model-health-widget"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("model_health_summary")
        .select("*")
        .order("model_name")
        .limit(5);

      if (error) throw error;
      return data as ModelHealthSummary[];
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch recent alerts
  const { data: alerts, isLoading: alertsLoading } = useQuery({
    queryKey: ["model-alerts-widget"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("model_alert_history")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(3);

      if (error) throw error;
      return data as AlertHistory[];
    },
    refetchInterval: 30000,
  });

  // Calculate overall health status
  const getHealthStatus = () => {
    if (!healthData || healthData.length === 0) return { status: "unknown", color: "text-muted-foreground", icon: Activity };
    
    const avgSuccessRate = healthData.reduce((sum, m) => sum + (m.success_rate_percent_24h || 0), 0) / healthData.length;
    const failedModels = healthData.filter(m => (m.success_rate_percent_24h || 0) < 80).length;

    if (avgSuccessRate >= 95 && failedModels === 0) {
      return { status: "Excellent", color: "text-green-500", icon: CheckCircle };
    } else if (avgSuccessRate >= 80) {
      return { status: "Good", color: "text-yellow-500", icon: TrendingUp };
    } else {
      return { status: "Issues Detected", color: "text-destructive", icon: AlertCircle };
    }
  };

  const healthStatus = getHealthStatus();
  const HealthIcon = healthStatus.icon;

  if (healthLoading || alertsLoading) {
    return (
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Model Health Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-12 bg-muted rounded"></div>
            <div className="h-8 bg-muted rounded"></div>
            <div className="h-8 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 hover:shadow-lg transition-shadow">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Model Health Status
          </div>
          <Link to="/admin/model-health">
            <Button variant="ghost" size="sm">
              View Full Dashboard
            </Button>
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Status */}
        <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/30">
          <HealthIcon className={`h-8 w-8 ${healthStatus.color}`} />
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">Overall Health</p>
            <p className={`text-2xl font-bold ${healthStatus.color}`}>
              {healthStatus.status}
            </p>
          </div>
          {healthData && (
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Monitored Models</p>
              <p className="text-xl font-semibold">{healthData.length}</p>
            </div>
          )}
        </div>

        {/* Recent Alerts */}
        {alerts && alerts.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-destructive" />
              <h4 className="font-semibold text-sm">Recent Alerts</h4>
            </div>
            <div className="space-y-2">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-destructive/20 bg-destructive/5"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{alert.model_id}</p>
                    <p className="text-xs text-muted-foreground">
                      {alert.failure_rate.toFixed(1)}% failure rate
                    </p>
                  </div>
                  <Badge variant={alert.email_sent ? "default" : "secondary"} className="text-xs">
                    {alert.email_sent ? "Notified" : "No Email"}
                  </Badge>
                </div>
              ))}
            </div>
            <Link to="/admin/model-alerts" className="block">
              <Button variant="outline" size="sm" className="w-full">
                Manage Alert Settings
              </Button>
            </Link>
          </div>
        )}

        {/* Quick Stats */}
        {healthData && healthData.length > 0 && (
          <div className="grid grid-cols-3 gap-3 pt-3 border-t">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Avg Success</p>
              <p className="text-lg font-bold text-green-500">
                {(healthData.reduce((sum, m) => sum + (m.success_rate_percent_24h || 0), 0) / healthData.length).toFixed(1)}%
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Avg Latency</p>
              <p className="text-lg font-bold text-primary">
                {(healthData.reduce((sum, m) => sum + (m.avg_latency_ms || 0), 0) / healthData.length / 1000).toFixed(1)}s
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Tests (24h)</p>
              <p className="text-lg font-bold text-foreground">
                {healthData.reduce((sum, m) => sum + m.total_tests_24h, 0)}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
