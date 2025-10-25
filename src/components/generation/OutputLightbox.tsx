import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, ChevronLeft, ChevronRight, Image as ImageIcon, Share2, RefreshCw, Heart } from "lucide-react";
import { OptimizedGenerationPreview } from "./OptimizedGenerationPreview";
import { ShareModal } from "./ShareModal";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useNativeShare } from "@/hooks/useNativeShare";
import { trackEvent } from "@/lib/posthog";

interface OutputLightboxProps {
  outputs: Array<{
    id: string;
    storage_path: string;
    output_index: number;
  }>;
  selectedIndex: number;
  contentType: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate: (direction: 'prev' | 'next') => void;
}

export const OutputLightbox = ({
  outputs,
  selectedIndex,
  contentType,
  open,
  onOpenChange,
  onNavigate
}: OutputLightboxProps) => {
  const currentOutput = outputs[selectedIndex];
  const { shareFile, canShare } = useNativeShare();
  const [showShareModal, setShowShareModal] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  // Track modal open
  useEffect(() => {
    if (open && currentOutput) {
      trackEvent('output_lightbox_opened', {
        generation_id: currentOutput.id,
        content_type: contentType,
        output_index: selectedIndex
      });
    }
  }, [open, currentOutput, contentType, selectedIndex]);

  // Swipe to close gesture
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientY);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientY);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isDownSwipe = distance < -minSwipeDistance;
    if (isDownSwipe) {
      onOpenChange(false);
      trackEvent('output_lightbox_swipe_close');
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onOpenChange(false);
      } else if (e.key === 'ArrowLeft' && selectedIndex > 0) {
        handleNavigate('prev');
      } else if (e.key === 'ArrowRight' && selectedIndex < outputs.length - 1) {
        handleNavigate('next');
      } else if (e.key === 'd' || e.key === 'D') {
        handleDownload();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, selectedIndex, outputs.length]);

  const handleDownload = async () => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const publicUrl = `${supabaseUrl}/storage/v1/object/public/generated-content/${currentOutput.storage_path}`;
      
      const response = await fetch(publicUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const extension = currentOutput.storage_path.split('.').pop() || 'file';
      a.download = `artifio-${currentOutput.output_index + 1}-${Date.now()}.${extension}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Download started!');
      trackEvent('output_downloaded', {
        generation_id: currentOutput.id,
        content_type: contentType,
        output_index: selectedIndex
      });
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download');
    }
  };

  const handleShare = async () => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const publicUrl = `${supabaseUrl}/storage/v1/object/public/generated-content/${currentOutput.storage_path}`;
      
      if (canShare) {
        await shareFile(publicUrl, 'Created with artifio.ai');
        trackEvent('output_shared', {
          generation_id: currentOutput.id,
          content_type: contentType,
          share_method: 'native'
        });
      } else {
        setShowShareModal(true);
      }
    } catch (error) {
      console.error('Share error:', error);
      setShowShareModal(true);
    }
  };

  const handleRegenerate = () => {
    toast.info('Regenerate feature coming soon!');
    trackEvent('output_regenerate_clicked', {
      generation_id: currentOutput.id
    });
  };

  const handleSave = () => {
    setIsSaved(!isSaved);
    toast.success(isSaved ? 'Removed from favorites' : 'Saved to favorites!');
    trackEvent('output_save_toggled', {
      generation_id: currentOutput.id,
      is_saved: !isSaved
    });
  };

  const handleNavigate = (direction: 'prev' | 'next') => {
    onNavigate(direction);
    trackEvent('output_navigation', {
      generation_id: currentOutput.id,
      direction
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent 
          className="max-w-2xl max-h-[90vh] overflow-y-auto backdrop-blur-sm shadow-2xl animate-slide-up"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {/* Pull to close indicator - Mobile only */}
          <div className="flex justify-center py-2 md:hidden">
            <div className="w-12 h-1 bg-muted-foreground/30 rounded-full" />
          </div>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <ImageIcon className="h-4 w-4" />
            {contentType === "image" ? "Image" : contentType === "video" ? "Video" : "Output"} Generation
            {outputs.length > 1 && (
              <Badge variant="secondary" className="ml-auto">
                {selectedIndex + 1} of {outputs.length}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

          {/* Image Preview - Centered, reasonable size */}
          <div className="flex items-center justify-center bg-muted/30 rounded-lg p-4 my-4 overflow-hidden">
            <OptimizedGenerationPreview
              storagePath={currentOutput.storage_path}
              contentType={contentType}
              className="max-w-full max-h-[400px] object-contain rounded-lg transition-transform duration-300 hover:scale-105 cursor-pointer"
            />
          </div>

          {/* Navigation Controls (only if multiple outputs) */}
          {outputs.length > 1 && (
            <div className="flex items-center justify-center gap-2 mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleNavigate('prev')}
                disabled={selectedIndex === 0}
                aria-label="Previous image"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleNavigate('next')}
                disabled={selectedIndex === outputs.length - 1}
                aria-label="Next image"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}

          {/* Action Buttons - 2x2 grid on mobile, horizontal on desktop */}
          <div className="pt-4 border-t space-y-3">
            <div className="grid grid-cols-2 sm:flex sm:flex-row gap-2">
              {/* Download - Primary Yellow */}
              <Button
                onClick={handleDownload}
                className="h-12 sm:flex-1 bg-yellow-400 hover:bg-yellow-500 text-black font-bold"
                aria-label="Download image"
              >
                <Download className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Download</span>
              </Button>
              
              {/* Share - Secondary */}
              <Button
                onClick={handleShare}
                variant="outline"
                className="h-12 sm:flex-1 border-2"
                aria-label="Share image"
              >
                <Share2 className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Share</span>
              </Button>
              
              {/* Regenerate - Secondary */}
              <Button
                onClick={handleRegenerate}
                variant="outline"
                className="h-12 sm:flex-1 border-2"
                aria-label="Regenerate similar"
              >
                <RefreshCw className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Regenerate</span>
              </Button>
              
              {/* Save - Icon only with heart */}
              <Button
                onClick={handleSave}
                variant="outline"
                className="h-12 sm:w-12 border-2"
                aria-label={isSaved ? "Remove from favorites" : "Save to favorites"}
              >
                <Heart className={`h-4 w-4 ${isSaved ? 'fill-current text-red-500' : ''}`} />
              </Button>
            </div>
          </div>

          {/* Keyboard Shortcuts Hint */}
          <div className="text-center mt-2">
            <p className="text-xs text-muted-foreground">
              <span className="hidden md:inline">
                Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">←</kbd> <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">→</kbd> to navigate • 
              </span>
              <span className="md:hidden">Swipe down to close • </span>
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">ESC</kbd> to close
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Share Modal Fallback */}
      <ShareModal
        open={showShareModal}
        onOpenChange={setShowShareModal}
        imageUrl={currentOutput?.storage_path || ''}
        onDownload={handleDownload}
      />
    </>
  );
};
