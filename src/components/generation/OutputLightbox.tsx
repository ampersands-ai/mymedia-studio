import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, ChevronLeft, ChevronRight, Image as ImageIcon, Share2, Heart, Scissors, Wand2, Type, RotateCcw } from "lucide-react";
import { OptimizedGenerationPreview } from "./OptimizedGenerationPreview";
import { ShareModal } from "./ShareModal";
import { ImageCropModal } from "./ImageCropModal";
import { ImageFilterModal } from "./ImageFilterModal";
import { TextOverlayModal } from "./TextOverlayModal";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useNativeShare } from "@/hooks/useNativeShare";
import { trackEvent } from "@/lib/posthog";

interface OutputLightboxProps {
  outputs: Array<{
    id: string;
    storage_path: string;
    output_index: number;
    provider_task_id?: string | null;
    model_id?: string | null;
    provider?: string | null;
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
  const [showCropModal, setShowCropModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showTextOverlayModal, setShowTextOverlayModal] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [croppedImageData, setCroppedImageData] = useState<{blob: Blob, url: string} | null>(null);
  const [filteredImageData, setFilteredImageData] = useState<{blob: Blob, url: string} | null>(null);
  const [overlayImageData, setOverlayImageData] = useState<{blob: Blob, url: string} | null>(null);

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
      let blob: Blob;
      let filename: string;
      const stages: string[] = [];
      
      // Use the latest edited image (priority: overlay > filter > crop > original)
      if (overlayImageData) {
        blob = overlayImageData.blob;
        stages.push('text');
      } else if (filteredImageData) {
        blob = filteredImageData.blob;
        stages.push('filtered');
      } else if (croppedImageData) {
        blob = croppedImageData.blob;
        stages.push('cropped');
      } else {
        // Original download logic
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const publicUrl = `${supabaseUrl}/storage/v1/object/public/generated-content/${currentOutput.storage_path}`;
        const response = await fetch(publicUrl);
        blob = await response.blob();
        const extension = currentOutput.storage_path.split('.').pop() || 'file';
        filename = `artifio-${currentOutput.output_index + 1}-${Date.now()}.${extension}`;
        trackEvent('output_downloaded', {
          generation_id: currentOutput.id,
          content_type: contentType,
          output_index: selectedIndex
        });
      }

      if (stages.length > 0) {
        filename = `artifio-${stages.join('-')}-${currentOutput.output_index + 1}-${Date.now()}.png`;
        trackEvent('edited_image_downloaded', {
          generation_id: currentOutput.id,
          edits: stages
        });
      }
      
      // Download blob
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename!;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Download started!');
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
    // Reset all edits when navigating
    setCroppedImageData(null);
    setFilteredImageData(null);
    setOverlayImageData(null);
    trackEvent('output_navigation', {
      generation_id: currentOutput.id,
      direction
    });
  };

  const handleCrop = () => {
    if (contentType === "image") {
      setShowCropModal(true);
      trackEvent('crop_initiated', { generation_id: currentOutput.id });
    }
  };

  const handleCropComplete = (blob: Blob, url: string) => {
    setCroppedImageData({ blob, url });
    // Reset downstream edits
    setFilteredImageData(null);
    setOverlayImageData(null);
    trackEvent('crop_completed', { generation_id: currentOutput.id });
  };

  const handleFilter = () => {
    if (contentType === "image") {
      setShowFilterModal(true);
      trackEvent('filter_initiated', { generation_id: currentOutput.id });
    }
  };

  const handleFilterComplete = (blob: Blob, url: string) => {
    setFilteredImageData({ blob, url });
    // Reset downstream edits
    setOverlayImageData(null);
    trackEvent('filter_completed', { generation_id: currentOutput.id });
  };

  const handleTextOverlay = () => {
    if (contentType === "image") {
      setShowTextOverlayModal(true);
      trackEvent('text_overlay_initiated', { generation_id: currentOutput.id });
    }
  };

  const handleTextOverlayComplete = (blob: Blob, url: string) => {
    setOverlayImageData({ blob, url });
    trackEvent('text_overlay_completed', { generation_id: currentOutput.id });
  };

  const handleResetAllEdits = () => {
    setCroppedImageData(null);
    setFilteredImageData(null);
    setOverlayImageData(null);
    toast.success('All edits reset');
    trackEvent('all_edits_reset', { generation_id: currentOutput.id });
  };

  const getCurrentImageUrl = () => {
    if (overlayImageData) return overlayImageData.url;
    if (filteredImageData) return filteredImageData.url;
    if (croppedImageData) return croppedImageData.url;
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    return `${supabaseUrl}/storage/v1/object/public/generated-content/${currentOutput.storage_path}`;
  };

  const hasAnyEdits = croppedImageData || filteredImageData || overlayImageData;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent 
          className="max-w-5xl max-h-[95vh] flex flex-col backdrop-blur-sm shadow-2xl animate-slide-up overflow-hidden"
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

          {/* Image Preview - Centered, viewport-relative size */}
          <div className="flex items-center justify-center bg-muted/30 rounded-lg p-3 my-2 overflow-hidden flex-shrink min-h-0 h-[75vh] relative">
            {hasAnyEdits ? (
              <img 
                src={getCurrentImageUrl()} 
                alt="Edited preview"
                className="max-w-full max-h-[75vh] w-auto h-auto object-contain rounded-lg transition-transform duration-300 hover:scale-105 cursor-pointer"
              />
            ) : (
              <OptimizedGenerationPreview
                key={currentOutput.storage_path}
                storagePath={currentOutput.storage_path}
                contentType={contentType}
                className="max-w-full max-h-[75vh] w-auto h-auto object-contain rounded-lg transition-transform duration-300 hover:scale-105 cursor-pointer"
              />
            )}
            {/* Edit badges */}
            <div className="absolute top-5 right-5 flex gap-2">
              {croppedImageData && (
                <Badge className="bg-primary/90">Cropped</Badge>
              )}
              {filteredImageData && (
                <Badge className="bg-primary/90">Filtered</Badge>
              )}
              {overlayImageData && (
                <Badge className="bg-primary/90">Text Added</Badge>
              )}
            </div>
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

          {/* Action Buttons */}
          <div className="pt-3 border-t space-y-2 flex-shrink-0">
            {/* Reset Button - Show when any edits exist */}
            {hasAnyEdits && (
              <Button
                onClick={handleResetAllEdits}
                variant="ghost"
                size="sm"
                className="w-full"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset All Edits
              </Button>
            )}

            <div className="grid grid-cols-3 sm:flex sm:flex-row gap-2">
              {/* Download - Primary Yellow */}
              <Button
                onClick={handleDownload}
                className="h-12 sm:flex-1 bg-yellow-400 hover:bg-yellow-500 text-black font-bold col-span-3 sm:col-span-1"
                aria-label="Download image"
              >
                <Download className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">
                  {hasAnyEdits ? "Download Edited" : "Download"}
                </span>
              </Button>
              
              {/* Image Edit Buttons - Only for images */}
              {contentType === "image" && (
                <>
                  <Button
                    onClick={handleCrop}
                    variant="outline"
                    className="h-12 sm:flex-1 border-2"
                    aria-label="Crop image"
                  >
                    <Scissors className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">
                      {croppedImageData ? "Re-crop" : "Crop"}
                    </span>
                  </Button>

                  <Button
                    onClick={handleFilter}
                    variant="outline"
                    className="h-12 sm:flex-1 border-2"
                    aria-label="Apply filters"
                  >
                    <Wand2 className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Filters</span>
                  </Button>

                  <Button
                    onClick={handleTextOverlay}
                    variant="outline"
                    className="h-12 sm:flex-1 border-2"
                    aria-label="Add text"
                  >
                    <Type className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Add Text</span>
                  </Button>
                </>
              )}
              
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
          <div className="text-center mt-4 pb-2 flex-shrink-0">
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

      {/* Edit Modals - Only for images */}
      {contentType === "image" && (
        <>
          <ImageCropModal
            open={showCropModal}
            onOpenChange={setShowCropModal}
            imageUrl={getCurrentImageUrl()}
            onCropComplete={handleCropComplete}
          />
          
          <ImageFilterModal
            open={showFilterModal}
            onOpenChange={setShowFilterModal}
            imageUrl={getCurrentImageUrl()}
            onFilterComplete={handleFilterComplete}
          />

          <TextOverlayModal
            open={showTextOverlayModal}
            onOpenChange={setShowTextOverlayModal}
            imageUrl={getCurrentImageUrl()}
            onOverlayComplete={handleTextOverlayComplete}
          />
        </>
      )}
    </>
  );
};
