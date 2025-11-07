import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { WorkflowTemplate } from "@/hooks/useWorkflowTemplates";

interface WorkflowBasicInfoProps {
  workflow: Partial<WorkflowTemplate>;
  onWorkflowChange: (updates: Partial<WorkflowTemplate>) => void;
  isNew: boolean;
  originalWorkflowId: string | null;
  existingCategories: string[];
  showCustomCategory: boolean;
  onToggleCustomCategory: (show: boolean) => void;
}

/**
 * Component for managing basic workflow information fields
 * Handles ID, name, description, thumbnail, category, display order, and active status
 */
export function WorkflowBasicInfo({
  workflow,
  onWorkflowChange,
  isNew,
  originalWorkflowId,
  existingCategories,
  showCustomCategory,
  onToggleCustomCategory,
}: WorkflowBasicInfoProps) {
  const idChanged = !isNew && originalWorkflowId !== workflow.id;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Basic Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="workflow-id">
              Workflow ID
              {idChanged && (
                <Badge variant="outline" className="ml-2 text-amber-600 border-amber-600">
                  ID Changed
                </Badge>
              )}
            </Label>
            <Input
              id="workflow-id"
              value={workflow.id || ""}
              onChange={(e) => onWorkflowChange({ id: e.target.value })}
              placeholder="unique-workflow-id"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="workflow-name">Name *</Label>
            <Input
              id="workflow-name"
              value={workflow.name || ""}
              onChange={(e) => onWorkflowChange({ name: e.target.value })}
              placeholder="Workflow Name"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="workflow-description">Description</Label>
          <Textarea
            id="workflow-description"
            value={workflow.description || ""}
            onChange={(e) => onWorkflowChange({ description: e.target.value })}
            placeholder="Describe this workflow..."
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="workflow-thumbnail">Thumbnail URL</Label>
          <Input
            id="workflow-thumbnail"
            value={workflow.thumbnail_url || ""}
            onChange={(e) => onWorkflowChange({ thumbnail_url: e.target.value })}
            placeholder="https://..."
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="workflow-category">Category *</Label>
          {!showCustomCategory ? (
            <Select
              value={workflow.category || ""}
              onValueChange={(value) => {
                if (value === "__custom__") {
                  onToggleCustomCategory(true);
                  onWorkflowChange({ category: "" });
                } else {
                  onWorkflowChange({ category: value });
                }
              }}
            >
              <SelectTrigger id="workflow-category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {existingCategories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
                <SelectItem value="__custom__">+ Create new category</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <Input
              id="workflow-category"
              value={workflow.category || ""}
              onChange={(e) => onWorkflowChange({ category: e.target.value })}
              placeholder="Enter new category name"
              onBlur={() => {
                if (!workflow.category) {
                  onToggleCustomCategory(false);
                }
              }}
            />
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 items-end">
          <div className="space-y-2">
            <Label htmlFor="workflow-display-order">Display Order</Label>
            <Input
              id="workflow-display-order"
              type="number"
              value={workflow.display_order ?? 0}
              onChange={(e) => onWorkflowChange({ display_order: parseInt(e.target.value) || 0 })}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="workflow-active"
              checked={workflow.is_active ?? true}
              onCheckedChange={(checked) => onWorkflowChange({ is_active: checked === true })}
            />
            <Label htmlFor="workflow-active" className="cursor-pointer">
              Active
            </Label>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
