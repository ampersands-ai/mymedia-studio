import { Button } from "@/components/ui/button";
import { Upload, X, Video, Loader2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";

interface VideoUploadSectionProps {
  video: File | null;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
  isRequired: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
  maxDuration?: number | null;
  maxFileSize?: number;
  isUploading?: boolean;
  onDurationChange?: (duration: number | null) => void;
}

/**
 * Video upload UI with drag-and-drop support and video player preview
 */
export const VideoUploadSection: React.FC<VideoUploadSectionProps> = ({
  video,
  onUpload,
  onRemove,
  isRequired,
  fileInputRef,
  maxDuration,
  maxFileSize = 10 * 1024 * 1024,
  isUploading = false,
  onDurationChange,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const onDurationChangeRef = useRef(onDurationChange);

  // Keep ref in sync with prop
  useEffect(() => {
    onDurationChangeRef.current = onDurationChange;
  }, [onDurationChange]);

  // Calculate video duration and create stable blob URL when file changes
  useEffect(() => {
    if (!video) {
      setVideoDuration(null);
      setVideoPreviewUrl(null);
      onDurationChangeRef.current?.(null);
      return;
    }

    // Create blob URL once for this video file
    const blobUrl = URL.createObjectURL(video);
    setVideoPreviewUrl(blobUrl);

    const videoEl = document.createElement('video');
    videoEl.preload = 'metadata';
    videoEl.onloadedmetadata = () => {
      setVideoDuration(videoEl.duration);
      onDurationChangeRef.current?.(videoEl.duration);
    };
    videoEl.src = blobUrl;

    return () => {
      URL.revokeObjectURL(blobUrl);
    };
  }, [video]);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!video) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === e.target) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (video) return;

    const files = Array.from(e.dataTransfer.files);
    const videoFiles = files.filter(file => 
      file.type.startsWith('video/')
    );

    // Show error if non-video files were dropped
    if (videoFiles.length === 0 && files.length > 0) {
      toast.error("Please upload a video file (MP4, MOV, MKV, WebM, AVI)");
      return;
    }

    if (videoFiles.length > 0) {
      const syntheticEvent = {
        target: { files: [videoFiles[0]] }
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      
      onUpload(syntheticEvent);
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const maxFileSizeMB = Math.round(maxFileSize / 1024 / 1024);

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-foreground">
        Upload Video {isRequired && <span className="text-destructive">*</span>}
        {maxDuration && (
          <span className="text-xs text-muted-foreground ml-2">
            (Max {maxDuration}s)
          </span>
        )}
      </label>

      {/* Uploaded video preview */}
      {video && (
        <div className="space-y-2">
          <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
              <Video className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{video.name}</p>
              <p className="text-xs text-muted-foreground">
                {videoDuration ? formatDuration(videoDuration) : 'Loading...'} • {(video.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={onRemove}
              aria-label="Remove video"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Video player */}
          {videoPreviewUrl && (
            <video
              ref={videoRef}
              src={videoPreviewUrl}
              controls
              className="w-full rounded-lg max-h-48 bg-black"
            />
          )}

          {/* Change video button */}
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={onUpload}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="w-full"
            disabled={isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Change Video
              </>
            )}
          </Button>
        </div>
      )}

      {/* Upload zone */}
      {!video && (
        <div
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            relative border-2 border-dashed rounded-lg p-8 text-center
            transition-all duration-200
            ${isDragging 
              ? 'border-primary bg-primary/5 scale-[1.02]' 
              : 'border-border hover:border-primary/50'
            }
            ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={onUpload}
            className="hidden"
            disabled={isUploading}
          />
          
          {isDragging ? (
            <div className="space-y-2">
              <Video className="h-10 w-10 mx-auto text-primary animate-bounce" />
              <p className="text-base font-medium text-primary">
                Drop video file here
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <Video className="h-10 w-10 mx-auto text-muted-foreground" />
              <div>
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="mb-2"
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    'Choose File'
                  )}
                </Button>
                <p className="text-sm text-muted-foreground">
                  or drag and drop video here
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Supported formats: MP4, MOV, MKV, WebM, AVI (max {maxFileSizeMB}MB)
      </p>
    </div>
  );
};
