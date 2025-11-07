import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X } from "lucide-react";
import type { WorkflowTemplate } from "@/hooks/useWorkflowTemplates";

interface WorkflowBeforeAfterImagesProps {
  beforeImage: {
    file: File | null;
    preview: string | null;
    signedPreview: string | null;
    upload: (file: File) => void;
    remove: () => void;
  };
  afterImage: {
    file: File | null;
    preview: string | null;
    signedPreview: string | null;
    upload: (file: File) => void;
    remove: () => void;
  };
  workflow: Partial<WorkflowTemplate>;
  onWorkflowChange: (updates: Partial<WorkflowTemplate>) => void;
}

/**
 * Component for managing before/after image uploads and previews
 * Handles file upload, URL input, and image preview with removal
 */
export function WorkflowBeforeAfterImages({
  beforeImage,
  afterImage,
  workflow,
  onWorkflowChange,
}: WorkflowBeforeAfterImagesProps) {
  const renderImageSection = (
    type: "before" | "after",
    imageData: WorkflowBeforeAfterImagesProps["beforeImage"] | WorkflowBeforeAfterImagesProps["afterImage"]
  ) => {
    const displayPreview = imageData.preview || imageData.signedPreview;
    const urlValue = type === "before" ? workflow.before_image_url : workflow.after_image_url;

    return (
      <div className="space-y-4">
        <h3 className="font-medium capitalize">{type} Image</h3>
        
        <div className="space-y-2">
          <Label htmlFor={`${type}-file`}>Upload Image</Label>
          <Input
            id={`${type}-file`}
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                imageData.upload(file);
              }
            }}
          />
        </div>

        <div className="text-center text-sm text-muted-foreground">or</div>

        <div className="space-y-2">
          <Label htmlFor={`${type}-url`}>Image URL</Label>
          <Input
            id={`${type}-url`}
            value={urlValue || ""}
            onChange={(e) => {
              if (type === "before") {
                onWorkflowChange({ before_image_url: e.target.value });
              } else {
                onWorkflowChange({ after_image_url: e.target.value });
              }
            }}
            placeholder="https://..."
          />
        </div>

        {displayPreview && (
          <div className="relative">
            <img
              src={displayPreview}
              alt={`${type} preview`}
              className="h-40 w-full object-contain rounded-md border border-border bg-muted"
            />
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2 h-6 w-6"
              onClick={imageData.remove}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {!displayPreview && (
          <div className="h-40 w-full rounded-md border border-dashed border-border bg-muted/50 flex items-center justify-center text-sm text-muted-foreground">
            No image selected
          </div>
        )}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Before/After Images</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {renderImageSection("before", beforeImage)}
          {renderImageSection("after", afterImage)}
        </div>
      </CardContent>
    </Card>
  );
}
