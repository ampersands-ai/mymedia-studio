import { useState } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface ClearButtonProps {
  onClear: () => void;
  hasContent: boolean;
  label?: string;
  disabled?: boolean;
  showToast?: boolean;
  toastMessage?: string;
  dialogTitle?: string;
  dialogDescription?: string;
}

/**
 * A reusable clear button with confirmation dialog
 * Shows warning when content exists, clears immediately when empty
 */
export const ClearButton: React.FC<ClearButtonProps> = ({
  onClear,
  hasContent,
  label = "Clear",
  disabled = false,
  showToast = true,
  toastMessage = "Content cleared",
  dialogTitle = "Clear content?",
  dialogDescription = "This will clear all your content. This action cannot be undone.",
}) => {
  const [showDialog, setShowDialog] = useState(false);

  const handleClick = () => {
    if (hasContent) {
      setShowDialog(true);
    } else {
      // Already empty, no warning needed
      onClear();
    }
  };

  const handleConfirmClear = () => {
    onClear();
    setShowDialog(false);
    if (showToast) {
      toast.success(toastMessage);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleClick();
        }}
        disabled={disabled}
        className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
      >
        <X className="h-3 w-3" />
        {label}
      </Button>

      <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{dialogTitle}</AlertDialogTitle>
            <AlertDialogDescription>{dialogDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmClear}
              className="bg-destructive hover:bg-destructive/90"
            >
              Clear
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
