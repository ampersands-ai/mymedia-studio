import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, X, Edit3 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface InspectionReviewCardProps {
  inspectionData: Record<string, any>;
  onContinue: () => void;
  onCancel: () => void;
}

export const InspectionReviewCard = ({ inspectionData, onContinue, onCancel }: InspectionReviewCardProps) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedPayload, setEditedPayload] = useState(
    JSON.stringify(inspectionData.step3_final_payload || {}, null, 2)
  );

  const handleContinue = () => {
    if (isEditMode) {
      try {
        JSON.parse(editedPayload);
        onContinue();
      } catch (e) {
        toast.error("Invalid JSON - Please fix syntax errors");
      }
    } else {
      onContinue();
    }
  };

  return (
    <Card className="border-warning">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Badge variant="secondary">Review Required</Badge>
              Review API Payload
            </CardTitle>
            <CardDescription>
              Inspect the prepared payload before sending to the API
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onCancel}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Step 1: Input Parameters */}
        <div>
          <h4 className="font-semibold mb-2 text-sm">Step 1: Input Parameters</h4>
          <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-32">
            {JSON.stringify(inspectionData.step1_inputs, null, 2)}
          </pre>
        </div>

        {/* Step 2: Backend Merge */}
        <div>
          <h4 className="font-semibold mb-2 text-sm">Step 2: Backend Parameters Merged</h4>
          <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-32">
            {JSON.stringify(inspectionData.step2_backend_merge, null, 2)}
          </pre>
        </div>

        {/* Step 3: Final Payload */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-sm">Step 3: Final API Payload</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditMode(!isEditMode)}
            >
              <Edit3 className="h-3 w-3 mr-2" />
              {isEditMode ? "View Mode" : "Edit Mode"}
            </Button>
          </div>
          {isEditMode ? (
            <textarea
              className="w-full bg-muted p-3 rounded text-xs font-mono min-h-[200px] border"
              value={editedPayload}
              onChange={(e) => setEditedPayload(e.target.value)}
            />
          ) : (
            <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-64">
              {JSON.stringify(inspectionData.step3_final_payload, null, 2)}
            </pre>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4">
          <Button
            onClick={handleContinue}
            className="flex-1"
            size="lg"
          >
            <Play className="h-4 w-4 mr-2" />
            Continue Test
          </Button>
          <Button
            onClick={onCancel}
            variant="outline"
            size="lg"
          >
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
