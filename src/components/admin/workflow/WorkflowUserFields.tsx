import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Plus } from "lucide-react";
import type { UserInputField } from "@/hooks/useWorkflowTemplates";

interface WorkflowUserFieldsProps {
  userInputFields: UserInputField[];
  onAddField: () => void;
  onUpdateField: (index: number, updates: Partial<UserInputField>) => void;
  onDeleteField: (index: number) => void;
}

/**
 * Component for managing user input fields collection
 * Handles adding, editing, and deleting user input fields with type-specific options
 */
export function WorkflowUserFields({
  userInputFields,
  onAddField,
  onUpdateField,
  onDeleteField,
}: WorkflowUserFieldsProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>User Input Fields</CardTitle>
          <Button onClick={onAddField} size="sm" variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Add Field
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {userInputFields.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No user input fields defined. Click "Add Field" to create one.
          </div>
        )}

        {userInputFields.map((field, index) => (
          <Card key={index} className="border-2">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Field {index + 1}</h4>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDeleteField(index)}
                  className="h-8 w-8"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Field Name</Label>
                  <Input
                    value={field.name}
                    onChange={(e) => onUpdateField(index, { name: e.target.value })}
                    placeholder="field_name"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Display Label</Label>
                  <Input
                    value={field.label}
                    onChange={(e) => onUpdateField(index, { label: e.target.value })}
                    placeholder="Display Label"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Field Type</Label>
                  <Select
                    value={field.type}
                    onValueChange={(value) => onUpdateField(index, { type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Text</SelectItem>
                      <SelectItem value="textarea">Textarea</SelectItem>
                      <SelectItem value="number">Number</SelectItem>
                      <SelectItem value="select">Select</SelectItem>
                      <SelectItem value="checkbox">Checkbox</SelectItem>
                      <SelectItem value="file">File</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end pb-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`field-required-${index}`}
                      checked={field.required ?? false}
                      onCheckedChange={(checked) =>
                        onUpdateField(index, { required: checked === true })
                      }
                    />
                    <Label htmlFor={`field-required-${index}`} className="cursor-pointer">
                      Required
                    </Label>
                  </div>
                </div>
              </div>

              {field.type === "select" && (
                <div className="space-y-2">
                  <Label>Options (comma-separated)</Label>
                  <Input
                    value={field.options?.join(",") || ""}
                    onChange={(e) =>
                      onUpdateField(index, {
                        options: e.target.value.split(",").map((o) => o.trim()).filter(Boolean),
                      })
                    }
                    placeholder="option1,option2,option3"
                  />
                </div>
              )}

              {field.type === "file" && (
                <div className="space-y-2">
                  <Label>Max Files</Label>
                  <Input
                    type="number"
                    value={field.max_files || 1}
                    onChange={(e) =>
                      onUpdateField(index, { max_files: parseInt(e.target.value) || 1 })
                    }
                    min={1}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </CardContent>
    </Card>
  );
}
