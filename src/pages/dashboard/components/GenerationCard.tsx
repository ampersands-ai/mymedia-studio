import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Clock, Sparkles, Image as ImageIcon, Video, Music, FileText, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { OptimizedGenerationImage } from "@/components/generation/OptimizedGenerationImage";
import { OptimizedVideoPreview } from "@/components/generation/OptimizedVideoPreview";
import { AudioPlayer } from "./AudioPlayer";
import type { Generation } from "../hooks/useGenerationHistory";
import { RECORD_ID_REGISTRY } from "@/lib/models/locked/index";
import { getDisplayableParametersString } from "@/lib/utils/parameterDisplayFilter";

interface GenerationCardProps {
  generation: Generation;
  index: number;
  onView: (generation: Generation) => void;
  onDownload: (storagePath: string | null, type: string, outputUrl?: string | null) => void;
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

/**
 * Infer the effective type from storage path extension
 * Handles cases where database type doesn't match the actual file type
 */
const getEffectiveType = (generation: Generation): string => {
  // Video editor jobs are always video type
  if (generation.source_table === 'video_editor_job' || generation.type === 'video_editor') {
    return 'video';
  }
  
  const storagePath = generation.storage_path || generation.output_url;
  if (!storagePath) return generation.type;
  
  const ext = storagePath.split('.').pop()?.toLowerCase().split('?')[0];
  
  if (['mp4', 'webm', 'mov', 'avi'].includes(ext || '')) return 'video';
  if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext || '')) return 'audio';
  if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext || '')) return 'image';
  
  return generation.type;
};

/**
 * Get model metadata from registry
 */
const getModelInfo = (generation: Generation) => {
  if (!generation.model_record_id) return null;
  const module = RECORD_ID_REGISTRY[generation.model_record_id];
  if (!module?.MODEL_CONFIG) return null;
  return {
    name: module.MODEL_CONFIG.modelName,
    group: formatContentType(module.MODEL_CONFIG.contentType),
  };
};

/**
 * Format content type for display
 */
const formatContentType = (contentType: string): string => {
  const formatMap: Record<string, string> = {
    'prompt_to_image': 'Text to Image',
    'image_editing': 'Image Editing',
    'image_to_video': 'Image to Video',
    'prompt_to_video': 'Text to Video',
    'lip_sync': 'Lip Sync',
    'video_to_video': 'Video to Video',
    'prompt_to_audio': 'Audio',
  };
  return formatMap[contentType] || contentType;
};


/**
 * Calculate and format generation time
 */
const formatGenerationTime = (generation: Generation): string | null => {
  // Prefer completed_at, fallback to caption_generated_at
  const completedTime = generation.completed_at || generation.caption_generated_at;
  if (!completedTime || generation.status !== 'completed') return null;
  
  const startTime = new Date(generation.created_at).getTime();
  const endTime = new Date(completedTime).getTime();
  const seconds = Math.round((endTime - startTime) / 1000);
  
  if (seconds < 0 || seconds > 3600) return null; // Sanity check
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
};

const getStatusBadge = (status: string, createdAt?: string) => {
  switch (status) {
    case "completed":
      return <Badge className="bg-green-500 text-white text-xs px-1.5 py-0">Done</Badge>;
    case "failed":
      return <Badge className="bg-red-500 text-white text-xs px-1.5 py-0">Failed</Badge>;
    case "pending":
    case "processing":
      // Calculate time since creation for better status messages
      if (createdAt) {
        const minutesAgo = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
        if (minutesAgo > 30) {
          return <Badge className="bg-red-500 text-white text-xs px-1.5 py-0">Stuck</Badge>;
        }
        if (minutesAgo > 15) {
          return <Badge className="bg-orange-500 text-white text-xs px-1.5 py-0">Long wait...</Badge>;
        }
      }
      return (
        <Badge className="bg-yellow-500 animate-pulse text-white text-xs px-1.5 py-0">
          <Clock className="h-2.5 w-2.5 mr-0.5 inline" />
          {status === 'processing' ? 'Processing' : 'Pending'}
        </Badge>
      );
    default:
      return null;
  }
};

const GenerationCardComponent = ({ generation, index, onView, onDownload }: GenerationCardProps) => {
  const effectiveType = getEffectiveType(generation);
  const versionedPath = generation.storage_path
    ? `${generation.storage_path}${generation.storage_path.includes('?') ? '&' : '?'}v=${encodeURIComponent(generation.created_at)}`
    : null;

  return (
    <Card
      className="overflow-hidden cursor-pointer hover-lift"
      onClick={() => onView(generation)}
    >
      <div className="aspect-square relative overflow-hidden bg-muted">
        {generation.is_batch_output && generation.output_index !== undefined && (
          <div className="absolute top-1 right-1 z-10">
            <Badge className="text-[10px] px-1.5 py-0.5 bg-secondary text-secondary-foreground backdrop-blur-sm border border-secondary shadow-sm">
              #{generation.output_index + 1}
            </Badge>
          </div>
        )}
        {generation.status === "failed" ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-red-500/10">
            <AlertCircle className="h-8 w-8 text-red-500 mb-2" />
            <span className="text-xs text-red-500 font-medium">Generation Failed</span>
          </div>
        ) : ((generation.storage_path || generation.output_url || (generation.is_video_job && generation.output_url) || generation.source_table === 'video_editor_job') && generation.status === "completed") ? (
          <>
            {effectiveType === "video" ? (
              <OptimizedVideoPreview
                storagePath={generation.storage_path}
                outputUrl={generation.output_url}
                className="w-full h-full object-cover"
                playOnHover={true}
                priority={index < 6}
                isExternalUrl={
                  generation.output_url !== null && 
                  !generation.output_url.includes('supabase.co/storage')
                }
              />
            ) : effectiveType === "image" ? (
              <OptimizedGenerationImage
                storagePath={versionedPath!}
                alt="Generated content"
                className="w-full h-full object-cover"
              />
            ) : effectiveType === "audio" ? (
              <AudioPlayer
                generation={generation}
                className="w-full h-full"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                {getTypeIcon(effectiveType)}
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {getTypeIcon(effectiveType)}
          </div>
        )}
      </div>

      <CardContent className="p-2 space-y-1">
        <div className="flex items-center justify-between flex-wrap gap-1">
          <div className="flex items-center gap-1">
            {getTypeIcon(effectiveType)}
            <span className="font-bold text-xs capitalize">{effectiveType}</span>
            {generation.ai_caption && (
              <Sparkles className="h-3 w-3 text-primary" />
            )}
          </div>
          {getStatusBadge(generation.status, generation.created_at)}
        </div>

        {/* Model info row */}
        {(() => {
          const modelInfo = getModelInfo(generation);
          const genTime = formatGenerationTime(generation);
          const params = getDisplayableParametersString(generation.settings, generation.model_record_id);
          if (!modelInfo && !genTime && !params) return null;
          return (
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground flex-wrap">
                {modelInfo && (
                  <>
                    <span className="font-medium text-foreground/70 truncate max-w-[120px]" title={modelInfo.name}>
                      {modelInfo.name}
                    </span>
                    <span className="text-muted-foreground/50">•</span>
                    <span className="text-muted-foreground/80">{modelInfo.group}</span>
                  </>
                )}
                {genTime && (
                  <>
                    {modelInfo && <span className="text-muted-foreground/50">•</span>}
                    <span className="text-muted-foreground/80">{genTime}</span>
                  </>
                )}
              </div>
              {params && (
                <p className="text-[10px] text-muted-foreground/70 line-clamp-1" title={params}>
                  {params}
                </p>
              )}
            </div>
          );
        })()}

        {!generation.workflow_execution_id && (
          <p className="text-xs text-foreground/80 line-clamp-1">
            {generation.enhanced_prompt || generation.prompt}
          </p>
        )}
        {generation.workflow_execution_id && (
          <p className="text-xs text-muted-foreground italic line-clamp-1">
            Template Generation
          </p>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{format(new Date(generation.created_at), "MMM d")}</span>
          {generation.is_batch_output && generation.tokens_used === 0 ? (
            <span className="text-green-600 dark:text-green-400 font-medium">Batch output</span>
          ) : (
            <span>{Number(generation.tokens_used).toFixed(2)} credits</span>
          )}
        </div>

        {/* Quick actions - Download without opening preview */}
        {(generation.storage_path || generation.output_url) && generation.status === "completed" && (
          <div className="flex gap-1 pt-1 border-t mt-1">
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                onDownload(generation.storage_path, generation.type, generation.output_url);
              }}
              className="flex-1 h-7 text-xs"
            >
              <Download className="h-3 w-3 mr-1" />
              Download
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Memoize to prevent unnecessary re-renders in lists
export const GenerationCard = React.memo(GenerationCardComponent);
