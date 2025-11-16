import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { ModelHealthSummary } from "@/types/admin/model-health";

interface FlowTrackingDialogProps {
  model: ModelHealthSummary | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const FlowTrackingDialog = ({ model, open, onOpenChange }: FlowTrackingDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              Test Flow Tracking
              {model && <span className="text-muted-foreground font-normal">• {model.model_name}</span>}
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="text-center py-12 text-muted-foreground">
          Flow tracking is currently unavailable. Please use individual model tests.
        </div>
      </DialogContent>
    </Dialog>
  );
};