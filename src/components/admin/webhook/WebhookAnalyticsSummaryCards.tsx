import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { WebhookAnalyticsSummary } from "@/hooks/admin/useWebhookAnalytics";

interface Props {
  summary: WebhookAnalyticsSummary;
}

export const WebhookAnalyticsSummaryCards = ({ summary }: Props) => {
  const cards = [
    {
      title: "Total Events",
      value: summary.totalEvents.toLocaleString(),
      icon: Activity,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10"
    },
    {
      title: "Success Rate",
      value: `${summary.successRate.toFixed(1)}%`,
      icon: CheckCircle2,
      color: summary.successRate >= 95 ? "text-green-500" : summary.successRate >= 90 ? "text-yellow-500" : "text-red-500",
      bgColor: summary.successRate >= 95 ? "bg-green-500/10" : summary.successRate >= 90 ? "bg-yellow-500/10" : "bg-red-500/10"
    },
    {
      title: "Avg Duration",
      value: `${summary.avgDuration}ms`,
      icon: Clock,
      color: summary.avgDuration < 1000 ? "text-green-500" : summary.avgDuration < 3000 ? "text-yellow-500" : "text-red-500",
      bgColor: summary.avgDuration < 1000 ? "bg-green-500/10" : summary.avgDuration < 3000 ? "bg-yellow-500/10" : "bg-red-500/10"
    },
    {
      title: "P95 Duration",
      value: `${summary.p95Duration}ms`,
      icon: Clock,
      color: summary.p95Duration < 2000 ? "text-green-500" : summary.p95Duration < 5000 ? "text-yellow-500" : "text-red-500",
      bgColor: summary.p95Duration < 2000 ? "bg-green-500/10" : summary.p95Duration < 5000 ? "bg-yellow-500/10" : "bg-red-500/10"
    }
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {card.title}
            </CardTitle>
            <div className={`${card.bgColor} p-2 rounded-lg`}>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
