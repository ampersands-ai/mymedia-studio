/**
 * Re-render Confirmation Dialog Component
 * Dialog for confirming video re-render with cost breakdown
 */

import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface RerenderConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rerenderCost: number;
  tokenBalance: number;
  onConfirm: () => void;
}

export const RerenderConfirmDialog = ({
  open,
  onOpenChange,
  rerenderCost,
  tokenBalance,
  onConfirm,
}: RerenderConfirmDialogProps) => {
  const hasInsufficientCredits = tokenBalance < rerenderCost;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            Video Already Rendered
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-4">
            <p>
              This storyboard has already been rendered. Re-rendering will create a new video and charge your account again.
            </p>
            
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold">Cost for re-rendering:</span>
                <span className="text-lg font-bold text-primary">{rerenderCost.toFixed(2)} credits</span>
              </div>
              <div className="flex justify-between items-center text-sm text-muted-foreground">
                <span>Current balance:</span>
                <span>{tokenBalance.toFixed(2)} credits</span>
              </div>
              <div className="flex justify-between items-center text-sm text-muted-foreground">
                <span>Balance after re-render:</span>
                <span className={hasInsufficientCredits ? "text-destructive font-semibold" : ""}>
                  {(tokenBalance - rerenderCost).toFixed(2)} credits
                </span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              💡 Tip: You can still view and download your existing video below. Only re-render if you've made changes to the script or settings.
            </p>
            
            {hasInsufficientCredits && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Insufficient credits. Please purchase more credits to re-render.
                </AlertDescription>
              </Alert>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={hasInsufficientCredits}
            className="bg-primary hover:bg-primary/90"
          >
            Re-render ({rerenderCost.toFixed(2)} credits)
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
