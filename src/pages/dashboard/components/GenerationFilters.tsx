import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Image as ImageIcon, Video, Music, FileText, Loader2, Clapperboard, Calendar, Layers } from "lucide-react";
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
}: GenerationFiltersProps) => {
  return (
    <div className="space-y-4 mb-6">
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
          <TabsList className="grid w-full max-w-3xl grid-cols-6">
            <TabsTrigger value="all">
              <Sparkles className="h-4 w-4 mr-1" />
              All
            </TabsTrigger>
            <TabsTrigger value="image">
              <ImageIcon className="h-4 w-4 mr-1" />
              Images
            </TabsTrigger>
            <TabsTrigger value="video">
              <Video className="h-4 w-4 mr-1" />
              Videos
            </TabsTrigger>
            <TabsTrigger value="video_editor">
              <Clapperboard className="h-4 w-4 mr-1" />
              Editor
            </TabsTrigger>
            <TabsTrigger value="audio">
              <Music className="h-4 w-4 mr-1" />
              Audio
            </TabsTrigger>
            <TabsTrigger value="storyboard">
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
