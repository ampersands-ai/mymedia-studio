import { Card } from "@/components/ui/card";
import { XCircle } from "lucide-react";
import { VideoFromAudioPreview } from "@/components/generation/VideoFromAudioPreview";
import { VideoGenerationProgress } from "@/components/video/VideoGenerationProgress";

interface VideoGenerationListProps {
  videoGenerations: any[];
  parentGenerationId: string | null;
  onRegenerate?: (outputIndex: number) => void;
  generatingVideoIndex: number | null;
}

/**
 * List of generated videos from audio
 */
export const VideoGenerationList: React.FC<VideoGenerationListProps> = ({
  videoGenerations,
  parentGenerationId,
  onRegenerate,
  generatingVideoIndex,
}) => {
  if (!videoGenerations || videoGenerations.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3 mt-4">
      <h3 className="text-sm font-semibold text-muted-foreground">Generated Videos</h3>
      {videoGenerations.map((video) => (
        <div key={video.id}>
          {video.status === 'completed' && video.storage_path ? (
            <VideoFromAudioPreview
              storagePath={video.storage_path}
              outputIndex={video.output_index}
              onRegenerate={
                onRegenerate && parentGenerationId
                  ? () => onRegenerate(video.output_index)
                  : undefined
              }
            />
          ) : video.status === 'pending' || video.status === 'processing' ? (
            <VideoGenerationProgress
              generationId={video.id}
              outputIndex={video.output_index}
            />
          ) : video.status === 'failed' ? (
            <Card className="p-4 bg-destructive/10 border-destructive/20">
              <div className="flex items-center gap-2 text-destructive">
                <XCircle className="h-4 w-4" />
                <span className="text-sm">
                  Video generation failed for Track #{video.output_index + 1}
                </span>
              </div>
            </Card>
          ) : null}
        </div>
      ))}
    </div>
  );
};
