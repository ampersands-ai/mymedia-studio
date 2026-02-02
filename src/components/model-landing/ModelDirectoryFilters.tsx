import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { formatContentType, getProviderLogo } from "@/lib/utils/provider-display";
import { X, Film, Image, Music, Video, Wand2, RefreshCw, Mic, Clapperboard } from "lucide-react";

interface ModelDirectoryFiltersProps {
  selectedContentTypes: string[];
  onContentTypesChange: (types: string[]) => void;
  selectedProviders: string[];
  onProvidersChange: (providers: string[]) => void;
  availableContentTypes: { type: string; count: number }[];
  availableProviders: { name: string; count: number }[];
}

const contentTypeGroups = [
  {
    label: "Video Generation",
    types: ["prompt_to_video", "image_to_video", "video_to_video", "lip_sync"]
  },
  {
    label: "Image Generation",
    types: ["prompt_to_image", "image_to_image", "image_editing"]
  },
  {
    label: "Audio Generation",
    types: ["prompt_to_audio"]
  }
];

const contentTypeIcons: Record<string, React.ReactNode> = {
  'prompt_to_video': <Film className="h-3.5 w-3.5" />,
  'image_to_video': <Video className="h-3.5 w-3.5" />,
  'video_to_video': <Clapperboard className="h-3.5 w-3.5" />,
  'lip_sync': <Mic className="h-3.5 w-3.5" />,
  'prompt_to_image': <Image className="h-3.5 w-3.5" />,
  'image_to_image': <RefreshCw className="h-3.5 w-3.5" />,
  'image_editing': <Wand2 className="h-3.5 w-3.5" />,
  'prompt_to_audio': <Music className="h-3.5 w-3.5" />,
};

export function ModelDirectoryFilters({
  selectedContentTypes,
  onContentTypesChange,
  selectedProviders,
  onProvidersChange,
  availableContentTypes,
  availableProviders,
}: ModelDirectoryFiltersProps) {
  const [activeTab, setActiveTab] = useState<"tasks" | "providers">("tasks");
  
  const totalTasks = availableContentTypes.reduce((sum, ct) => sum + ct.count, 0);
  const totalProviders = availableProviders.length;
  
  const getContentTypeCount = (type: string) => {
    return availableContentTypes.find(ct => ct.type === type)?.count || 0;
  };

  const toggleContentType = (type: string) => {
    if (selectedContentTypes.includes(type)) {
      onContentTypesChange(selectedContentTypes.filter(t => t !== type));
    } else {
      onContentTypesChange([...selectedContentTypes, type]);
    }
  };

  const toggleProvider = (provider: string) => {
    if (selectedProviders.includes(provider)) {
      onProvidersChange(selectedProviders.filter(p => p !== provider));
    } else {
      onProvidersChange([...selectedProviders, provider]);
    }
  };

  const clearAll = () => {
    onContentTypesChange([]);
    onProvidersChange([]);
  };

  const hasActiveFilters = selectedContentTypes.length > 0 || selectedProviders.length > 0;

  return (
    <aside className="w-64 flex-shrink-0 hidden lg:block">
      <div className="sticky top-24 bg-card border rounded-xl overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab("tasks")}
            className={cn(
              "flex-1 px-4 py-3 text-sm font-medium transition-colors",
              activeTab === "tasks"
                ? "bg-primary/10 text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            Tasks ({totalTasks})
          </button>
          <button
            onClick={() => setActiveTab("providers")}
            className={cn(
              "flex-1 px-4 py-3 text-sm font-medium transition-colors",
              activeTab === "providers"
                ? "bg-primary/10 text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            Developers ({totalProviders})
          </button>
        </div>

        {/* Content */}
        <ScrollArea className="h-[calc(100vh-280px)] max-h-[500px]">
          <div className="p-4">
            {activeTab === "tasks" ? (
              <div className="space-y-6">
                {contentTypeGroups.map((group) => {
                  const groupTypes = group.types.filter(t => 
                    availableContentTypes.some(ct => ct.type === t)
                  );
                  
                  if (groupTypes.length === 0) return null;
                  
                  return (
                    <div key={group.label}>
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                        {group.label}
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {groupTypes.map((type) => {
                          const count = getContentTypeCount(type);
                          const isSelected = selectedContentTypes.includes(type);
                          
                          return (
                            <button
                              key={type}
                              onClick={() => toggleContentType(type)}
                              className={cn(
                                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                                "border",
                                isSelected
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "bg-background text-foreground border-border hover:border-primary/50 hover:bg-primary/5"
                              )}
                            >
                              {contentTypeIcons[type]}
                              <span>{formatContentType(type)}</span>
                              <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                                {count}
                              </Badge>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-2">
                {availableProviders
                  .sort((a, b) => b.count - a.count)
                  .map((provider) => {
                    const isSelected = selectedProviders.includes(provider.name);
                    
                    return (
                      <button
                        key={provider.name}
                        onClick={() => toggleProvider(provider.name)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all",
                          "border",
                          isSelected
                            ? "bg-primary/10 text-primary border-primary"
                            : "bg-background text-foreground border-transparent hover:border-border hover:bg-muted/50"
                        )}
                      >
                        <div className="w-6 h-6 rounded bg-white p-0.5 flex items-center justify-center flex-shrink-0 shadow-sm">
                          <img
                            src={getProviderLogo(provider.name)}
                            alt=""
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              e.currentTarget.src = '/logos/artifio.png';
                            }}
                          />
                        </div>
                        <span className="flex-1 text-left truncate">{provider.name}</span>
                        <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                          {provider.count}
                        </Badge>
                      </button>
                    );
                  })}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Clear All */}
        {hasActiveFilters && (
          <div className="border-t p-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAll}
              className="w-full text-muted-foreground hover:text-foreground gap-2"
            >
              <X className="h-4 w-4" />
              Clear all filters
            </Button>
          </div>
        )}
      </div>
    </aside>
  );
}
