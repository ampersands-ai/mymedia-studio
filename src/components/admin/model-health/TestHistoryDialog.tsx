import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FlowTimeline } from "./FlowTimeline";
import { useTestHistory } from "@/hooks/admin/model-health/useTestHistory";
import type { ModelHealthSummary } from "@/types/admin/model-health";
import { format } from "date-fns";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";

interface TestHistoryDialogProps {
  model: ModelHealthSummary | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const TestHistoryDialog = ({
  model,
  open,
  onOpenChange,
}: TestHistoryDialogProps) => {
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const limit = 10;

  const { data: history, isLoading } = useTestHistory({
    modelRecordId: model?.record_id,
    limit,
    offset: page * limit,
  });

  const selectedTest = history?.find((t) => t.id === selectedTestId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Test History: {model?.model_name}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 h-[600px]">
          {/* Left: Test list */}
          <div className="border-r pr-4">
            <ScrollArea className="h-full">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : !history || history.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No test history found
                </div>
              ) : (
                <div className="space-y-2">
                  {history.map((test) => (
                    <button
                      key={test.id}
                      onClick={() => setSelectedTestId(test.id)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        selectedTestId === test.id
                          ? "bg-accent border-primary"
                          : "hover:bg-accent/50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <Badge
                          variant={
                            test.status === "success"
                              ? "default"
                              : test.status === "failed"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {test.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(test.test_started_at), "MMM d, HH:mm")}
                        </span>
                      </div>
                      <div className="text-sm">
                        {test.total_latency_ms ? (
                          <span className="text-muted-foreground">
                            {(test.total_latency_ms / 1000).toFixed(1)}s
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                        {test.error_code && (
                          <span className="ml-2 text-xs text-destructive">
                            {test.error_code}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs text-muted-foreground">
                  Page {page + 1}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!history || history.length < limit}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </ScrollArea>
          </div>

          {/* Right: Test details */}
          <div>
            <ScrollArea className="h-full">
              {selectedTest ? (
                <div className="space-y-4">
                  {/* Test metadata */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold">Test Details</h3>
                      <Badge
                        variant={
                          selectedTest.status === "success"
                            ? "default"
                            : "destructive"
                        }
                      >
                        {selectedTest.status}
                      </Badge>
                    </div>
                    <div className="text-xs space-y-1">
                      <p>
                        <span className="text-muted-foreground">Started:</span>{" "}
                        {format(
                          new Date(selectedTest.test_started_at),
                          "PPpp"
                        )}
                      </p>
                      {selectedTest.test_completed_at && (
                        <p>
                          <span className="text-muted-foreground">
                            Completed:
                          </span>{" "}
                          {format(
                            new Date(selectedTest.test_completed_at),
                            "PPpp"
                          )}
                        </p>
                      )}
                      {selectedTest.total_latency_ms && (
                        <p>
                          <span className="text-muted-foreground">
                            Total Latency:
                          </span>{" "}
                          {(selectedTest.total_latency_ms / 1000).toFixed(2)}s
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Flow timeline */}
                  <FlowTimeline
                    steps={selectedTest.flow_steps}
                    totalLatency={selectedTest.total_latency_ms}
                  />

                  {/* Error details */}
                  {selectedTest.error_message && (
                    <div className="p-3 border border-destructive/50 rounded-lg bg-destructive/5">
                      <p className="text-sm font-semibold text-destructive mb-1">
                        Error: {selectedTest.error_code}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {selectedTest.error_message}
                      </p>
                    </div>
                  )}

                  {/* Output */}
                  {selectedTest.output_url && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold">Output</h4>
                      <a
                        href={selectedTest.output_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline"
                      >
                        View Output
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Select a test to view details
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
