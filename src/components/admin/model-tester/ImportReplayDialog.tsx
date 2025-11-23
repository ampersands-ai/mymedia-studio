import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, FileJson, Play, X, Check, AlertCircle } from "lucide-react";
import type { ExecutionFlow } from "@/lib/admin/enhancedExecutionTracker";
import { cn } from "@/lib/utils";

interface ImportedTestRun {
  metadata: {
    test_run_id: string;
    model_name: string;
    model_provider: string;
    created_at: string;
    status: string;
    tags?: string[];
    notes?: string;
  };
  execution_data: ExecutionFlow;
}

interface ImportReplayDialogProps {
  onReplay?: (executionData: ExecutionFlow) => void;
  children?: React.ReactNode;
}

export function ImportReplayDialog({
  onReplay,
  children,
}: ImportReplayDialogProps) {
  const [open, setOpen] = useState(false);
  const [importedRun, setImportedRun] = useState<ImportedTestRun | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [validationStatus, setValidationStatus] = useState<{
    isValid: boolean;
    warnings: string[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setImportedRun(null);
    setValidationStatus(null);

    try {
      // Read file
      const text = await file.text();
      const data = JSON.parse(text) as ImportedTestRun;

      // Validate structure
      const validation = validateImportedRun(data);
      setValidationStatus(validation);

      if (validation.isValid) {
        setImportedRun(data);
      } else {
        setError("Invalid test run file format");
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? `Failed to parse file: ${err.message}`
          : "Failed to parse file"
      );
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Validate imported run structure
  const validateImportedRun = (
    data: any
  ): { isValid: boolean; warnings: string[] } => {
    const warnings: string[] = [];

    // Check required fields
    if (!data.metadata || !data.execution_data) {
      return { isValid: false, warnings: ["Missing required fields"] };
    }

    // Check metadata
    if (!data.metadata.test_run_id) {
      warnings.push("Missing test_run_id in metadata");
    }
    if (!data.metadata.model_name) {
      warnings.push("Missing model_name in metadata");
    }

    // Check execution data
    if (!data.execution_data.steps || !Array.isArray(data.execution_data.steps)) {
      return { isValid: false, warnings: ["Invalid execution steps"] };
    }

    // Check if execution was successful
    if (data.execution_data.status === "failed") {
      warnings.push("This test run failed - replay may not work as expected");
    }

    // Check for test mode
    if (!data.execution_data.testModeEnabled) {
      warnings.push(
        "This run was not in test mode - replay will force test mode to prevent billing"
      );
    }

    return { isValid: true, warnings };
  };

  // Replay execution
  const handleReplay = () => {
    if (!importedRun) return;

    // Force test mode for replays to prevent accidental billing
    const executionData = {
      ...importedRun.execution_data,
      testModeEnabled: true,
      skipBilling: true,
      // Generate new IDs for replay
      id: crypto.randomUUID(),
      testRunId: crypto.randomUUID(),
      // Reset status
      status: "pending" as const,
      currentStepIndex: -1,
      // Clear timestamps
      startedAt: undefined,
      completedAt: undefined,
      // Reset step statuses
      steps: importedRun.execution_data.steps.map((step) => ({
        ...step,
        status: "pending" as const,
        startedAt: undefined,
        completedAt: undefined,
        duration: undefined,
        error: undefined,
      })),
    };

    onReplay?.(executionData);
    setOpen(false);
    setImportedRun(null);
    setError(null);
    setValidationStatus(null);
  };

  // Clear import
  const handleClear = () => {
    setImportedRun(null);
    setError(null);
    setValidationStatus(null);
  };

  // Format date
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Import & Replay
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Import & Replay Test Run</DialogTitle>
          <DialogDescription>
            Upload a previously exported test run JSON file to inspect or replay the
            execution.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Upload */}
          {!importedRun && (
            <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed rounded-lg">
              <FileJson className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground mb-4">
                Upload a test run JSON file
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload">
                <Button variant="outline" asChild>
                  <span>
                    <Upload className="h-4 w-4 mr-2" />
                    Choose File
                  </span>
                </Button>
              </label>
            </div>
          )}

          {/* Error */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Validation Warnings */}
          {validationStatus && validationStatus.warnings.length > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-semibold mb-2">Warnings:</div>
                <ul className="list-disc list-inside space-y-1">
                  {validationStatus.warnings.map((warning, index) => (
                    <li key={index} className="text-sm">
                      {warning}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Imported Run Preview */}
          {importedRun && (
            <Card className="p-4">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">
                    {importedRun.metadata.model_name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {importedRun.metadata.model_provider}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={handleClear}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <Separator className="my-4" />

              {/* Metadata */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Status</p>
                  <Badge
                    variant="outline"
                    className={cn(
                      importedRun.metadata.status === "completed" &&
                        "bg-green-100 text-green-800",
                      importedRun.metadata.status === "failed" &&
                        "bg-red-100 text-red-800"
                    )}
                  >
                    {importedRun.metadata.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Created</p>
                  <p className="text-sm">{formatDate(importedRun.metadata.created_at)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Test Run ID</p>
                  <p className="text-xs font-mono">
                    {importedRun.metadata.test_run_id.slice(0, 8)}...
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Steps</p>
                  <p className="text-sm">
                    {importedRun.execution_data.steps.filter(s => s.stepType === "main").length} main steps
                  </p>
                </div>
              </div>

              {/* Tags */}
              {importedRun.metadata.tags && importedRun.metadata.tags.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs text-muted-foreground mb-2">Tags</p>
                  <div className="flex flex-wrap gap-2">
                    {importedRun.metadata.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {importedRun.metadata.notes && (
                <div className="mb-4">
                  <p className="text-xs text-muted-foreground mb-2">Notes</p>
                  <p className="text-sm bg-muted/30 p-2 rounded">
                    {importedRun.metadata.notes}
                  </p>
                </div>
              )}

              <Separator className="my-4" />

              {/* Execution Steps Preview */}
              <div>
                <p className="text-xs text-muted-foreground mb-2">Execution Steps</p>
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2">
                    {importedRun.execution_data.steps
                      .filter((s) => s.stepType === "main")
                      .map((step, index) => (
                        <div
                          key={step.id}
                          className="flex items-center gap-2 p-2 bg-muted/30 rounded text-sm"
                        >
                          <span className="text-xs text-muted-foreground w-6">
                            {index + 1}.
                          </span>
                          <span className="flex-1">{step.stepName}</span>
                          {step.status === "completed" && (
                            <Check className="h-4 w-4 text-green-600" />
                          )}
                          {step.status === "failed" && (
                            <X className="h-4 w-4 text-red-600" />
                          )}
                          {step.duration && (
                            <span className="text-xs text-muted-foreground">
                              {step.duration}ms
                            </span>
                          )}
                        </div>
                      ))}
                  </div>
                </ScrollArea>
              </div>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          {importedRun && (
            <Button onClick={handleReplay}>
              <Play className="h-4 w-4 mr-2" />
              Replay Execution
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
