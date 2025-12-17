import { Edit, Copy, Power, PowerOff, Trash2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MergedTemplate } from "@/hooks/useTemplates";

interface TemplateActionsProps {
  template: MergedTemplate;
  onEdit: (template: MergedTemplate) => void;
  onDuplicate: (template: MergedTemplate) => void;
  onToggleActive: (template: MergedTemplate) => void;
  onDelete: (template: MergedTemplate) => void;
  onTest: (workflow: MergedTemplate) => void;
}

/**
 * Action buttons for each template row
 */
export function TemplateActions({
  template,
  onEdit,
  onDuplicate,
  onToggleActive,
  onDelete,
  onTest,
}: TemplateActionsProps) {
  return (
    <div className="flex justify-end gap-2">
      {/* Test button only for workflows */}
      {template.template_type === 'workflow' && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onTest(template)}
          title="Test workflow"
          className="border-2"
        >
          <Play className="h-4 w-4" />
        </Button>
      )}
      
      <Button
        variant="outline"
        size="sm"
        onClick={() => onEdit(template)}
        title="Edit"
        className="border-2"
      >
        <Edit className="h-4 w-4" />
      </Button>
      
      <Button
        variant="outline"
        size="sm"
        onClick={() => onDuplicate(template)}
        title="Duplicate"
        className="border-2"
      >
        <Copy className="h-4 w-4" />
      </Button>
      
      <Button
        variant="outline"
        size="sm"
        onClick={() => onToggleActive(template)}
        title={template.is_active ? "Disable" : "Enable"}
        className="border-2"
      >
        {template.is_active ? (
          <PowerOff className="h-4 w-4" />
        ) : (
          <Power className="h-4 w-4" />
        )}
      </Button>
      
      <Button
        variant="outline"
        size="sm"
        onClick={() => onDelete(template)}
        title="Delete"
        className="border-2 hover:bg-destructive hover:text-destructive-foreground"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
