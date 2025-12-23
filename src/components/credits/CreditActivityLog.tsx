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
import { Copy, ExternalLink, Receipt } from "lucide-react";
import { toast } from "sonner";

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

  const truncatePrompt = (prompt: string, maxLength = 50) => {
    if (prompt.length <= maxLength) return prompt;
    return prompt.substring(0, maxLength) + "...";
  };

  const truncateId = (id: string) => {
    return `#${id.substring(0, 8)}...`;
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

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="h-5 w-5" />
          Credit Activity Log
        </CardTitle>
        <CardDescription>
          {totalCount} total transactions • Showing {entries.length} on this page
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border border-border/50 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="w-[100px]">ID</TableHead>
                <TableHead className="w-[160px]">Date</TableHead>
                <TableHead className="min-w-[200px]">Prompt</TableHead>
                <TableHead className="w-[180px]">Model</TableHead>
                <TableHead className="w-[120px]">Version</TableHead>
                <TableHead className="w-[150px] text-right">Credits</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id} className="hover:bg-muted/20">
                  <TableCell>
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
                  <TableCell className="text-sm text-muted-foreground">
                    {format(entry.date, "MMM d, yyyy")}
                    <br />
                    <span className="text-xs opacity-70">{format(entry.date, "h:mm a")}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-sm truncate max-w-[180px] cursor-default">
                              {truncatePrompt(entry.prompt)}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="max-w-[400px]">
                            <p className="text-sm whitespace-pre-wrap">{entry.prompt}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0"
                        onClick={() => handleCopyPrompt(entry.prompt)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <span className="text-muted-foreground text-xs">{entry.modelType}:</span>
                      <br />
                      <span className="font-medium">{entry.modelName}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {entry.modelVersion || "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <CreditStatusBadge 
                      status={entry.creditStatus} 
                      amount={entry.creditStatus === 'refunded' ? entry.refundAmount : entry.creditsCharged || entry.creditsReserved}
                    />
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
