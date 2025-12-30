import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { CreditStatusBadge } from "./CreditStatusBadge";
import { useCreditLog } from "@/hooks/useCreditLog";
import { format } from "date-fns";
import { Copy, Download, ExternalLink, FileText, Receipt } from "lucide-react";
import { toast } from "sonner";
import { exportToCSV, exportToPDF } from "@/lib/utils/creditLogExport";

export const CreditActivityLog = () => {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const { entries, totalCount, totalPages, isLoading } = useCreditLog({
    page: currentPage,
    pageSize,
  });

  const handleNavigateToGeneration = (generationId: string) => {
    navigate(`/dashboard/history?gen=${generationId}`);
  };

  const handleCopyPrompt = (prompt: string) => {
    navigator.clipboard.writeText(prompt);
    toast.success("Prompt copied to clipboard");
  };

  const truncatePrompt = (prompt: string, maxLength = 40) => {
    if (prompt.length <= maxLength) return prompt;
    return prompt.substring(0, maxLength) + "...";
  };

  const truncateId = (id: string) => {
    return `#${id.substring(0, 6)}`;
  };

  const formatBalance = (balance: number | undefined) => {
    if (balance === undefined) return "-";
    return balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Credit Activity Log
          </CardTitle>
          <CardDescription>Loading your credit transactions...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (entries.length === 0) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Credit Activity Log
          </CardTitle>
          <CardDescription>Track your credit usage across all generations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Receipt className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No credit activity yet</p>
            <p className="text-sm text-muted-foreground/70">Your credit transactions will appear here</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleExportCSV = () => {
    try {
      exportToCSV(entries);
      toast.success("CSV exported successfully");
    } catch (error) {
      toast.error("Failed to export CSV");
    }
  };

  const handleExportPDF = () => {
    try {
      exportToPDF(entries);
      toast.success("PDF opened in new window");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to export PDF");
    }
  };

  return (
    <Card className="glass-card w-full">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Receipt className="h-5 w-5" />
              Credit Activity Log
            </CardTitle>
            <CardDescription className="mt-1">
              {totalCount} total transactions • Showing {entries.length} on this page
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportCSV}
                    className="gap-1.5"
                  >
                    <Download className="h-4 w-4" />
                    <span className="hidden sm:inline">CSV</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Download as CSV</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportPDF}
                    className="gap-1.5"
                  >
                    <FileText className="h-4 w-4" />
                    <span className="hidden sm:inline">PDF</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Export as PDF</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 px-6">
        <div className="rounded-lg border border-border/50 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="w-[80px] whitespace-nowrap py-3">ID</TableHead>
                <TableHead className="w-[100px] whitespace-nowrap py-3">Date</TableHead>
                <TableHead className="py-3">Prompt</TableHead>
                <TableHead className="w-[140px] whitespace-nowrap py-3">Model</TableHead>
                <TableHead className="w-[100px] whitespace-nowrap hidden xl:table-cell py-3">Version</TableHead>
                <TableHead className="w-[100px] text-right whitespace-nowrap py-3">Credits</TableHead>
                <TableHead className="w-[120px] text-right whitespace-nowrap py-3">Balance After</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id} className="hover:bg-muted/20">
                  <TableCell className="py-3">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="link"
                            size="sm"
                            className="p-0 h-auto font-mono text-xs text-primary hover:text-primary/80"
                            onClick={() => handleNavigateToGeneration(entry.id)}
                          >
                            {truncateId(entry.id)}
                            <ExternalLink className="h-3 w-3 ml-1" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Click to view generation</p>
                          <p className="text-xs text-muted-foreground font-mono">{entry.id}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground py-3">
                    <div>{format(entry.date, "MMM d, yyyy")}</div>
                    <div className="opacity-70">{format(entry.date, "h:mm a")}</div>
                  </TableCell>
                  <TableCell className="py-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-sm truncate cursor-default">
                              {entry.prompt ? (
                                truncatePrompt(entry.prompt, 50)
                              ) : (
                                <span className="text-muted-foreground italic">Audio-driven generation</span>
                              )}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="max-w-[400px]">
                            <p className="text-sm whitespace-pre-wrap">
                              {entry.prompt || "No text prompt (audio-driven generation)"}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      {entry.prompt && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0 opacity-60 hover:opacity-100"
                          onClick={() => handleCopyPrompt(entry.prompt)}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-3">
                    <div className="text-xs">
                      <span className="text-muted-foreground">{entry.modelType}</span>
                      <div className="font-medium text-sm truncate">{entry.modelName}</div>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground py-3 hidden xl:table-cell">
                    {entry.modelVersion || "-"}
                  </TableCell>
                  <TableCell className="text-right py-3">
                    <CreditStatusBadge 
                      status={entry.creditStatus} 
                      amount={entry.creditStatus === 'refunded' ? entry.refundAmount : entry.creditsCharged || entry.creditsReserved}
                    />
                  </TableCell>
                  <TableCell className="text-right py-3">
                    <span className="text-sm font-semibold tabular-nums">
                      {formatBalance(entry.cumulativeBalance)}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <PaginationControls
            page={currentPage}
            totalPages={totalPages}
            totalCount={totalCount}
            pageSize={pageSize}
            hasPrevious={currentPage > 1}
            hasNext={currentPage < totalPages}
            onPageChange={setCurrentPage}
            onFirstPage={() => setCurrentPage(1)}
            onLastPage={() => setCurrentPage(totalPages)}
          />
        )}
      </CardContent>
    </Card>
  );
};
