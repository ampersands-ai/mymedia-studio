import { ArrowUpDown, Power, PowerOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TemplatesCardProps {
  children: React.ReactNode;
  filteredCount: number;
  sortBy: string;
  onSortChange: (value: string) => void;
  onEnableAll: () => void;
  onDisableAll: () => void;
}

/**
 * Main card container for templates with header controls
 */
export function TemplatesCard({
  children,
  filteredCount,
  sortBy,
  onSortChange,
  onEnableAll,
  onDisableAll,
}: TemplatesCardProps) {
  return (
    <Card className="border-3 border-black brutal-shadow">
      <CardHeader>
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <CardTitle>All Templates ({filteredCount})</CardTitle>
            <div className="flex gap-2 items-center">
              <Select value={sortBy} onValueChange={onSortChange}>
                <SelectTrigger className="w-[180px]">
                  <ArrowUpDown className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Sort by..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="display_order">Display Order</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="category">Category</SelectItem>
                  <SelectItem value="type">Type</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={onEnableAll}
                className="border-2"
              >
                <Power className="h-4 w-4 mr-2" />
                Enable All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onDisableAll}
                className="border-2"
              >
                <PowerOff className="h-4 w-4 mr-2" />
                Disable All
              </Button>
            </div>
          </div>
          
          {children}
        </div>
      </CardHeader>
    </Card>
  );
}
