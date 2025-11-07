import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useAlertStats } from "@/hooks/admin/useAlertHistory";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, Activity } from "lucide-react";

export const AlertTrendsChart = () => {
  const { data: stats, isLoading } = useAlertStats(7);

  if (isLoading || !stats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Alert Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center text-muted-foreground">
            Loading trends...
          </div>
        </CardContent>
      </Card>
    );
  }

  const recentTrend = stats.trendData.slice(-2);
  const trendDirection =
    recentTrend.length === 2 && recentTrend[1].total > recentTrend[0].total ? 'up' : 'down';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Alert Trends (Last 7 Days)</CardTitle>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              {trendDirection === 'up' ? (
                <TrendingUp className="h-4 w-4 text-destructive" />
              ) : (
                <TrendingDown className="h-4 w-4 text-green-500" />
              )}
              <span className="text-muted-foreground">Trend</span>
            </div>
            <div className="flex items-center gap-1">
              <Activity className="h-4 w-4" />
              <span className="font-semibold">{stats.totalAlerts}</span>
              <span className="text-muted-foreground">total</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="timeline" className="space-y-4">
          <TabsList>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="severity">By Severity</TabsTrigger>
            <TabsTrigger value="type">By Type</TabsTrigger>
          </TabsList>

          <TabsContent value="timeline" className="space-y-4">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stats.trendData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="total" stroke="hsl(var(--primary))" name="Total" />
                <Line
                  type="monotone"
                  dataKey="critical"
                  stroke="hsl(var(--destructive))"
                  name="Critical"
                />
                <Line type="monotone" dataKey="warning" stroke="hsl(var(--warning))" name="Warning" />
                <Line type="monotone" dataKey="info" stroke="hsl(var(--muted-foreground))" name="Info" />
              </LineChart>
            </ResponsiveContainer>
          </TabsContent>

          <TabsContent value="severity" className="space-y-4">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={Object.entries(stats.bySeverity).map(([severity, count]) => ({
                  severity,
                  count,
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="severity" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                  }}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </TabsContent>

          <TabsContent value="type" className="space-y-4">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={Object.entries(stats.byType).map(([type, count]) => ({
                  type,
                  count,
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="type" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                  }}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </TabsContent>
        </Tabs>

        <div className="grid grid-cols-4 gap-4 mt-6 pt-6 border-t">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Total Alerts</p>
            <p className="text-2xl font-bold">{stats.totalAlerts}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Resolved</p>
            <p className="text-2xl font-bold text-green-500">{stats.resolvedAlerts}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Unresolved</p>
            <p className="text-2xl font-bold text-destructive">{stats.unresolvedAlerts}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Avg Resolution</p>
            <p className="text-2xl font-bold">
              {stats.avgResolutionTime > 0
                ? `${Math.floor(stats.avgResolutionTime / 60000)}m`
                : 'N/A'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
