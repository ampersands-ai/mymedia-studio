import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Trash2, Sparkles, AlertCircle, Flag, CheckCircle, Image as ImageIcon, Video, Music, FileText } from "lucide-react";
import { format } from "date-fns";
import { OptimizedGenerationImage } from "@/components/generation/OptimizedGenerationImage";
import { VideoPlayer } from "./VideoPlayer";
import { AudioPlayer } from "./AudioPlayer";
import { Skeleton } from "@/components/ui/skeleton";
import type { Generation } from "../hooks/useGenerationHistory";

interface GenerationDetailsModalProps {
  generation: Generation | null;
  disputeStatus: { id: string; status: string; refund_amount?: number } | null | undefined;
  isOpen: boolean;
  onClose: () => void;
  onDownload: (storagePath: string | null, type: string, outputUrl?: string | null) => void;
  onDelete: (id: string) => void;
  onReport: (generation: Generation) => void;
}

const getTypeIcon = (type: string) => {
  switch (type) {
    case "image": return <ImageIcon className="h-4 w-4" />;
    case "video": return <Video className="h-4 w-4" />;
    case "video_editor": return <Video className="h-4 w-4" />;
    case "audio": return <Music className="h-4 w-4" />;
    case "text": return <FileText className="h-4 w-4" />;
    default: return <Sparkles className="h-4 w-4" />;
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case "completed":
      return <Badge className="bg-green-500 text-white text-xs px-1.5 py-0">Done</Badge>;
    case "failed":
      return <Badge className="bg-red-500 text-white text-xs px-1.5 py-0">Failed</Badge>;
    case "pending":
    case "processing":
      return (
        <Badge className="bg-yellow-500 animate-pulse text-white text-xs px-1.5 py-0">
          {status === 'processing' ? 'Processing' : 'Pending'}
        </Badge>
      );
    default:
      return null;
  }
};

const ImageWithOptimizedLoading = ({ generation, className }: { generation: Generation; className?: string }) => {
  if (!generation.storage_path) {
    return <Skeleton className={className} />;
  }

  // Add version parameter to bust cache
  const versionedPath = `${generation.storage_path}${generation.storage_path.includes('?') ? '&' : '?'}v=${encodeURIComponent(generation.created_at)}`;

  return (
    <OptimizedGenerationImage
      storagePath={versionedPath}
      alt="Generated content"
      className={className}
    />
  );
};

export const GenerationDetailsModal = ({
  generation,
  disputeStatus,
  isOpen,
  onClose,
  onDownload,
  onDelete,
  onReport,
}: GenerationDetailsModalProps) => {
  if (!generation) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="font-black flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getTypeIcon(generation.type)}
              <span className="capitalize">{generation.type} Generation</span>
              {generation.is_batch_output && generation.output_index !== undefined && (
                <Badge variant="outline" className="text-xs">
                  Output #{generation.output_index + 1}
                </Badge>
              )}
            </div>
            {getStatusBadge(generation.status)}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {generation.status === "failed" ? (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6">
              <div className="flex items-start gap-3 mb-4">
                <AlertCircle className="h-6 w-6 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-bold text-red-500 mb-2">Generation Failed</h4>
                  <div className="space-y-3">
                    {generation.provider_response?.error || generation.provider_response?.data?.failMsg ? (
                      <p className="text-sm text-foreground/80">
                        {generation.provider_response?.error || generation.provider_response?.data?.failMsg}
                      </p>
                    ) : (
                      <>
                        <p className="text-sm text-foreground/80">
                          We couldn't complete your generation. This could be due to:
                        </p>
                        <div className="text-sm text-foreground/70 space-y-2 pl-4 border-l-2 border-red-500/30">
                          <p><strong>a.</strong> The upstream API service timed out and no results were returned. Please try again.</p>
                          <p><strong>b.</strong> The model does not support your request. Try changing the model or parameters.</p>
                        </div>
                      </>
                    )}
                    <p className="text-xs text-green-600 dark:text-green-400 font-medium mt-3">
                      ✓ Any credits deducted ({Number(generation.tokens_used).toFixed(2)}) will be refunded.
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Visit <span className="font-medium">My Creations</span> logs for more information.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (generation.storage_path || generation.output_url) && generation.status === "completed" ? (
            <div className="aspect-video relative overflow-hidden bg-muted rounded-lg">
              {(generation.type === "video" || generation.type === "video_editor" || generation.source_table === 'video_editor_job') ? (
                (generation.is_video_job || generation.source_table === 'video_editor_job') && generation.output_url ? (
                  <video
                    src={generation.output_url}
                    className="w-full h-full object-contain"
                    controls
                    preload="metadata"
                  />
                ) : (
                  <VideoPlayer
                    generation={generation}
                    className="w-full h-full object-contain"
                    showControls={true}
                  />
                )
              ) : generation.type === "image" ? (
                <ImageWithOptimizedLoading
                  generation={generation}
                  className="w-full h-full object-contain"
                />
              ) : generation.type === "audio" ? (
                <AudioPlayer
                  generation={generation}
                  className="w-full h-full"
                  showControls={true}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  {getTypeIcon(generation.type)}
                </div>
              )}
            </div>
          ) : null}

          {!generation.workflow_execution_id && (
            <div className="space-y-2">
              <h4 className="font-bold text-sm">Prompt:</h4>
              <p className="text-sm text-foreground/80">
                {generation.enhanced_prompt || generation.prompt}
              </p>
            </div>
          )}
          {generation.workflow_execution_id && (
            <div className="space-y-2">
              <h4 className="font-bold text-sm">Type:</h4>
              <p className="text-sm text-muted-foreground italic">
                Template Generation
              </p>
            </div>
          )}

          {generation.ai_caption && (
            <div className="space-y-2">
              <h4 className="font-bold text-sm flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                AI Caption:
              </h4>
              <p className="text-sm text-foreground/80 bg-muted/50 p-3 rounded-lg border">
                {generation.ai_caption}
              </p>
            </div>
          )}

          {generation.ai_hashtags && generation.ai_hashtags.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  AI Hashtags:
                </h4>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    navigator.clipboard.writeText(generation.ai_hashtags!.join(' '));
                  }}
                  className="h-7 text-xs"
                >
                  Copy All
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5 bg-muted/50 p-3 rounded-lg border">
                {generation.ai_hashtags.map((tag, idx) => (
                  <Badge
                    key={idx}
                    variant="secondary"
                    className="text-xs cursor-pointer hover:bg-primary/20"
                    onClick={() => {
                      navigator.clipboard.writeText(tag);
                    }}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{format(new Date(generation.created_at), "MMM d, yyyy 'at' h:mm a")}</span>
            {generation.is_batch_output && generation.tokens_used === 0 ? (
              <span className="text-primary font-medium">Part of batch generation</span>
            ) : (
              <span>{generation.tokens_used} credits used</span>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-4">
            {(generation.storage_path || generation.output_url) && generation.status === "completed" && (
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onDownload(generation.storage_path, generation.type, generation.output_url);
                }}
                className="w-full sm:flex-1"
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            )}
            <Button
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                onReport(generation);
              }}
              disabled={!!disputeStatus}
              className="w-full sm:flex-1"
            >
              {disputeStatus ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Already Reported
                </>
              ) : (
                <>
                  <Flag className="h-4 w-4 mr-2" />
                  Report Credit Issue
                </>
              )}
            </Button>
            <Button
              variant="destructive"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(generation.id);
                onClose();
              }}
              className="w-full sm:w-auto"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
