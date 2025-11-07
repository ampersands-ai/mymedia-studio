import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TemplatesHeaderProps {
  onCreateContent: () => void;
  onCreateWorkflow: () => void;
}

/**
 * Page header for Templates Manager with title and create dropdown
 */
export function TemplatesHeader({
  onCreateContent,
  onCreateWorkflow,
}: TemplatesHeaderProps) {
  return (
    <div className="flex justify-between items-center">
      <div>
        <h1 className="text-4xl font-black mb-2">TEMPLATES</h1>
        <p className="text-muted-foreground">
          Manage all content templates and workflows
        </p>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold border-3 border-black brutal-shadow">
            <Plus className="h-4 w-4 mr-2" />
            Create
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
