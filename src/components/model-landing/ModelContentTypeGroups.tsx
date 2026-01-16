import { Badge } from "@/components/ui/badge";
import { formatContentType, getContentTypeIcon } from "@/lib/utils/provider-display";
import { ImageIcon, VideoIcon, AudioLinesIcon, BrushIcon, WandIcon, SparklesIcon } from "lucide-react";

interface ContentTypeGroupsProps {
  contentTypeGroups: Array<{
    contentType: string;
    recordIds: string[];
    tokenCost: number;
  }>;
}

const iconMap: Record<string, React.ElementType> = {
  Image: ImageIcon,
  Video: VideoIcon,
  Music: AudioLinesIcon,
  Brush: BrushIcon,
  Wand: WandIcon,
  Sparkles: SparklesIcon,
};

export function ModelContentTypeGroups({ contentTypeGroups }: ContentTypeGroupsProps) {
  if (!contentTypeGroups || contentTypeGroups.length === 0) {
    return null;
  }

  return (
    <section className="py-12">
      <div className="container max-w-6xl mx-auto px-4">
        <h2 className="text-2xl md:text-3xl font-bold mb-8">
          Capabilities
        </h2>
        
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {contentTypeGroups.map((group, idx) => {
            const iconName = getContentTypeIcon(group.contentType);
            const IconComponent = iconMap[iconName] || SparklesIcon;
            
            return (
              <div
                key={idx}
                className="p-6 rounded-xl border bg-card hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <IconComponent className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">
                      {formatContentType(group.contentType)}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {group.tokenCost} tokens per generation
                    </p>
                    <div className="mt-3">
                      <Badge variant="secondary" className="text-xs">
                        {group.recordIds.length} variant{group.recordIds.length > 1 ? 's' : ''}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
