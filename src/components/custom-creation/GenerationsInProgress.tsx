import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Image, Video, Music, ChevronRight } from "lucide-react";
import { useActiveGenerations } from "@/hooks/useActiveGenerations";
import { useConcurrentGenerationLimit } from "@/hooks/useConcurrentGenerationLimit";
import { formatDistanceToNow } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface GenerationsInProgressProps {
  onNavigateToGeneration?: (modelRecordId: string) => void;
  currentModelRecordId?: string | null;
}

export const GenerationsInProgress = ({ 
  onNavigateToGeneration,
  currentModelRecordId 
}: GenerationsInProgressProps) => {
  const { data: activeGenerations = [], isLoading } = useActiveGenerations();
  const { data: maxConcurrent = 1 } = useConcurrentGenerationLimit();

  const getContentIcon = (contentType: string) => {
    switch (contentType) {
      case "video":
        return <Video className="h-4 w-4" />;
      case "audio":
        return <Music className="h-4 w-4" />;
      default:
        return <Image className="h-4 w-4" />;
    }
  };

  if (isLoading || activeGenerations.length === 0) {
    return null;
  }

  return (
    <Card className="p-4 mb-6 border-primary/20 bg-muted/30">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <h3 className="font-semibold text-sm">Generations in Progress</h3>
        </div>
        <Badge variant="secondary" className="text-xs">
          {activeGenerations.length}/{maxConcurrent}
        </Badge>
      </div>

      <ScrollArea className="max-h-[240px]">
        <div className="space-y-2">
          {activeGenerations.map((gen) => (
            <div
              key={gen.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border bg-background/50 transition-colors",
                gen.model_record_id === currentModelRecordId && "border-primary bg-primary/5"
              )}
            >
              <div className="flex-shrink-0">
                {getContentIcon(gen.content_type)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-xs font-medium truncate">{gen.model_name}</p>
                  <Badge 
                    variant={gen.status === "processing" ? "default" : "secondary"}
                    className="text-[10px] h-5"
                  >
                    {gen.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {gen.prompt.length > 50 ? `${gen.prompt.slice(0, 50)}...` : gen.prompt}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(gen.created_at), { addSuffix: true })}
                </p>
              </div>

              {gen.model_record_id !== currentModelRecordId && onNavigateToGeneration && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 flex-shrink-0"
                  onClick={() => onNavigateToGeneration(gen.model_record_id)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      {activeGenerations.length >= maxConcurrent && (
        <div className="mt-3 p-2 rounded-md bg-warning/10 border border-warning/20">
          <p className="text-xs text-warning-foreground">
            You've reached your concurrent generation limit. Upgrade your plan for more simultaneous generations.
          </p>
        </div>
      )}
    </Card>
  );
};
