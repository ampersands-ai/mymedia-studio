import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, X, Edit, Loader2 } from "lucide-react";

interface ExecutionControlPanelProps {
  phase: 'idle' | 'preparing' | 'review' | 'executing' | 'complete' | 'error';
  onContinue: () => void;
  onCancel: () => void;
  onToggleEdit: () => void;
  isEditing: boolean;
  disabled?: boolean;
}

export const ExecutionControlPanel = ({ 
  phase, 
  onContinue, 
  onCancel, 
  onToggleEdit,
  isEditing,
  disabled = false
}: ExecutionControlPanelProps) => {
  const getPhaseLabel = () => {
    switch (phase) {
      case 'preparing':
        return 'Preparing Test...';
      case 'review':
        return 'Review Required';
      case 'executing':
        return 'Test Running...';
      case 'complete':
        return 'Test Complete';
      case 'error':
        return 'Test Failed';
      default:
        return 'Ready';
    }
  };

  const getPhaseVariant = (): "default" | "destructive" | "outline" | "secondary" => {
    switch (phase) {
      case 'preparing':
      case 'executing':
        return 'secondary';
      case 'review':
        return 'default';
      case 'complete':
        return 'outline';
      case 'error':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  if (phase === 'idle') return null;

  return (
    <Card className="border-2 border-primary">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Badge variant={getPhaseVariant()} className="text-base px-4 py-2">
              {phase === 'preparing' || phase === 'executing' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              {getPhaseLabel()}
            </Badge>
            
            {phase === 'review' && (
              <p className="text-sm text-muted-foreground">
                Review the payload below and click Continue to proceed with the test
              </p>
            )}
          </div>

          <div className="flex gap-2">
            {phase === 'review' && (
              <>
                <Button
                  variant={isEditing ? "default" : "outline"}
                  onClick={onToggleEdit}
                  disabled={disabled}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  {isEditing ? "Stop Editing" : "Edit Payload"}
                </Button>
                <Button
                  onClick={onContinue}
                  disabled={disabled}
                  size="lg"
                  className="px-8"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Continue Test
                </Button>
                <Button
                  variant="outline"
                  onClick={onCancel}
                  disabled={disabled}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
