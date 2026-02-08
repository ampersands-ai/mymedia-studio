import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, AlertTriangle, Activity, Clock, RefreshCw, CheckCircle, XCircle, Eye } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { Database } from "@/integrations/supabase/types";

type TimeRange = "1h" | "24h" | "7d" | "30d";
type ErrorEvent = Database["public"]["Tables"]["error_events"]["Row"];
type AuditLog = Database["public"]["Tables"]["audit_logs"]["Row"];
type SecurityConfig = Database["public"]["Tables"]["security_config"]["Row"];

export default function SecurityDashboard() {
  const [timeRange, setTimeRange] = useState<TimeRange>("24h");

  const getTimeFilter = () => {
    const now = new Date();
    switch (timeRange) {
      case "1h": return new Date(now.getTime() - 60 * 60 * 1000).toISOString();
      case "24h": return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      case "7d": return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      case "30d": return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    }
  };

  // Fetch security alerts from error_events
  const { data: securityAlerts, isLoading: alertsLoading, refetch: refetchAlerts } = useQuery({
    queryKey: ["security-alerts", timeRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("error_events")
        .select("*")
        .eq("category", "security")
        .gte("created_at", getTimeFilter())
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch audit logs
  const { data: auditLogs, isLoading: logsLoading, refetch: refetchLogs } = useQuery({
    queryKey: ["security-audit-logs", timeRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .gte("created_at", getTimeFilter())
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch security config thresholds
  const { data: securityConfig } = useQuery({
    queryKey: ["security-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("security_config")
        .select("*");
      if (error) throw error;
      return data || [];
    },
  });

  const handleRefresh = () => {
    refetchAlerts();
    refetchLogs();
  };

  // Calculate stats
  const stats = {
    totalAlerts: securityAlerts?.length || 0,
    criticalAlerts: securityAlerts?.filter((a: ErrorEvent) => a.severity === "critical").length || 0,
    unresolvedAlerts: securityAlerts?.filter((a: ErrorEvent) => !a.resolved).length || 0,
    failedLogins: auditLogs?.filter((l: AuditLog) => l.action === "login_failed").length || 0,
    adminActions: auditLogs?.filter((l: AuditLog) => l.action?.startsWith("admin_")).length || 0,
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "destructive";
      case "error": return "destructive";
      case "warn": return "secondary";
      default: return "outline";
    }
  };

  const getActionIcon = (action: string) => {
    if (action?.includes("failed")) return <XCircle className="h-4 w-4 text-destructive" />;
    if (action?.includes("admin")) return <Eye className="h-4 w-4 text-amber-500" />;
    if (action?.includes("success") || action?.includes("login")) return <CheckCircle className="h-4 w-4 text-green-500" />;
    return <Activity className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black flex items-center gap-2">
            <Shield className="h-8 w-8" />
            Security Dashboard
          </h1>
          <p className="text-muted-foreground">Monitor security events, alerts, and audit logs</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Last hour</SelectItem>
              <SelectItem value="24h">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Alerts</CardDescription>
            <CardTitle className="text-2xl">{stats.totalAlerts}</CardTitle>
          </CardHeader>
        </Card>
        <Card className={stats.criticalAlerts > 0 ? "border-destructive" : ""}>
          <CardHeader className="pb-2">
            <CardDescription>Critical</CardDescription>
            <CardTitle className="text-2xl text-destructive">{stats.criticalAlerts}</CardTitle>
          </CardHeader>
        </Card>
        <Card className={stats.unresolvedAlerts > 0 ? "border-amber-500" : ""}>
          <CardHeader className="pb-2">
            <CardDescription>Unresolved</CardDescription>
            <CardTitle className="text-2xl text-amber-500">{stats.unresolvedAlerts}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Failed Logins</CardDescription>
            <CardTitle className="text-2xl">{stats.failedLogins}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Admin Actions</CardDescription>
            <CardTitle className="text-2xl">{stats.adminActions}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="alerts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="alerts">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Security Alerts ({stats.totalAlerts})
          </TabsTrigger>
          <TabsTrigger value="audit">
            <Activity className="h-4 w-4 mr-2" />
            Audit Logs ({auditLogs?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="config">
            <Shield className="h-4 w-4 mr-2" />
            Thresholds
          </TabsTrigger>
        </TabsList>

        {/* Security Alerts Tab */}
        <TabsContent value="alerts">
          <Card>
            <CardHeader>
              <CardTitle>Security Alerts</CardTitle>
              <CardDescription>Security events detected by the monitoring system</CardDescription>
            </CardHeader>
            <CardContent>
              {alertsLoading ? (
                <div className="flex justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin" />
                </div>
              ) : securityAlerts?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                  <p>No security alerts in this time range</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {securityAlerts?.map((alert: ErrorEvent) => (
                    <div
                      key={alert.id}
                      className="flex items-start justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={getSeverityColor(alert.severity)}>
                            {alert.severity}
                          </Badge>
                          <span className="font-semibold">{alert.message}</span>
                          {alert.resolved && (
                            <Badge variant="outline" className="text-green-600">Resolved</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {alert.error_code && <span className="mr-3">Code: {alert.error_code}</span>}
                          {alert.function_name && <span className="mr-3">Function: {alert.function_name}</span>}
                          {alert.user_id && <span>User: {alert.user_id.slice(0, 8)}...</span>}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(alert.created_at!), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Logs Tab */}
        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle>Audit Logs</CardTitle>
              <CardDescription>All system activity and user actions</CardDescription>
            </CardHeader>
            <CardContent>
              {logsLoading ? (
                <div className="flex justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin" />
                </div>
              ) : auditLogs?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No audit logs in this time range</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {auditLogs?.map((log: AuditLog) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {getActionIcon(log.action)}
                        <div>
                          <span className="font-medium capitalize">
                            {log.action.replace(/_/g, " ")}
                          </span>
                          {log.resource_type && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              {log.resource_type}
                            </Badge>
                          )}
                          {log.user_id && (
                            <span className="text-xs text-muted-foreground ml-2">
                              by {log.user_id.slice(0, 8)}...
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Config Tab */}
        <TabsContent value="config">
          <Card>
            <CardHeader>
              <CardTitle>Security Thresholds</CardTitle>
              <CardDescription>Current detection thresholds for anomaly detection</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {securityConfig?.map((config: SecurityConfig) => (
                  <div key={config.id} className="p-4 border rounded-lg">
                    <h4 className="font-semibold capitalize">
                      {config.config_key.replace(/_/g, " ")}
                    </h4>
                    <p className="text-sm text-muted-foreground mb-2">{config.description}</p>
                    <pre className="text-xs bg-muted p-2 rounded overflow-auto">
                      {JSON.stringify(config.config_value, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
