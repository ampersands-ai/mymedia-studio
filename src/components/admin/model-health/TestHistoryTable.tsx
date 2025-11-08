import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useTestHistory } from "@/hooks/admin/model-health/useTestHistory";
import { format } from "date-fns";
import { Download, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

interface TestHistoryTableProps {
  modelRecordId?: string;
}

export const TestHistoryTable = ({ modelRecordId }: TestHistoryTableProps) => {
  const [page, setPage] = useState(0);
  const limit = 20;

  const { data: history, isLoading } = useTestHistory({
    modelRecordId,
    limit,
    offset: page * limit,
  });

  const exportToCSV = () => {
    if (!history || history.length === 0) return;

    const headers = [
      "Time",
      "Model",
      "Provider",
      "Status",
      "Latency (s)",
      "Credits Required",
      "Error Code",
      "Error Message",
    ];

    const rows = history.map((test) => [
      format(new Date(test.test_started_at), "yyyy-MM-dd HH:mm:ss"),
      test.ai_models.model_name,
      test.ai_models.provider,
      test.status,
      test.total_latency_ms ? (test.total_latency_ms / 1000).toFixed(2) : "-",
      test.credits_required || "-",
      test.error_code || "-",
      test.error_message || "-",
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `test-history-${Date.now()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportToJSON = () => {
    if (!history || history.length === 0) return;

    const json = JSON.stringify(history, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `test-history-${Date.now()}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">Recent Test Results</h3>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={exportToCSV}
            disabled={!history || history.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportToJSON}
            disabled={!history || history.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            JSON
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : !history || history.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No test history found
        </div>
      ) : (
        <>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Latency</TableHead>
                  <TableHead>Credits</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((test) => (
                  <TableRow key={test.id}>
                    <TableCell className="text-xs">
                      {format(new Date(test.test_started_at), "MMM d, HH:mm")}
                    </TableCell>
                    <TableCell className="text-xs font-medium">
                      {test.ai_models.model_name}
                    </TableCell>
                    <TableCell className="text-xs">
                      {test.ai_models.provider}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          test.status === "success"
                            ? "default"
                            : test.status === "failed"
                            ? "destructive"
                            : "secondary"
                        }
                        className="text-xs"
                      >
                        {test.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {test.total_latency_ms
                        ? `${(test.total_latency_ms / 1000).toFixed(1)}s`
                        : "-"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {test.credits_required || "-"}
                    </TableCell>
                    <TableCell className="text-xs text-destructive">
                      {test.error_code || "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {page + 1}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={!history || history.length < limit}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </>
      )}
    </Card>
  );
};
