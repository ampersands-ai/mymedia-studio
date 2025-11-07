/**
 * Stuck Video Alert Component
 * Shows when rendering was interrupted and needs status check
 */

import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface StuckVideoAlertProps {
  isStuck: boolean;
  onCheckStatus: () => void;
}

/**
 * Alert component for interrupted renders
 * Displayed when status is 'rendering' but not actively rendering
 */
export const StuckVideoAlert = ({ isStuck, onCheckStatus }: StuckVideoAlertProps) => {
  if (!isStuck) return null;

  return (
    <Alert>
      <AlertCircle className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <span>Video rendering was interrupted. Click to check if it completed.</span>
        <Button
          variant="outline"
          size="sm"
          onClick={onCheckStatus}
          className="ml-4"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Check Status
        </Button>
      </AlertDescription>
    </Alert>
  );
};
