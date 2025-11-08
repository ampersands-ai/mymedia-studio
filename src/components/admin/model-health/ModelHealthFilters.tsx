import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";

interface ModelHealthFiltersProps {
  providers: string[];
  contentTypes: string[];
  selectedProvider: string;
  selectedContentType: string;
  selectedStatus: string;
  searchQuery: string;
  onProviderChange: (value: string) => void;
  onContentTypeChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onSearchChange: (value: string) => void;
}

export const ModelHealthFilters = ({
  providers,
  contentTypes,
  selectedProvider,
  selectedContentType,
  selectedStatus,
  searchQuery,
  onProviderChange,
  onContentTypeChange,
  onStatusChange,
  onSearchChange,
}: ModelHealthFiltersProps) => {
  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search models..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>
      
      <Select value={selectedProvider} onValueChange={onProviderChange}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="All Providers" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Providers</SelectItem>
          {providers.map((provider) => (
            <SelectItem key={provider} value={provider}>
              {provider}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <Select value={selectedContentType} onValueChange={onContentTypeChange}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="All Types" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          {contentTypes.map((type) => (
            <SelectItem key={type} value={type}>
              {type}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <Select value={selectedStatus} onValueChange={onStatusChange}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="All Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="success">Success</SelectItem>
          <SelectItem value="warning">Warning</SelectItem>
          <SelectItem value="error">Error</SelectItem>
          <SelectItem value="never-tested">Never Tested</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};
