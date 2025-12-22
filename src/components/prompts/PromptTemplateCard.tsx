import { Copy, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import type { PromptTemplate } from "@/hooks/usePromptTemplates";
import { cn } from "@/lib/utils";

interface PromptTemplateCardProps {
  template: PromptTemplate;
  onUse?: (prompt: string) => void;
  className?: string;
}

const categoryLabels: Record<string, string> = {
  text_to_image: "Text → Image",
  text_to_video: "Text → Video",
  image_to_video: "Image → Video",
  video_to_video: "Video → Video",
  lip_sync: "Lip Sync",
  text_to_audio: "Audio",
  image_editing: "Image Edit",
};

export const PromptTemplateCard = ({
  template,
  onUse,
  className,
}: PromptTemplateCardProps) => {
  const handleCopy = () => {
    navigator.clipboard.writeText(template.prompt);
    toast.success("Prompt copied to clipboard");
  };

  return (
    <Card className={cn("group hover:border-primary/50 transition-colors", className)}>
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {template.title && (
              <h3 className="font-bold text-sm truncate">{template.title}</h3>
            )}
            <Badge variant="secondary" className="text-xs mt-1">
              {categoryLabels[template.category] || template.category}
            </Badge>
          </div>
          {template.use_count !== null && template.use_count > 0 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Sparkles className="h-3 w-3" />
              <span>{template.use_count}</span>
            </div>
          )}
        </div>

        {/* Prompt text */}
        <p className="text-sm text-muted-foreground line-clamp-3">
          {template.prompt}
        </p>

        {/* Tags */}
        {template.tags && template.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {template.tags.slice(0, 3).map((tag, idx) => (
              <Badge key={idx} variant="outline" className="text-xs px-1.5 py-0">
                {tag}
              </Badge>
            ))}
            {template.tags.length > 3 && (
              <Badge variant="outline" className="text-xs px-1.5 py-0">
                +{template.tags.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            variant="outline"
            onClick={handleCopy}
            className="flex-1"
          >
            <Copy className="h-3.5 w-3.5 mr-1.5" />
            Copy
          </Button>
          {onUse && (
            <Button
              size="sm"
              onClick={() => onUse(template.prompt)}
              className="flex-1"
            >
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              Use
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
