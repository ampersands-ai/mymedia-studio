import { useEffect, useRef, useState } from "react";
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
import { Terminal, Download, X, Search, Filter } from "lucide-react";
import type { ExecutionLog, LogLevel } from "@/lib/admin/enhancedExecutionTracker";
import { cn } from "@/lib/utils";

interface LogStreamViewerProps {
  logs: ExecutionLog[];
  autoScroll?: boolean;
  maxHeight?: string;
  showFilters?: boolean;
}

export function LogStreamViewer({
  logs,
  autoScroll = true,
  maxHeight = "400px",
  showFilters = true,
}: LogStreamViewerProps) {
  const [filter, setFilter] = useState<{
    level?: LogLevel;
    search?: string;
    context?: string;
  }>({});
  const [isExpanded, setIsExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  // Filter logs
  const filteredLogs = logs.filter((log) => {
    if (filter.level && log.logLevel !== filter.level) return false;
    if (filter.search && !log.message.toLowerCase().includes(filter.search.toLowerCase())) return false;
    if (filter.context && log.executionContext !== filter.context) return false;
    return true;
  });

  // Download logs as file
  const downloadLogs = () => {
    const logText = filteredLogs
      .map((log) => {
        const timestamp = new Date(log.timestamp).toISOString();
        return `[${timestamp}] [${log.logLevel.toUpperCase()}] [${log.executionContext}] ${log.message}`;
      })
      .join("\n");

    const blob = new Blob([logText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `execution-logs-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Clear filters
  const clearFilters = () => {
    setFilter({});
  };

  // Get log level color
  const getLogLevelColor = (level: LogLevel): string => {
    switch (level) {
      case "debug":
        return "text-gray-400";
      case "info":
        return "text-blue-400";
      case "warn":
        return "text-yellow-400";
      case "error":
        return "text-red-400";
      case "critical":
        return "text-red-600 font-bold";
      default:
        return "text-gray-400";
    }
  };

  // Get log level badge variant
  const getLogLevelBadge = (level: LogLevel) => {
    switch (level) {
      case "debug":
        return "secondary";
      case "info":
        return "outline";
      case "warn":
        return "default";
      case "error":
      case "critical":
        return "destructive";
      default:
        return "secondary";
    }
  };

  // Get context color
  const getContextColor = (context: string): string => {
    switch (context) {
      case "client":
        return "bg-blue-500/10 text-blue-700 border-blue-500/20";
      case "edge_function":
        return "bg-purple-500/10 text-purple-700 border-purple-500/20";
      case "webhook":
        return "bg-green-500/10 text-green-700 border-green-500/20";
      case "database":
        return "bg-orange-500/10 text-orange-700 border-orange-500/20";
      default:
        return "bg-gray-500/10 text-gray-700 border-gray-500/20";
    }
  };

  return (
    <Card className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Execution Logs</span>
          <Badge variant="secondary" className="text-xs">
            {filteredLogs.length} / {logs.length}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={downloadLogs}
            className="h-7 text-xs"
          >
            <Download className="h-3 w-3 mr-1" />
            Export
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-7 text-xs"
          >
            {isExpanded ? "Collapse" : "Expand"}
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/10">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input
              placeholder="Search logs..."
              value={filter.search || ""}
              onChange={(e) => setFilter({ ...filter, search: e.target.value })}
              className="pl-9 h-8 text-xs"
            />
          </div>

          <Select
            value={filter.level || "all"}
            onValueChange={(value) =>
              setFilter({ ...filter, level: value === "all" ? undefined : value as LogLevel })
            }
          >
            <SelectTrigger className="w-[120px] h-8 text-xs">
              <SelectValue placeholder="Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="debug">Debug</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="warn">Warning</SelectItem>
              <SelectItem value="error">Error</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filter.context || "all"}
            onValueChange={(value) =>
              setFilter({ ...filter, context: value === "all" ? undefined : value })
            }
          >
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue placeholder="Context" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Contexts</SelectItem>
              <SelectItem value="client">Client</SelectItem>
              <SelectItem value="edge_function">Edge Function</SelectItem>
              <SelectItem value="webhook">Webhook</SelectItem>
              <SelectItem value="database">Database</SelectItem>
            </SelectContent>
          </Select>

          {(filter.level || filter.search || filter.context) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-8 text-xs"
            >
              <X className="h-3 w-3 mr-1" />
              Clear
            </Button>
          )}
        </div>
      )}

      {/* Logs */}
      <ScrollArea
        className="flex-1"
        style={{ maxHeight: isExpanded ? "600px" : maxHeight }}
        ref={scrollRef}
      >
        <div className="p-3 space-y-1 font-mono text-xs bg-slate-950">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {logs.length === 0 ? "No logs yet" : "No logs match the filters"}
            </div>
          ) : (
            filteredLogs.map((log, index) => (
              <div
                key={log.id || index}
                className={cn(
                  "flex items-start gap-2 px-2 py-1.5 rounded hover:bg-muted/10 transition-colors",
                  log.logLevel === "error" && "bg-red-950/30",
                  log.logLevel === "warn" && "bg-yellow-950/20"
                )}
              >
                {/* Timestamp */}
                <span className="text-gray-500 shrink-0 w-[160px]">
                  {new Date(log.timestamp).toLocaleTimeString("en-US", {
                    hour12: false,
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    fractionalSecondDigits: 3,
                  })}
                </span>

                {/* Log Level */}
                <Badge
                  variant={getLogLevelBadge(log.logLevel)}
                  className="shrink-0 w-[60px] justify-center text-xs"
                >
                  {log.logLevel.toUpperCase()}
                </Badge>

                {/* Context */}
                <Badge
                  variant="outline"
                  className={cn("shrink-0 w-[100px] justify-center text-xs", getContextColor(log.executionContext))}
                >
                  {log.executionContext}
                </Badge>

                {/* Step Number */}
                <span className="text-gray-600 shrink-0 w-[60px]">
                  Step {log.stepNumber}
                </span>

                {/* Message */}
                <span className={cn("flex-1", getLogLevelColor(log.logLevel))}>
                  {log.message}
                </span>

                {/* Function Name */}
                {log.functionName && (
                  <span className="text-purple-400 shrink-0 text-xs">
                    {log.functionName}()
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Footer Stats */}
      <div className="flex items-center justify-between px-4 py-2 border-t bg-muted/10 text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <span>
            <span className="text-blue-600 font-medium">
              {logs.filter((l) => l.logLevel === "info").length}
            </span>{" "}
            info
          </span>
          <span>
            <span className="text-yellow-600 font-medium">
              {logs.filter((l) => l.logLevel === "warn").length}
            </span>{" "}
            warnings
          </span>
          <span>
            <span className="text-red-600 font-medium">
              {logs.filter((l) => l.logLevel === "error" || l.logLevel === "critical").length}
            </span>{" "}
            errors
          </span>
        </div>
        <span>
          Auto-scroll: <span className={autoScroll ? "text-green-600" : "text-gray-500"}>{autoScroll ? "ON" : "OFF"}</span>
        </span>
      </div>
    </Card>
  );
}
