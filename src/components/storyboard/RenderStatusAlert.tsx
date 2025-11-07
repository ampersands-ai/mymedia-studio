/**
 * Render Status Alert Component
 * Shows rendering status with refresh and cancel buttons
 */

import { RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface RenderStatusAlertProps {
  renderStatusMessage: string;
  onCheckStatus: () => void;
  onCancelRender: () => void;
  isCanceling: boolean;
}

/**
 * Alert component showing render progress with action buttons
 */
export const RenderStatusAlert = ({
  renderStatusMessage,
  onCheckStatus,
  onCancelRender,
  isCanceling,
}: RenderStatusAlertProps) => {
  return (
    <Alert>
      <AlertCircle className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <span>{renderStatusMessage}</span>
        <div className="flex gap-2 ml-4">
          <Button
            variant="outline"
            size="sm"
            onClick={onCheckStatus}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Check Status
          </Button>
          
          {/* Cancel Render Button with Confirmation */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                size="sm"
                disabled={isCanceling}
                className="whitespace-nowrap"
              >
                <X className="w-4 h-4 mr-1 flex-shrink-0" />
                <span className="hidden sm:inline">Cancel Render</span>
                <span className="sm:hidden">Cancel</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Cancel Video Rendering?</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure? Your tokens will NOT be refunded as the job has already started.
                  
                  <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-md">
                    <p className="text-sm text-amber-600 dark:text-amber-400">
                      ⚠️ The video may still complete on the server, but it won't be saved to your account.
                    </p>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep Rendering</AlertDialogCancel>
                <AlertDialogAction
                  onClick={onCancelRender}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  Cancel Anyway
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </AlertDescription>
    </Alert>
  );
};
