import { Card } from "@/components/ui/card";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { ModelHealthSummary } from "@/types/admin/model-health";

interface PerformanceChartsProps {
  models: ModelHealthSummary[];
}

const COLORS = ["hsl(var(--primary))", "hsl(var(--destructive))", "hsl(var(--warning))", "hsl(var(--success))"];

export const PerformanceCharts = ({ models }: PerformanceChartsProps) => {
  // Provider comparison data
  const providerData = models.reduce((acc, model) => {
    const existing = acc.find((p) => p.provider === model.provider);
    if (existing) {
      existing.avgSuccessRate += model.success_rate_percent_24h || 0;
      existing.count += 1;
    } else {
      acc.push({
        provider: model.provider,
        avgSuccessRate: model.success_rate_percent_24h || 0,
        count: 1,
      });
    }
    return acc;
  }, [] as Array<{ provider: string; avgSuccessRate: number; count: number }>);

  const providerComparison = providerData.map((p) => ({
    provider: p.provider,
    successRate: (p.avgSuccessRate / p.count).toFixed(1),
  }));

  // Error breakdown (simplified)
  const errorData = [
    { name: "Success", value: models.filter(m => (m.success_rate_percent_24h || 0) >= 95).length },
    { name: "Warning", value: models.filter(m => {
      const rate = m.success_rate_percent_24h || 0;
      return rate >= 80 && rate < 95;
    }).length },
    { name: "Error", value: models.filter(m => (m.success_rate_percent_24h || 0) < 80).length },
  ].filter(d => d.value > 0);

  // Latency distribution
  const latencyBuckets = [
    { range: "0-10s", min: 0, max: 10000, count: 0 },
    { range: "10-30s", min: 10000, max: 30000, count: 0 },
    { range: "30-60s", min: 30000, max: 60000, count: 0 },
    { range: "60s+", min: 60000, max: Infinity, count: 0 },
  ];

  models.forEach((model) => {
    const latency = model.avg_latency_ms || 0;
    const bucket = latencyBuckets.find(
      (b) => latency >= b.min && latency < b.max
    );
    if (bucket) bucket.count++;
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Provider Comparison */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold mb-4">Provider Success Rate</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={providerComparison}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="provider" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
              }}
            />
            <Bar dataKey="successRate" fill="hsl(var(--primary))" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Status Breakdown */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold mb-4">Status Breakdown</h3>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={errorData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) =>
                `${name}: ${(percent * 100).toFixed(0)}%`
              }
              outerRadius={80}
              fill="hsl(var(--primary))"
              dataKey="value"
            >
              {errorData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </Card>

      {/* Latency Distribution */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold mb-4">Latency Distribution</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={latencyBuckets}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="range" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
              }}
            />
            <Bar dataKey="count" fill="hsl(var(--success))" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Models by Type */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold mb-4">Models by Content Type</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart
            data={models
              .reduce((acc, model) => {
                const existing = acc.find((c) => c.type === model.content_type);
                if (existing) {
                  existing.count += 1;
                } else {
                  acc.push({ type: model.content_type, count: 1 });
                }
                return acc;
              }, [] as Array<{ type: string; count: number }>)}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="type" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
              }}
            />
            <Bar dataKey="count" fill="hsl(var(--warning))" />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
};
