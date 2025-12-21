import { Loader2, Play, Download, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useVideoEditorRender } from '../hooks/useVideoEditorRender';
import { useVideoEditorStore } from '../store';

export const RenderButton = () => {
  const { submitRender, cancelRender, retryRender, isRendering } = useVideoEditorRender();
  const { renderStatus, renderProgress, finalVideoUrl, errorMessage, clips } = useVideoEditorStore();

  if (renderStatus === 'done' && finalVideoUrl) {
    return (
      <div className="space-y-3">
        <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg text-center">
          <p className="text-green-500 font-medium">Video rendered successfully!</p>
        </div>
        <div className="flex gap-2">
          <Button asChild className="flex-1">
            <a href={finalVideoUrl} target="_blank" rel="noopener noreferrer" download>
              <Download className="h-4 w-4 mr-2" />
              Download Video
            </a>
          </Button>
          <Button variant="outline" onClick={retryRender}>
            <RefreshCw className="h-4 w-4 mr-2" />
            New Render
          </Button>
        </div>
      </div>
    );
  }

  if (renderStatus === 'failed') {
    return (
      <div className="space-y-3">
        <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg text-center">
          <p className="text-destructive font-medium">Render failed</p>
          {errorMessage && <p className="text-sm text-muted-foreground mt-1">{errorMessage}</p>}
        </div>
        <Button onClick={retryRender} className="w-full">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry Render
        </Button>
      </div>
    );
  }

  if (isRendering) {
    return (
      <div className="space-y-3">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground capitalize">{renderStatus.replace('_', ' ')}...</span>
            <span>{renderProgress}%</span>
          </div>
          <Progress value={renderProgress} />
        </div>
        <Button variant="outline" onClick={cancelRender} className="w-full">
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <Button
      onClick={submitRender}
      disabled={clips.length === 0}
      size="lg"
      className="w-full"
    >
      <Play className="h-4 w-4 mr-2" />
      Render Video
    </Button>
  );
};
