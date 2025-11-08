import { Card } from "@/components/ui/card";
import type { SystemHealthMetrics } from "@/types/admin/model-health";

interface ModelHealthHeaderProps {
  metrics: SystemHealthMetrics;
}

export const ModelHealthHeader = ({ metrics }: ModelHealthHeaderProps) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      <Card className="p-4">
        <div className="text-sm text-muted-foreground">Total Models</div>
        <div className="text-2xl font-bold">{metrics.totalModels}</div>
      </Card>
      
      <Card className="p-4">
        <div className="text-sm text-muted-foreground">Active</div>
        <div className="text-2xl font-bold">{metrics.activeModels}</div>
      </Card>
      
      <Card className="p-4">
        <div className="text-sm text-muted-foreground">Success Rate</div>
        <div className="text-2xl font-bold">{metrics.successRate}%</div>
      </Card>
      
      <Card className="p-4">
        <div className="text-sm text-muted-foreground">Avg Latency</div>
        <div className="text-2xl font-bold">{metrics.avgLatency}s</div>
      </Card>
      
      <Card className="p-4">
        <div className="text-sm text-muted-foreground">Failed Models</div>
        <div className="text-2xl font-bold text-destructive">{metrics.failedModels}</div>
      </Card>
      
      <Card className="p-4">
        <div className="text-sm text-muted-foreground">Tested (24h)</div>
        <div className="text-2xl font-bold">{metrics.testedLast24h}</div>
      </Card>
    </div>
  );
};
