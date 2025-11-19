import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileCode2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { generateAllModelFiles } from "@/scripts/generate-all-model-files";
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
} from "@/components/ui/alert-dialog";

/**
 * Admin button to regenerate .ts files for ALL models
 * Useful after major architecture changes or migrations
 */
export function RegenerateAllModelsButton() {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleRegenerate = async () => {
    setIsGenerating(true);
    const toastId = toast.loading("Generating model files...");

    try {
      const result = await generateAllModelFiles();

      if (result.success) {
        toast.success(result.message, { id: toastId });
        
        if (result.results && result.results.errors.length > 0) {
          console.error("Errors during generation:", result.results.errors);
          toast.warning(
            `Some models failed: ${result.results.errors.length} errors. Check console for details.`,
            { duration: 5000 }
          );
        }
      } else {
        toast.error(result.message || "Failed to generate model files", { id: toastId });
      }
    } catch (err) {
      console.error("Failed to regenerate model files:", err);
      toast.error(
        `Failed to regenerate model files: ${err instanceof Error ? err.message : "Unknown error"}`,
        { id: toastId }
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={isGenerating}>
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <FileCode2 className="h-4 w-4 mr-2" />
              Regenerate All Model Files
            </>
          )}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Regenerate All Model Files?</AlertDialogTitle>
          <AlertDialogDescription>
            This will regenerate .ts files for ALL models in the database. 
            This is useful after:
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Major architecture changes</li>
              <li>Schema updates</li>
              <li>Database migrations</li>
            </ul>
            <br />
            <strong>Warning:</strong> This operation may take several seconds depending on the number of models.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleRegenerate}>
            Regenerate All
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
