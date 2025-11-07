import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface EmptyTemplatesStateProps {
  onCreateContent: () => void;
  onCreateWorkflow: () => void;
}

/**
 * Empty state displayed when no templates exist
 */
export function EmptyTemplatesState({
  onCreateContent,
  onCreateWorkflow,
}: EmptyTemplatesStateProps) {
  return (
    <div className="text-center py-12">
      <p className="text-muted-foreground mb-4">
        No templates configured yet
      </p>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold border-3 border-black brutal-shadow">
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Template
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={onCreateContent}>
            Content Template
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onCreateWorkflow}>
            Workflow Template
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
