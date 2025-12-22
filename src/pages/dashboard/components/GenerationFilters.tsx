import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, Image as ImageIcon, Video, Music, FileText, Loader2, Clapperboard } from "lucide-react";
import type { StatusFilter, ContentTypeFilter } from "../hooks/useGenerationFilters";

interface GenerationFiltersProps {
  statusFilter: StatusFilter;
  onStatusFilterChange: (filter: StatusFilter) => void;
  contentTypeFilter: ContentTypeFilter;
  onContentTypeFilterChange: (filter: ContentTypeFilter) => void;
}

export const GenerationFilters = ({
  statusFilter,
  onStatusFilterChange,
  contentTypeFilter,
  onContentTypeFilterChange,
}: GenerationFiltersProps) => {
  return (
    <>
      <div className="mb-6">
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

      <div className="mb-6">
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
    </>
  );
};
