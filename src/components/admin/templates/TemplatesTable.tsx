import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CardContent } from "@/components/ui/card";
import type { MergedTemplate } from "@/hooks/useTemplates";
import type { WorkflowTemplate } from "@/hooks/useWorkflowTemplates";
import { TemplateActions } from "./TemplateActions";

interface TemplatesTableProps {
  templates: MergedTemplate[];
  onEdit: (template: MergedTemplate) => void;
  onDuplicate: (template: MergedTemplate) => void;
  onToggleActive: (template: MergedTemplate) => void;
  onDelete: (template: MergedTemplate) => void;
  onTest: (workflow: WorkflowTemplate) => void;
}

/**
 * Main templates table with all columns and actions
 */
export function TemplatesTable({
  templates,
  onEdit,
  onDuplicate,
  onToggleActive,
  onDelete,
  onTest,
}: TemplatesTableProps) {
  return (
    <CardContent>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="font-bold">Type</TableHead>
            <TableHead className="font-bold">ID</TableHead>
            <TableHead className="font-bold">Name</TableHead>
            <TableHead className="font-bold">Category</TableHead>
            <TableHead className="font-bold">Display Order</TableHead>
            <TableHead className="font-bold">Status</TableHead>
            <TableHead className="font-bold text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {templates.map((item) => (
            <TableRow key={item.id}>
              <TableCell>
                <Badge variant={item.template_type === 'template' ? 'secondary' : 'default'}>
                  {item.template_type === 'template' ? 'Content' : 'Workflow'}
                </Badge>
              </TableCell>
              <TableCell className="font-mono text-xs">{item.id}</TableCell>
              <TableCell className="font-medium">{item.name}</TableCell>
              <TableCell>{item.category}</TableCell>
              <TableCell>{item.display_order}</TableCell>
              <TableCell>
                <Badge 
                  variant={item.is_active ? 'default' : 'secondary'}
                  className={item.is_active ? 'bg-green-500 hover:bg-green-600' : ''}
                >
                  {item.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </TableCell>
              <TableCell>
                <TemplateActions
                  template={item}
                  onEdit={onEdit}
                  onDuplicate={onDuplicate}
                  onToggleActive={onToggleActive}
                  onDelete={onDelete}
                  onTest={onTest}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </CardContent>
  );
}
