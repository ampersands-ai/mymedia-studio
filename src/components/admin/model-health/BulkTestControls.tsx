import { Button } from "@/components/ui/button";
import { PlayCircle, Square } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface BulkTestControlsProps {
  totalModels: number;
  selectedCount: number;
  isRunning: boolean;
  progress: number;
  onTestAll: () => void;
  onTestSelected: () => void;
  onCancel: () => void;
}

export const BulkTestControls = ({
  totalModels,
  selectedCount,
  isRunning,
  progress,
  onTestAll,
  onTestSelected,
  onCancel,
}: BulkTestControlsProps) => {
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button
          onClick={onTestAll}
          disabled={isRunning || totalModels === 0}
          size="lg"
        >
          <PlayCircle className="h-4 w-4 mr-2" />
          Test All Models ({totalModels})
        </Button>
        
        {selectedCount > 0 && (
          <Button
            onClick={onTestSelected}
            disabled={isRunning}
            variant="secondary"
            size="lg"
          >
            <PlayCircle className="h-4 w-4 mr-2" />
            Test Selected ({selectedCount})
          </Button>
        )}
        
        {isRunning && (
          <Button onClick={onCancel} variant="destructive" size="lg">
            <Square className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        )}
      </div>
      
      {isRunning && (
        <div className="space-y-2">
          <Progress value={progress} />
          <p className="text-sm text-muted-foreground">
            Testing models... {Math.round(progress)}% complete
          </p>
        </div>
      )}
    </div>
  );
};
