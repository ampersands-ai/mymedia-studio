import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProviderStat } from "@/hooks/admin/useWebhookMonitoring";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface WebhookChartsProps {
  providerStats: ProviderStat[];
}

export const WebhookCharts = ({ providerStats }: WebhookChartsProps) => {
  const chartData = providerStats.map(stat => ({
    name: stat.model_id.split('/')[1] || stat.model_id,
    success: stat.success_count,
    failed: stat.fail_count,
    failRate: stat.failure_rate,
  })).slice(0, 8); // Top 8 providers

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Provider Success vs Failures</CardTitle>
          <CardDescription>Success and failure counts by provider (24h)</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="name" 
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis 
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px'
                }}
              />
              <Legend />
              <Bar dataKey="success" fill="hsl(142 76% 36%)" name="Success" />
              <Bar dataKey="failed" fill="hsl(0 84% 60%)" name="Failed" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Failure Rate by Provider</CardTitle>
          <CardDescription>Percentage of failed webhooks per provider</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="name" 
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis 
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                label={{ value: '% Failed', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px'
                }}
                formatter={(value) => `${value}%`}
              />
              <Bar 
                dataKey="failRate" 
                fill="hsl(24 95% 53%)" 
                name="Failure Rate"
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};
