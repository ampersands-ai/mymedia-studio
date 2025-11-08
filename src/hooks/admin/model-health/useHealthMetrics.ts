import { useMemo } from "react";
import type { ModelHealthSummary, SystemHealthMetrics } from "@/types/admin/model-health";

export const useHealthMetrics = (healthData: ModelHealthSummary[] | undefined): SystemHealthMetrics => {
  return useMemo(() => {
    if (!healthData || healthData.length === 0) {
      return {
        totalModels: 0,
        activeModels: 0,
        testedLast24h: 0,
        successRate: 0,
        avgLatency: 0,
        failedModels: 0,
      };
    }

    const totalModels = healthData.length;
    const activeModels = healthData.filter(m => m.is_active).length;
    const testedLast24h = healthData.filter(m => m.last_test_at && 
      new Date(m.last_test_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)
    ).length;

    const testedModels = healthData.filter(m => m.total_tests_24h > 0);
    const successRate = testedModels.length > 0
      ? testedModels.reduce((sum, m) => sum + (m.success_rate_percent_24h || 0), 0) / testedModels.length
      : 0;

    const modelsWithLatency = healthData.filter(m => m.avg_latency_ms !== null);
    const avgLatency = modelsWithLatency.length > 0
      ? modelsWithLatency.reduce((sum, m) => sum + (m.avg_latency_ms || 0), 0) / modelsWithLatency.length / 1000
      : 0;

    const failedModels = healthData.filter(m => 
      m.success_rate_percent_24h !== null && m.success_rate_percent_24h < 80
    ).length;

    return {
      totalModels,
      activeModels,
      testedLast24h,
      successRate: Math.round(successRate * 10) / 10,
      avgLatency: Math.round(avgLatency * 10) / 10,
      failedModels,
    };
  }, [healthData]);
};
