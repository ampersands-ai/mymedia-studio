import { useState } from "react";
import { Music, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAudioUrl } from "@/hooks/media";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Generation } from "../hooks/useGenerationHistory";

interface AudioPlayerProps {
  generation: Generation;
  className?: string;
  showControls?: boolean;
}

export const AudioPlayer = ({ generation, className, showControls = false }: AudioPlayerProps) => {
  const { url: signedUrl, isLoading, error } = useAudioUrl(
    generation.storage_path,
    { strategy: 'public-direct', bucket: 'generated-content' }
  );
  const [audioError, setAudioError] = useState(false);

  // Show download fallback if we encounter error or no path
  if (!generation.storage_path || audioError || error) {
    return (
      <div className={`${className} flex flex-col items-center justify-center bg-muted gap-2 p-4`}>
        <Music className="h-8 w-8 text-gray-600 dark:text-gray-400" />
        <p className="text-xs text-muted-foreground text-center">Audio Preview Unavailable</p>
        <Button
          size="sm"
          variant="outline"
          onClick={async (e) => {
            e.stopPropagation();
            if (generation.storage_path) {
              try {
                const { data } = await supabase.storage
                  .from('generated-content')
                  .createSignedUrl(generation.storage_path!, 60);
                if (data?.signedUrl) {
                  const response = await fetch(data.signedUrl);
                  const blob = await response.blob();
                  const blobUrl = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = blobUrl;
                  a.download = `audio-${Date.now()}.mp3`;
                  document.body.appendChild(a);
                  a.click();
                  window.URL.revokeObjectURL(blobUrl);
                  document.body.removeChild(a);
                }
              } catch {
                toast.error('Failed to download', { id: 'audio-download' });
              }
            }
          }}
        >
          <Download className="h-4 w-4 mr-2" />
          Download Audio
        </Button>
      </div>
    );
  }

  if (isLoading || !signedUrl) {
    return (
      <div className={`${className} flex items-center justify-center bg-muted`}>
        <Music className="h-8 w-8 text-gray-600 dark:text-gray-400 animate-pulse" />
      </div>
    );
  }

  if (showControls) {
    return (
      <div className="flex flex-col gap-4 p-6 bg-gradient-to-br from-background to-muted/30 rounded-lg">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <Music className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">Audio File</p>
            <p className="text-xs text-muted-foreground">Generated audio content</p>
          </div>
        </div>
        <audio
          src={signedUrl}
          className="w-full"
          controls
          preload="metadata"
          onError={() => setAudioError(true)}
        />
      </div>
    );
  }

  return (
    <div className={`${className} flex items-center justify-center bg-gradient-to-br from-background to-muted/30`}>
      <Music className="h-8 w-8 text-green-600 dark:text-green-400" />
    </div>
  );
};
