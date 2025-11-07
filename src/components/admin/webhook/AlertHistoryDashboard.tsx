import { useState } from "react";
import { useAlertHistory } from "@/hooks/admin/useAlertHistory";
import { AlertHistoryTable } from "./AlertHistoryTable";
import { AlertHistoryFilters } from "./AlertHistoryFilters";
import { AlertTrendsChart } from "./AlertTrendsChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const AlertHistoryDashboard = () => {
  const [filters, setFilters] = useState({});
  const { alerts, isLoading, resolveAlert, isResolving } = useAlertHistory(filters);

  const handleResolve = (id: string, notes?: string) => {
    resolveAlert({ id, notes });
  };

  return (
    <div className="space-y-6">
      {/* Trends Chart */}
      <AlertTrendsChart />

      {/* Filters */}
      <AlertHistoryFilters filters={filters} onFilterChange={setFilters} />

      {/* Alert History Table */}
      <Card>
        <CardHeader>
          <CardTitle>Alert History</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading alert history...</div>
          ) : (
            <AlertHistoryTable alerts={alerts} onResolve={handleResolve} isResolving={isResolving} />
          )}
        </CardContent>
      </Card>
    </div>
  );
};
