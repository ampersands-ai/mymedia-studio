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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Test History: {model?.model_name}</DialogTitle>
        </DialogHeader>

        <div className="text-center py-8 text-muted-foreground">
          Test history is currently unavailable. Please use individual model tests.
        </div>
      </DialogContent>
    </Dialog>
  );
};