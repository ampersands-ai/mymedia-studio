import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Download, Play, AlertCircle, CheckCircle2 } from "lucide-react";
import { useVideoUrl } from "@/hooks/media/useVideoUrl";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

/**
 * Video generation item data
 */
interface VideoGeneration {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  storage_path?: string | null;
  video_url?: string | null;
  created_at: string;
  error_message?: string | null;
  duration_seconds?: number | null;
}

/**
 * Props for VideoGenerationsList component
 */
interface VideoGenerationsListProps {
  generations: VideoGeneration[];
  onPlay?: (generation: VideoGeneration) => void;
  onDownload?: (generation: VideoGeneration) => void;
  className?: string;
}

/**
 * Status badge component
 */
const StatusBadge = ({ status }: { status: VideoGeneration['status'] }) => {
  const config = {
    pending: { label: 'Pending', variant: 'secondary' as const, icon: Loader2 },
    processing: { label: 'Processing', variant: 'default' as const, icon: Loader2 },
    completed: { label: 'Completed', variant: 'outline' as const, icon: CheckCircle2 },
    failed: { label: 'Failed', variant: 'destructive' as const, icon: AlertCircle },
  };

  const { label, variant, icon: Icon } = config[status];
  const isAnimated = status === 'pending' || status === 'processing';

  return (
    <Badge variant={variant} className="gap-1">
      <Icon className={cn("h-3 w-3", isAnimated && "animate-spin")} />
      {label}
    </Badge>
  );
};

/**
 * Individual video generation item
 */
const VideoGenerationItem = ({
  generation,
  onPlay,
  onDownload,
}: {
  generation: VideoGeneration;
  onPlay?: (generation: VideoGeneration) => void;
  onDownload?: (generation: VideoGeneration) => void;
}) => {
  const { url: signedUrl, isLoading } = useVideoUrl(
    generation.status === 'completed' ? generation.storage_path : null,
    { strategy: 'public-direct', bucket: 'generated-content' }
  );

  const isPlayable = generation.status === 'completed' && signedUrl;
  const isDownloadable = generation.status === 'completed' && signedUrl;
  const timeAgo = formatDistanceToNow(new Date(generation.created_at), { addSuffix: true });

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <StatusBadge status={generation.status} />
            {generation.duration_seconds && (
              <span className="text-sm text-muted-foreground">
                {generation.duration_seconds}s
              </span>
            )}
          </div>
          
          <p className="text-sm text-muted-foreground">
            Created {timeAgo}
          </p>

          {generation.status === 'failed' && generation.error_message && (
            <p className="text-sm text-destructive mt-2">
              {generation.error_message}
            </p>
          )}
        </div>

        <div className="flex gap-2">
          {isPlayable && onPlay && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPlay(generation)}
              disabled={isLoading}
            >
              <Play className="h-4 w-4 mr-1" />
              Play
            </Button>
          )}
          
          {isDownloadable && onDownload && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDownload(generation)}
              disabled={isLoading}
            >
              <Download className="h-4 w-4 mr-1" />
              Download
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};

/**
 * List of video generations for storyboard
 * Displays status, actions, and metadata for each generation
 */
export const VideoGenerationsList = ({
  generations,
  onPlay,
  onDownload,
  className,
}: VideoGenerationsListProps) => {
  if (generations.length === 0) {
    return (
      <Card className={cn("p-8 text-center", className)}>
        <p className="text-muted-foreground">No video generations yet</p>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">
          Video Generations ({generations.length})
        </h3>
      </div>

      {generations.map((generation) => (
        <VideoGenerationItem
          key={generation.id}
          generation={generation}
          onPlay={onPlay}
          onDownload={onDownload}
        />
      ))}
    </div>
  );
};
