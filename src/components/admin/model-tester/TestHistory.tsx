import { Button } from "@/components/ui/button";
import { TestRunHistoryBrowser } from "./TestRunHistoryBrowser";
import { ComparisonViewer } from "./ComparisonViewer";
import type { ExecutionFlow } from "@/lib/admin/enhancedExecutionTracker";

interface TestHistoryProps {
  showHistoryBrowser: boolean;
  showComparison: boolean;
  comparisonRuns: ExecutionFlow[];
  onCloseHistory: () => void;
  onCloseComparison: () => void;
  onLoadRun: (testRunId: string) => Promise<void>;
  onCompareRuns: (runIds: string[]) => Promise<void>;
}

export function TestHistory({
  showHistoryBrowser,
  showComparison,
  comparisonRuns,
  onCloseHistory,
  onCloseComparison,
  onLoadRun,
  onCompareRuns
}: TestHistoryProps) {
  return (
    <>
      {showHistoryBrowser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6">
          <div className="bg-background rounded-lg max-w-6xl w-full max-h-[90vh] overflow-auto">
            <TestRunHistoryBrowser
              onLoadRun={onLoadRun}
              onCompareRuns={onCompareRuns}
              className="border-0"
            />
            <div className="p-4 border-t flex justify-end">
              <Button variant="outline" onClick={onCloseHistory}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {showComparison && comparisonRuns.length > 0 && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6">
          <div className="bg-background rounded-lg max-w-7xl w-full max-h-[90vh] overflow-auto">
            <ComparisonViewer runs={comparisonRuns} onClose={onCloseComparison} />
          </div>
        </div>
      )}
    </>
  );
}
