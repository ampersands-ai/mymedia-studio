import { useState, useEffect, useCallback } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Sparkles, Image as ImageIcon, Video, Music, FileText, Loader2, Clapperboard, Calendar, Layers, Search, X } from "lucide-react";
import type { StatusFilter, ContentTypeFilter, DateRangePreset } from "../hooks/useGenerationFilters";

interface GenerationFiltersProps {
  statusFilter: StatusFilter;
  onStatusFilterChange: (filter: StatusFilter) => void;
  contentTypeFilter: ContentTypeFilter;
  onContentTypeFilterChange: (filter: ContentTypeFilter) => void;
  datePreset: DateRangePreset;
  onDatePresetChange: (preset: DateRangePreset) => void;
  modelFilter: string;
  onModelFilterChange: (model: string) => void;
  availableModels?: { id: string; name: string }[];
  searchQuery?: string;
  onSearchQueryChange?: (query: string) => void;
}

const datePresetLabels: Record<DateRangePreset, string> = {
  'all': 'All Time',
  'today': 'Today',
  '7d': 'Last 7 Days',
  '30d': 'Last 30 Days',
  '90d': 'Last 90 Days',
};

export const GenerationFilters = ({
  statusFilter,
  onStatusFilterChange,
  contentTypeFilter,
  onContentTypeFilterChange,
  datePreset,
  onDatePresetChange,
  modelFilter,
  onModelFilterChange,
  availableModels = [],
  searchQuery = '',
  onSearchQueryChange,
}: GenerationFiltersProps) => {
  // Local state for debouncing
  const [localSearch, setLocalSearch] = useState(searchQuery);

  // Sync local state with prop
  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      if (onSearchQueryChange && localSearch !== searchQuery) {
        onSearchQueryChange(localSearch);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch, onSearchQueryChange, searchQuery]);

  const clearSearch = useCallback(() => {
    setLocalSearch('');
    onSearchQueryChange?.('');
  }, [onSearchQueryChange]);

  return (
    <div className="space-y-4 mb-6">
      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search by prompt keywords..."
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          className="pl-9 pr-9"
        />
        {localSearch && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Status Filter */}
      <div>
        <Tabs value={statusFilter} onValueChange={(v) => onStatusFilterChange(v as StatusFilter)}>
          <TabsList className="grid w-full max-w-lg grid-cols-4">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="pending" className="gap-1">
              <Loader2 className="h-3 w-3" />
              Active
            </TabsTrigger>
            <TabsTrigger value="completed">Successful</TabsTrigger>
            <TabsTrigger value="failed">Failed</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Content Type Filter */}
      <div>
        <Tabs value={contentTypeFilter} onValueChange={(v) => onContentTypeFilterChange(v as ContentTypeFilter)}>
          <TabsList className="flex w-full max-w-3xl overflow-x-auto scrollbar-hide gap-1 px-1 sm:grid sm:grid-cols-6 sm:overflow-visible sm:px-0">
            <TabsTrigger value="all" className="shrink-0 whitespace-nowrap">
              <Sparkles className="h-4 w-4 mr-1" />
              All
            </TabsTrigger>
            <TabsTrigger value="image" className="shrink-0 whitespace-nowrap">
              <ImageIcon className="h-4 w-4 mr-1" />
              Images
            </TabsTrigger>
            <TabsTrigger value="video" className="shrink-0 whitespace-nowrap">
              <Video className="h-4 w-4 mr-1" />
              Videos
            </TabsTrigger>
            <TabsTrigger value="video_editor" className="shrink-0 whitespace-nowrap">
              <Clapperboard className="h-4 w-4 mr-1" />
              Editor
            </TabsTrigger>
            <TabsTrigger value="audio" className="shrink-0 whitespace-nowrap">
              <Music className="h-4 w-4 mr-1" />
              Audio
            </TabsTrigger>
            <TabsTrigger value="storyboard" className="shrink-0 whitespace-nowrap">
              <FileText className="h-4 w-4 mr-1" />
              Storyboards
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Date Range & Model Filters */}
      <div className="flex flex-wrap gap-3">
        {/* Date Range Preset */}
        <Select value={datePreset} onValueChange={(v) => onDatePresetChange(v as DateRangePreset)}>
          <SelectTrigger className="w-[160px]">
            <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Date Range" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(datePresetLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Model Filter */}
        <Select value={modelFilter} onValueChange={onModelFilterChange}>
          <SelectTrigger className="w-[180px]">
            <Layers className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="All Models" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Models</SelectItem>
            {availableModels.map((model) => (
              <SelectItem key={model.id} value={model.id}>
                {model.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
