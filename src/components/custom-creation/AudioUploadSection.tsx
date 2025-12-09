import { Button } from "@/components/ui/button";
import { Upload, X, Volume2, Loader2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";

interface AudioUploadSectionProps {
  audio: File | null;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
  isRequired: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
  maxDuration?: number | null;
  isUploading?: boolean;
}

/**
 * Audio upload UI with drag-and-drop support and audio player preview
 */
export const AudioUploadSection: React.FC<AudioUploadSectionProps> = ({
  audio,
  onUpload,
  onRemove,
  isRequired,
  fileInputRef,
  maxDuration,
  isUploading = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [audioDuration, setAudioDuration] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Get audio duration when file changes
  useEffect(() => {
    if (!audio) {
      setAudioDuration(null);
      return;
    }

    const audioEl = new Audio();
    audioEl.onloadedmetadata = () => {
      setAudioDuration(audioEl.duration);
    };
    audioEl.src = URL.createObjectURL(audio);

    return () => {
      URL.revokeObjectURL(audioEl.src);
    };
  }, [audio]);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!audio) {
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

    if (audio) return;

    const files = Array.from(e.dataTransfer.files);
    const audioFiles = files.filter(file => 
      file.type.startsWith('audio/')
    );

    // Show error if non-audio files were dropped
    if (audioFiles.length === 0 && files.length > 0) {
      toast.error("Please upload an audio file (MP3, WAV, AAC, M4A, OGG, FLAC)");
      return;
    }

    if (audioFiles.length > 0) {
      const syntheticEvent = {
        target: { files: [audioFiles[0]] }
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      
      onUpload(syntheticEvent);
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-foreground">
        Upload Audio {isRequired && <span className="text-destructive">*</span>}
        {maxDuration && (
          <span className="text-xs text-muted-foreground ml-2">
            (Max {maxDuration}s)
          </span>
        )}
      </label>

      {/* Uploaded audio preview */}
      {audio && (
        <div className="space-y-2">
          <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
              <Volume2 className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{audio.name}</p>
              <p className="text-xs text-muted-foreground">
                {audioDuration ? formatDuration(audioDuration) : 'Loading...'} • {(audio.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={onRemove}
              aria-label="Remove audio"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Audio player */}
          <audio
            ref={audioRef}
            src={URL.createObjectURL(audio)}
            controls
            className="w-full h-10"
          />

          {/* Change audio button */}
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
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
                Change Audio
              </>
            )}
          </Button>
        </div>
      )}

      {/* Upload zone */}
      {!audio && (
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
            accept="audio/*"
            onChange={onUpload}
            className="hidden"
            disabled={isUploading}
          />
          
          {isDragging ? (
            <div className="space-y-2">
              <Volume2 className="h-10 w-10 mx-auto text-primary animate-bounce" />
              <p className="text-base font-medium text-primary">
                Drop audio file here
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <Volume2 className="h-10 w-10 mx-auto text-muted-foreground" />
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
                  or drag and drop audio here
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Supported formats: MP3, WAV, AAC, M4A, OGG, FLAC (max 10MB)
      </p>
    </div>
  );
};
