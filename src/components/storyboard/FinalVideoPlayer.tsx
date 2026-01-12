/**
 * Final Video Player Component
 * Video player with download and open in new tab buttons
 */

import { useState, useEffect } from 'react';
import { Loader2, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import { supabase } from '@/integrations/supabase/client';

interface FinalVideoPlayerProps {
  videoUrl: string | null;
  storyboardId: string;
  isLoading: boolean;
  storagePath?: string | null;
}

export const FinalVideoPlayer = ({
  videoUrl,
  storyboardId,
  isLoading,
  storagePath,
}: FinalVideoPlayerProps) => {
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [isCreatingShareLink, setIsCreatingShareLink] = useState(false);

  // Create share link when video is available
  useEffect(() => {
    if (videoUrl && storagePath && !shareUrl && !isCreatingShareLink) {
      createShareLink();
    }
  }, [videoUrl, storagePath]);

  const createShareLink = async () => {
    if (!storagePath) return;
    
    setIsCreatingShareLink(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setIsCreatingShareLink(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('create-share-link', {
        body: {
          storage_path: storagePath,
          content_type: 'video',
          bucket_name: 'generated-content'
        }
      });

      if (!error && data?.share_url) {
        setShareUrl(data.share_url);
      }
    } catch (err) {
      logger.warn('Failed to create share link, falling back to direct URL', {
        component: 'FinalVideoPlayer',
        operation: 'createShareLink',
        storyboardId
      });
    } finally {
      setIsCreatingShareLink(false);
    }
  };

  const handleCopyLink = async () => {
    const urlToCopy = shareUrl || videoUrl;
    if (!urlToCopy) return;
    
    try {
      await navigator.clipboard.writeText(urlToCopy);
      toast.success('Link copied to clipboard!');
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const handleDownload = async () => {
    try {
      if (!videoUrl) {
        toast.error('Video URL not available');
        return;
      }
      
      const response = await fetch(videoUrl);
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `storyboard-${storyboardId}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      logger.error('Video download failed', error instanceof Error ? error : new Error(String(error)), {
        component: 'FinalVideoPlayer',
        operation: 'handleDownload',
        storyboardId,
        videoUrl
      });
      toast.error('Failed to download video. Try "Open in New Tab" and save from there.', { 
        id: 'download-video' 
      });
    }
  };

  const displayUrl = shareUrl || videoUrl || '';

  return (
    <div className="space-y-2">
      <h3 className="text-lg font-bold">🎬 Final Video</h3>
      <div className="rounded-lg overflow-hidden border border-primary/20 bg-black">
        {isLoading ? (
          <div className="w-full aspect-video flex items-center justify-center bg-muted">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <video
            controls
            className="w-full aspect-video"
            src={videoUrl || undefined}
            preload="metadata"
            crossOrigin="anonymous"
          >
            Your browser does not support the video tag.
          </video>
        )}
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={() => window.open(displayUrl, '_blank')}
          disabled={isCreatingShareLink || !displayUrl}
        >
          {isCreatingShareLink ? (
            <>
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              Creating link...
            </>
          ) : (
            'Open in New Tab'
          )}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopyLink}
          disabled={!displayUrl}
          title="Copy link"
        >
          <Link2 className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={handleDownload}
        >
          Download
        </Button>
      </div>
    </div>
  );
};