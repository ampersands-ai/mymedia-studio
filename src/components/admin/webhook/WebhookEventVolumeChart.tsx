import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TimeSeriesData } from "@/hooks/admin/useWebhookAnalytics";
import { format } from "date-fns";

interface Props {
  timeSeries: TimeSeriesData[];
}

export const WebhookEventVolumeChart = ({ timeSeries }: Props) => {
  // Transform data for the chart - group by timestamp and provider
  const chartData = timeSeries.reduce((acc, item) => {
    const timestamp = format(new Date(item.timestamp), 'MMM dd HH:mm');
    const existing = acc.find(d => d.timestamp === timestamp);
    
    if (existing) {
      existing[`${item.provider}_${item.status}`] = (existing[`${item.provider}_${item.status}`] || 0) + item.eventCount;
    } else {
      acc.push({
        timestamp,
        [`${item.provider}_${item.status}`]: item.eventCount
      });
    }
    
    return acc;
  }, [] as any[]);

  // Get unique provider-status combinations for lines
  const providerStatusCombos = Array.from(
    new Set(timeSeries.map(item => `${item.provider}_${item.status}`))
  );

  const colors: Record<string, string> = {
    'primary_success': '#22c55e',
    'primary_failure': '#ef4444',
    'kie-ai_success': '#22c55e',
    'kie-ai_failure': '#ef4444',
    'midjourney_success': '#3b82f6',
    'midjourney_failure': '#f97316',
    'json2video_success': '#8b5cf6',
    'json2video_failure': '#ec4899',
    'dodo-payments_success': '#14b8a6',
    'dodo-payments_failure': '#f59e0b',
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Event Volume Over Time</CardTitle>
        <CardDescription>
          Webhook events grouped by provider and status
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="timestamp" 
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis />
            <Tooltip />
            <Legend />
            {providerStatusCombos.map(combo => (
              <Line
                key={combo}
                type="monotone"
                dataKey={combo}
                stroke={colors[combo] || '#888888'}
                strokeWidth={2}
                name={combo.replace('_', ' ').replace('-', ' ')}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
