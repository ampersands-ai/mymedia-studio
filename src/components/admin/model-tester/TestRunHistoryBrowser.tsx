import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  History,
  Download,
  Trash2,
  Bookmark,
  BookmarkCheck,
  Search,
  Eye,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import type { ExecutionFlow } from "@/lib/admin/enhancedExecutionTracker";
import { logger } from "@/lib/logger";

interface TestRunRecord {
  id: string;
  test_run_id: string;
  admin_user_id: string;
  model_record_id: string;
  model_name: string;
  model_provider: string;
  execution_data: ExecutionFlow;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  test_mode_enabled: boolean;
  skip_billing: boolean;
  duration_ms?: number;
  steps_completed: number;
  bookmarked: boolean;
  tags?: string[];
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface TestRunHistoryBrowserProps {
  onLoadRun?: (testRunId: string) => void;
  onCompareRuns?: (runIds: string[]) => void;
  className?: string;
}

export function TestRunHistoryBrowser({
  onLoadRun,
  onCompareRuns,
  className,
}: TestRunHistoryBrowserProps) {
  const [runs, setRuns] = useState<TestRunRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRuns, setSelectedRuns] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<{
    status?: string;
    model?: string;
    bookmarked?: boolean;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
  }>({});

  // Load test runs from database
  const loadRuns = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("test_execution_runs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      // Apply filters
      if (filter.status && filter.status !== "all") {
        query = query.eq("status", filter.status);
      }
      if (filter.model && filter.model !== "all") {
        query = query.eq("model_record_id", filter.model);
      }
      if (filter.bookmarked) {
        query = query.eq("bookmarked", true);
      }
      if (filter.dateFrom) {
        query = query.gte("created_at", filter.dateFrom);
      }
      if (filter.dateTo) {
        query = query.lte("created_at", filter.dateTo);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Parse execution_data from JSON and filter by search term
      let filteredData = (data || []).map((run: TestRunRecord) => ({
        ...run,
        execution_data: typeof run.execution_data === 'string' 
          ? JSON.parse(run.execution_data) 
          : run.execution_data
      })) as TestRunRecord[];
      
      if (filter.search) {
        const searchLower = filter.search.toLowerCase();
        filteredData = filteredData.filter(
          (run) =>
            run.model_name?.toLowerCase().includes(searchLower) ||
            run.model_provider?.toLowerCase().includes(searchLower) ||
            run.tags?.some((tag) => tag.toLowerCase().includes(searchLower)) ||
            run.notes?.toLowerCase().includes(searchLower)
        );
      }

      setRuns(filteredData);
    } catch (error) {
      logger.error("Error loading test runs", error instanceof Error ? error : new Error(String(error)));
    } finally {
      setLoading(false);
    }
  };

  // Load runs on mount and when filters change
  useEffect(() => {
    loadRuns();
  }, [filter]);

  // Toggle run selection
  const toggleSelection = (testRunId: string) => {
    const newSelection = new Set(selectedRuns);
    if (newSelection.has(testRunId)) {
      newSelection.delete(testRunId);
    } else {
      newSelection.add(testRunId);
    }
    setSelectedRuns(newSelection);
  };

  // Toggle bookmark
  const toggleBookmark = async (testRunId: string, currentBookmarked: boolean) => {
    try {
      const { error } = await supabase
        .from("test_execution_runs")
        .update({ bookmarked: !currentBookmarked })
        .eq("test_run_id", testRunId);

      if (error) throw error;

      // Update local state
      setRuns((prev) =>
        prev.map((run) =>
          run.test_run_id === testRunId
            ? { ...run, bookmarked: !currentBookmarked }
            : run
        )
      );
    } catch (error) {
      logger.error("Error toggling bookmark", error instanceof Error ? error : new Error(String(error)));
    }
  };

  // Delete run
  const deleteRun = async (testRunId: string) => {
    if (!confirm("Are you sure you want to delete this test run?")) return;

    try {
      // Delete logs first (foreign key constraint)
      await supabase
        .from("test_execution_logs")
        .delete()
        .eq("test_run_id", testRunId);

      // Delete snapshots
      await supabase
        .from("test_execution_snapshots")
        .delete()
        .eq("test_run_id", testRunId);

      // Delete run
      const { error } = await supabase
        .from("test_execution_runs")
        .delete()
        .eq("test_run_id", testRunId);

      if (error) throw error;

      // Remove from local state
      setRuns((prev) => prev.filter((run) => run.test_run_id !== testRunId));
      selectedRuns.delete(testRunId);
      setSelectedRuns(new Set(selectedRuns));
    } catch (error) {
      logger.error("Error deleting test run", error instanceof Error ? error : new Error(String(error)));
    }
  };

  // Export run
  const exportRun = (run: TestRunRecord) => {
    const exportData = {
      metadata: {
        test_run_id: run.test_run_id,
        model_name: run.model_name,
        model_provider: run.model_provider,
        created_at: run.created_at,
        status: run.status,
        tags: run.tags,
        notes: run.notes,
      },
      execution_data: run.execution_data,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `test-run-${run.model_name}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Compare selected runs
  const compareSelected = () => {
    if (selectedRuns.size < 2) {
      alert("Please select at least 2 runs to compare");
      return;
    }
    if (selectedRuns.size > 4) {
      alert("You can compare up to 4 runs at a time");
      return;
    }
    onCompareRuns?.(Array.from(selectedRuns));
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800 border-green-300";
      case "failed":
        return "bg-red-100 text-red-800 border-red-300";
      case "running":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "cancelled":
        return "bg-gray-100 text-gray-800 border-gray-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  // Format duration
  const formatDuration = (ms?: number) => {
    if (!ms) return "N/A";
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  return (
    <Card className={cn("flex flex-col", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Test Run History</span>
          <Badge variant="secondary" className="text-xs">
            {runs.length} runs
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={loadRuns}
            disabled={loading}
            className="h-7 text-xs"
          >
            <RefreshCw className={cn("h-3 w-3 mr-1", loading && "animate-spin")} />
            Refresh
          </Button>
          {selectedRuns.size >= 2 && (
            <Button
              variant="default"
              size="sm"
              onClick={compareSelected}
              className="h-7 text-xs"
            >
              Compare ({selectedRuns.size})
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/10">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <Input
            placeholder="Search by model, tags, notes..."
            value={filter.search || ""}
            onChange={(e) => setFilter({ ...filter, search: e.target.value })}
            className="pl-9 h-8 text-xs"
          />
        </div>

        <Select
          value={filter.status || "all"}
          onValueChange={(value) =>
            setFilter({ ...filter, status: value === "all" ? undefined : value })
          }
        >
          <SelectTrigger className="w-[120px] h-8 text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="running">Running</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant={filter.bookmarked ? "default" : "outline"}
          size="sm"
          onClick={() =>
            setFilter({ ...filter, bookmarked: filter.bookmarked ? undefined : true })
          }
          className="h-8 text-xs"
        >
          <Bookmark className="h-3 w-3 mr-1" />
          Bookmarked
        </Button>
      </div>

      {/* Table */}
      <ScrollArea className="flex-1" style={{ maxHeight: "500px" }}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]">
                <input
                  type="checkbox"
                  checked={selectedRuns.size === runs.length && runs.length > 0}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedRuns(new Set(runs.map((r) => r.test_run_id)));
                    } else {
                      setSelectedRuns(new Set());
                    }
                  }}
                />
              </TableHead>
              <TableHead>Model</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Steps</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  Loading test runs...
                </TableCell>
              </TableRow>
            ) : runs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No test runs found
                </TableCell>
              </TableRow>
            ) : (
              runs.map((run) => (
                <TableRow
                  key={run.test_run_id}
                  className={cn(
                    "cursor-pointer hover:bg-muted/50",
                    selectedRuns.has(run.test_run_id) && "bg-muted/30"
                  )}
                  onClick={() => toggleSelection(run.test_run_id)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedRuns.has(run.test_run_id)}
                      onChange={() => toggleSelection(run.test_run_id)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <span className="font-medium text-sm">{run.model_name}</span>
                      <span className="text-xs text-muted-foreground">
                        {run.model_provider}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getStatusColor(run.status)}>
                      {run.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {run.steps_completed || 0} / {run.execution_data?.steps?.filter(s => s.stepType === 'main').length || 0}
                  </TableCell>
                  <TableCell className="text-sm">{formatDuration(run.duration_ms)}</TableCell>
                  <TableCell className="text-sm">
                    {new Date(run.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {run.tags?.slice(0, 2).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {run.tags && run.tags.length > 2 && (
                        <Badge variant="secondary" className="text-xs">
                          +{run.tags.length - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleBookmark(run.test_run_id, run.bookmarked)}
                        className="h-7 w-7 p-0"
                      >
                        {run.bookmarked ? (
                          <BookmarkCheck className="h-3.5 w-3.5 text-yellow-600" />
                        ) : (
                          <Bookmark className="h-3.5 w-3.5" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onLoadRun?.(run.test_run_id)}
                        className="h-7 w-7 p-0"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => exportRun(run)}
                        className="h-7 w-7 p-0"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteRun(run.test_run_id)}
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </ScrollArea>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2 border-t bg-muted/10 text-xs text-muted-foreground">
        <div>
          {selectedRuns.size > 0 && (
            <span>{selectedRuns.size} run{selectedRuns.size > 1 ? "s" : ""} selected</span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span>
            <span className="text-green-600 font-medium">
              {runs.filter((r) => r.status === "completed").length}
            </span>{" "}
            completed
          </span>
          <span>
            <span className="text-red-600 font-medium">
              {runs.filter((r) => r.status === "failed").length}
            </span>{" "}
            failed
          </span>
          <span>
            <span className="text-yellow-600 font-medium">
              {runs.filter((r) => r.bookmarked).length}
            </span>{" "}
            bookmarked
          </span>
        </div>
      </div>
    </Card>
  );
}
