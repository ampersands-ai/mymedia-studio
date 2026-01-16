import { ArrowRight, Image, Video, Mic, Wand2, RefreshCw, Film, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ContentTypeGroup } from "@/hooks/useModelPages";

interface ModelVariantSelectorProps {
  contentTypeGroups: ContentTypeGroup[];
  hiddenContentTypes: string[];
  onTryVariant: (recordId: string) => void;
  modelName: string;
}

const CONTENT_TYPE_CONFIG: Record<string, { 
  icon: React.ReactNode; 
  label: string; 
  description: string;
  color: string;
}> = {
  prompt_to_image: {
    icon: <Image className="w-5 h-5" />,
    label: "Text to Image",
    description: "Generate stunning images from text descriptions",
    color: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  },
  image_editing: {
    icon: <Pencil className="w-5 h-5" />,
    label: "Image Editing",
    description: "Edit and enhance existing images with AI",
    color: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
  image_to_image: {
    icon: <RefreshCw className="w-5 h-5" />,
    label: "Image to Image",
    description: "Transform images into new variations",
    color: "bg-green-500/10 text-green-600 dark:text-green-400",
  },
  image_to_video: {
    icon: <Film className="w-5 h-5" />,
    label: "Image to Video",
    description: "Animate your images into dynamic videos",
    color: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  },
  prompt_to_video: {
    icon: <Video className="w-5 h-5" />,
    label: "Text to Video",
    description: "Create videos directly from text prompts",
    color: "bg-red-500/10 text-red-600 dark:text-red-400",
  },
  video_to_video: {
    icon: <RefreshCw className="w-5 h-5" />,
    label: "Video to Video",
    description: "Transform and restyle existing videos",
    color: "bg-pink-500/10 text-pink-600 dark:text-pink-400",
  },
  lip_sync: {
    icon: <Mic className="w-5 h-5" />,
    label: "Lip Sync",
    description: "Sync audio with video for realistic speech",
    color: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
  },
  prompt_to_audio: {
    icon: <Mic className="w-5 h-5" />,
    label: "Audio Generation",
    description: "Generate audio and music from text",
    color: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
};

export function ModelVariantSelector({
  contentTypeGroups,
  hiddenContentTypes,
  onTryVariant,
  modelName,
}: ModelVariantSelectorProps) {
  // Filter out hidden content types
  const visibleGroups = contentTypeGroups.filter(
    (group) => !hiddenContentTypes.includes(group.content_type)
  );

  if (visibleGroups.length === 0) {
    return null;
  }

  // Don't show if only one variant (no need for selector)
  if (visibleGroups.length === 1) {
    return null;
  }

  return (
    <div className="mt-12 pt-8 border-t border-border/50">
      <div className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">
            Available Capabilities
          </h2>
          <p className="text-muted-foreground">
            {modelName} supports multiple content types. Choose the capability you want to use.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleGroups.map((group) => {
            const config = CONTENT_TYPE_CONFIG[group.content_type] || {
              icon: <Wand2 className="w-5 h-5" />,
              label: group.content_type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
              description: `Use ${modelName} for ${group.content_type.replace(/_/g, " ")}`,
              color: "bg-gray-500/10 text-gray-600 dark:text-gray-400",
            };

            return (
              <Card
                key={group.record_id}
                className="group relative overflow-hidden transition-all duration-200 hover:shadow-lg hover:border-primary/50 cursor-pointer"
                onClick={() => onTryVariant(group.record_id)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-lg ${config.color}`}>
                      {config.icon}
                    </div>
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{config.label}</CardTitle>
                      {group.model_name && (
                        <Badge variant="outline" className="text-xs font-normal">
                          {group.model_name}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <CardDescription className="text-sm">
                    {config.description}
                  </CardDescription>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      onTryVariant(group.record_id);
                    }}
                  >
                    Try Now
                    <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
