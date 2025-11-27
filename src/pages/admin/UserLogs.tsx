import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

export default function UserLogs() {
  const [searchEmail, setSearchEmail] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [timeRange, setTimeRange] = useState<string>("24h");

  const { data: errorLogs, isLoading, refetch } = useQuery({
    queryKey: ["user-error-logs", severityFilter, timeRange],
    queryFn: async () => {
      let query = supabase
        .from("user_error_logs")
        .select(`
          *,
          profiles:user_id (email, full_name)
        `)
        .order("created_at", { ascending: false })
        .limit(100);

      if (severityFilter !== "all") {
        query = query.eq("severity", severityFilter);
      }

      // Time range filter
      if (timeRange === "24h") {
        const yesterday = new Date();
        yesterday.setHours(yesterday.getHours() - 24);
        query = query.gte("created_at", yesterday.toISOString());
      } else if (timeRange === "7d") {
        const lastWeek = new Date();
        lastWeek.setDate(lastWeek.getDate() - 7);
        query = query.gte("created_at", lastWeek.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const filteredLogs = errorLogs?.filter((log: Record<string, unknown>) => {
    if (!searchEmail) return true;
    const email = (log as any).profiles?.email?.toLowerCase() || "";
    return email.includes(searchEmail.toLowerCase());
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "text-destructive font-bold";
      case "high": return "text-orange-600 font-semibold";
      case "medium": return "text-yellow-600";
      case "low": return "text-green-600";
      default: return "";
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">User Logs</h1>
        <p className="text-muted-foreground">Monitor errors and user activity across the platform</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Error Logs</CardTitle>
          <CardDescription>View and manage application errors</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by user email..."
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Time Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">Last 24 Hours</SelectItem>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading error logs...</div>
          ) : filteredLogs && filteredLogs.length > 0 ? (
            <div className="space-y-4">
              {filteredLogs.map((log: { id: string; severity: string; route_name: string; message: string; created_at: string; stack_trace?: string; user_id?: string; context?: Record<string, unknown> }) => (
                <div key={log.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={getSeverityColor(log.severity)}>
                          {log.severity.toUpperCase()}
                        </span>
                        <span className="text-sm text-muted-foreground">•</span>
                        <span className="font-mono text-sm">{log.route_name}</span>
                      </div>
                      <p className="text-sm font-medium">{(log as any).error_message || log.message}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>User: {(log as any).profiles?.email || 'Unknown'}</span>
                        <span>•</span>
                        <span>{format(new Date(log.created_at), 'MMM d, yyyy HH:mm')}</span>
                        {(log as any).is_resolved && (
                          <>
                            <span>•</span>
                            <span className="text-green-600">Resolved</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  {(log as any).error_stack && (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                        View stack trace
                      </summary>
                      <pre className="mt-2 p-2 bg-muted rounded overflow-auto max-h-32">
                        {(log as any).error_stack}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              No errors found for the selected filters
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
