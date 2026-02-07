import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Download, ChevronLeft, ChevronRight, Image as ImageIcon, Share2, Heart, Scissors, Wand2, Type, Sparkles, Clock, Layout, Maximize2, Minimize2 } from "lucide-react";
import { OptimizedGenerationPreview } from "./OptimizedGenerationPreview";
import { ShareModal } from "./ShareModal";
import { ImageCropModal } from "./ImageCropModal";
import { ImageFilterModal } from "./ImageFilterModal";
import { TextOverlayModal } from "./TextOverlayModal";
import { ImageEffectsModal } from "./ImageEffectsModal";
import { ImageHistoryPanel } from "./ImageHistoryPanel";
import { SocialMediaTemplates } from "./SocialMediaTemplates";
import { useImageEditHistory } from "@/hooks/useImageEditHistory";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { useNativeShare } from "@/hooks/useNativeShare";
import { trackEvent } from "@/lib/posthog";
import { applyTextOverlay } from "@/utils/text-overlay";
import { getCroppedImg } from "@/utils/crop-canvas";
import type { SocialMediaTemplate } from "@/utils/social-media-templates";
import { logger } from "@/lib/logger";
import { brand, downloadFilename } from "@/config/brand";

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
  onDownloadSuccess?: () => void;
}

export const OutputLightbox = ({
  outputs,
  selectedIndex,
  contentType,
  open,
  onOpenChange,
  onNavigate,
  onDownloadSuccess
}: OutputLightboxProps) => {
  const currentOutput = outputs[selectedIndex];
  const { shareFile, canShare } = useNativeShare();
  const {
    history,
    currentIndex,
    addToHistory,
    goToHistoryEntry,
    undo,
    redo,
    clearHistory,
    getCurrentEntry,
    canUndo,
    canRedo,
  } = useImageEditHistory();

  const [showShareModal, setShowShareModal] = useState(false);
  const [showCropModal, setShowCropModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showTextOverlayModal, setShowTextOverlayModal] = useState(false);
  const [showEffectsModal, setShowEffectsModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [displayMode, setDisplayMode] = useState<'fit' | 'fill'>('fit');

  // Initialize history with original image when modal opens
  useEffect(() => {
    if (open && currentOutput && history.length === 0) {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const originalUrl = `${supabaseUrl}/storage/v1/object/public/generated-content/${currentOutput.storage_path}`;

      // Fetch and add original to history
      (async () => {
        try {
          const res = await fetch(originalUrl);
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          addToHistory({
            blob,
            url,
            editType: 'original',
            description: 'Original image',
          });
        } catch (err) {
          logger.error('Failed to load original image', err as Error, {
            component: 'OutputLightbox',
            operation: 'loadOriginal',
            generationId: currentOutput.id
          });
          toast.error('Failed to load original image. Please try again.');
        }
      })();

      trackEvent('output_lightbox_opened', {
        generation_id: currentOutput.id,
        content_type: contentType,
        output_index: selectedIndex
      });
    }

    // Cleanup history when modal closes
    if (!open && history.length > 0) {
      clearHistory();
    }
  }, [open, currentOutput, contentType, selectedIndex, addToHistory, clearHistory, history.length]);

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

  const handleDownload = useCallback(async () => {
    try {
      const currentEntry = getCurrentEntry();
      let blob: Blob;
      let filename: string;

      if (currentEntry) {
        // Download edited version from history
        blob = currentEntry.blob;
        filename = downloadFilename('edited', 'png');

        trackEvent('edited_image_downloaded', {
          generation_id: currentOutput.id,
          edit_type: currentEntry.editType,
          edit_count: currentIndex + 1
        });
      } else {
        // Fallback: Download original from Supabase
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const originalUrl = `${supabaseUrl}/storage/v1/object/public/generated-content/${currentOutput.storage_path}`;

        const response = await fetch(originalUrl);
        if (!response.ok) throw new Error('Failed to fetch image');

        blob = await response.blob();
        filename = downloadFilename('image', 'png');

        trackEvent('original_image_downloaded', {
          generation_id: currentOutput.id
        });
      }

      // Download blob
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      // Track onboarding download
      onDownloadSuccess?.();
    } catch (error) {
      logger.error('Output download failed', error as Error, {
        component: 'OutputLightbox',
        generationId: currentOutput.id,
        contentType,
        operation: 'handleDownload'
      });
      toast.error('Failed to download image. Please try again.');
    }
  }, [getCurrentEntry, currentOutput, currentIndex, contentType, onDownloadSuccess]);

  const handleNavigate = useCallback((direction: 'prev' | 'next') => {
    onNavigate(direction);
    clearHistory();
    trackEvent('output_navigation', {
      generation_id: currentOutput.id,
      direction
    });
  }, [onNavigate, clearHistory, currentOutput]);

  const handleUndo = useCallback(() => {
    const entry = undo();
    if (entry) {
      trackEvent('edit_undone', { generation_id: currentOutput.id });
    }
  }, [undo, currentOutput]);

  const handleRedo = useCallback(() => {
    const entry = redo();
    if (entry) {
      trackEvent('edit_redone', { generation_id: currentOutput.id });
    }
  }, [redo, currentOutput]);

  // Keyboard shortcuts (including undo/redo)
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
      } else if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' && !e.shiftKey && canUndo) {
          e.preventDefault();
          handleUndo();
        } else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
          if (canRedo) {
            e.preventDefault();
            handleRedo();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, selectedIndex, outputs.length, canUndo, canRedo, handleDownload, handleNavigate, handleRedo, handleUndo, onOpenChange]);

  const handleShare = async () => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const publicUrl = `${supabaseUrl}/storage/v1/object/public/generated-content/${currentOutput.storage_path}`;
      
      if (canShare) {
        await shareFile(publicUrl, `Created with ${brand.name}`);
        trackEvent('output_shared', {
          generation_id: currentOutput.id,
          content_type: contentType,
          share_method: 'native'
        });
      } else {
        setShowShareModal(true);
      }
    } catch (error) {
      logger.error('Output share failed', error as Error, {
        component: 'OutputLightbox',
        generationId: currentOutput.id,
        contentType,
        canShare,
        operation: 'handleShare'
      });
      setShowShareModal(true);
    }
  };


  const handleSave = () => {
    setIsSaved(!isSaved);
    trackEvent('output_save_toggled', {
      generation_id: currentOutput.id,
      is_saved: !isSaved
    });
  };

  const handleCrop = () => {
    if (contentType === "image") {
      setShowCropModal(true);
      trackEvent('crop_initiated', { generation_id: currentOutput.id });
    }
  };

  const handleCropComplete = useCallback((blob: Blob, url: string) => {
    addToHistory({
      blob,
      url,
      editType: 'cropped',
      description: 'Image cropped',
    });
    trackEvent('crop_completed', { generation_id: currentOutput.id });
  }, [addToHistory, currentOutput]);

  const handleFilter = () => {
    if (contentType === "image") {
      setShowFilterModal(true);
      trackEvent('filter_initiated', { generation_id: currentOutput.id });
    }
  };

  const handleFilterComplete = useCallback((blob: Blob, url: string) => {
    addToHistory({
      blob,
      url,
      editType: 'filtered',
      description: 'Filters applied',
    });
    trackEvent('filter_completed', { generation_id: currentOutput.id });
  }, [addToHistory, currentOutput]);

  const handleTextOverlay = () => {
    if (contentType === "image") {
      setShowTextOverlayModal(true);
      trackEvent('text_overlay_initiated', { generation_id: currentOutput.id });
    }
  };

  const handleTextOverlayComplete = useCallback((blob: Blob, url: string) => {
    addToHistory({
      blob,
      url,
      editType: 'text-overlay',
      description: 'Text overlay added',
    });
    trackEvent('text_overlay_completed', { generation_id: currentOutput.id });
  }, [addToHistory, currentOutput]);

  const handleEffects = () => {
    if (contentType === "image") {
      setShowEffectsModal(true);
      trackEvent('effects_initiated', { generation_id: currentOutput.id });
    }
  };

  const handleEffectsComplete = useCallback((blob: Blob, url: string) => {
    addToHistory({
      blob,
      url,
      editType: 'effects',
      description: 'Effects applied',
    });
    trackEvent('effects_completed', { generation_id: currentOutput.id });
  }, [addToHistory, currentOutput]);

  const handleTemplateSelect = useCallback(async (template: SocialMediaTemplate) => {
    try {
      const currentEntry = getCurrentEntry();
      if (!currentEntry) return;

      // First crop to template aspect ratio
      const img = new Image();
      img.src = currentEntry.url;
      await new Promise((resolve) => { img.onload = resolve; });

      const cropArea = {
        x: 0,
        y: 0,
        width: img.width,
        height: img.width / template.aspectRatio,
      };

      if (cropArea.height > img.height) {
        cropArea.height = img.height;
        cropArea.width = img.height * template.aspectRatio;
      }

      const { url: croppedUrl } = await getCroppedImg(
        currentEntry.url,
        cropArea
      );

      // Then apply text overlays
      const textLayers = template.textLayers.map((layer, index) => ({
        ...layer,
        id: `template-text-${index}`,
      }));

      const { blob, url } = await applyTextOverlay(croppedUrl, textLayers);

      addToHistory({
        blob,
        url,
        editType: 'template',
        description: `${template.name} template applied`,
      });

      toast.success(`${template.name} template applied!`);
      setShowTemplateModal(false);
      trackEvent('template_applied', {
        generation_id: currentOutput.id,
        template: template.id
      });
    } catch (error) {
      logger.error('Social media template application failed', error as Error, {
        component: 'OutputLightbox',
        generationId: currentOutput.id,
        templateId: template.id,
        templateName: template.name,
        operation: 'handleApplyTemplate'
      });
      toast.error('Failed to apply template. Please try again.');
    }
  }, [getCurrentEntry, addToHistory, currentOutput]);

  const handleGoToHistoryEntry = useCallback((index: number) => {
    const entry = goToHistoryEntry(index);
    if (entry) {
      toast.success(`Restored to: ${entry.description}`);
      trackEvent('history_entry_restored', {
        generation_id: currentOutput.id,
        index
      });
    }
  }, [goToHistoryEntry, currentOutput]);

  const getCurrentImageUrl = () => {
    const entry = getCurrentEntry();
    if (entry) return entry.url;
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    return `${supabaseUrl}/storage/v1/object/public/generated-content/${currentOutput.storage_path}`;
  };

  const hasAnyEdits = currentIndex > 0;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent 
          className="max-w-[95vw] sm:max-w-3xl lg:max-w-4xl max-h-[90vh] p-4 sm:p-6 flex flex-col backdrop-blur-sm shadow-2xl animate-slide-up"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <ScrollArea className="flex-1 min-h-0 pr-1 pb-24 sm:pb-6">
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

          {/* Image Preview - Centered, respects natural aspect ratio */}
          <div className="flex items-center justify-center rounded-xl my-3 overflow-hidden flex-shrink-0 max-h-[60vh] bg-muted/20 relative">
            {hasAnyEdits ? (
              <img 
                key={`edited-${currentIndex}-${getCurrentEntry()?.id}`}
                src={getCurrentImageUrl()} 
                alt="Edited preview"
                className={`max-w-full max-h-[60vh] w-auto h-auto ${displayMode === 'fit' ? 'object-contain' : 'object-cover'}`}
              />
            ) : (
              <OptimizedGenerationPreview
                key={`original-${currentOutput.storage_path}`}
                storagePath={currentOutput.storage_path}
                contentType={contentType}
                className={`max-w-full max-h-[60vh] w-auto h-auto ${displayMode === 'fit' ? 'object-contain' : 'object-cover'}`}
              />
            )}
            {/* Edit badges */}
            {hasAnyEdits && (
              <div className="absolute top-5 right-5">
                <Badge className="bg-primary/90">
                  Edited ({currentIndex + 1} step{currentIndex !== 0 ? 's' : ''})
                </Badge>
              </div>
            )}
          </div>

          {/* Navigation Controls (only if multiple outputs) */}
          {outputs.length > 1 && (
            <div className="flex items-center justify-center gap-3 mb-4">
              <Button
                variant="outline"
                size="default"
                className="h-10"
                onClick={() => handleNavigate('prev')}
                disabled={selectedIndex === 0}
                aria-label="Previous image"
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="default"
                className="h-10"
                onClick={() => handleNavigate('next')}
                disabled={selectedIndex === outputs.length - 1}
                aria-label="Next image"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-4 lg:pt-6 border-t space-y-3 lg:space-y-4 flex-shrink-0">
            {/* History and Template Controls Row */}
            {contentType === "image" && (
              <div className="grid grid-cols-2 gap-3 lg:gap-4">
                <Button
                  onClick={() => setShowHistoryPanel(!showHistoryPanel)}
                  variant="secondary"
                  className="h-10 lg:h-11"
                >
                  <Clock className="h-4 w-4 mr-2" />
                  <span className="text-sm">History ({history.length})</span>
                </Button>
                <Button
                  onClick={() => setShowTemplateModal(true)}
                  variant="secondary"
                  className="h-10 lg:h-11"
                >
                  <Layout className="h-4 w-4 mr-2" />
                  <span className="text-sm">Templates</span>
                </Button>
              </div>
            )}

            {/* History Panel */}
            {showHistoryPanel && (
              <ImageHistoryPanel
                history={history}
                currentIndex={currentIndex}
                onGoToEntry={handleGoToHistoryEntry}
                onUndo={handleUndo}
                onRedo={handleRedo}
                canUndo={canUndo}
                canRedo={canRedo}
                onClose={() => setShowHistoryPanel(false)}
              />
            )}

            <div className="space-y-3 lg:space-y-4">
              {/* Image Edit Tools - Only for images */}
              {contentType === "image" && (
                <>
                  {/* Display Mode Toggle */}
                  <div className="flex justify-center">
                    <Button
                      onClick={() => setDisplayMode(displayMode === 'fit' ? 'fill' : 'fit')}
                      variant="outline"
                      className="h-10 border-2 hover:-translate-y-0.5 transition-all px-6"
                      aria-label={displayMode === 'fit' ? 'Switch to Fill mode' : 'Switch to Fit mode'}
                    >
                      {displayMode === 'fit' ? (
                        <>
                          <Maximize2 className="h-4 w-4 mr-2" />
                          <span className="text-sm">Fill</span>
                        </>
                      ) : (
                        <>
                          <Minimize2 className="h-4 w-4 mr-2" />
                          <span className="text-sm">Fit</span>
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 lg:gap-3">
                    <Button
                      onClick={handleCrop}
                      variant="outline"
                      className="h-10 border-2 hover:-translate-y-0.5 transition-all"
                      aria-label="Crop image"
                    >
                      <Scissors className="h-4 w-4 mr-1.5" />
                      <span className="text-sm">Crop</span>
                    </Button>

                    <Button
                      onClick={handleFilter}
                      variant="outline"
                      className="h-10 border-2 hover:-translate-y-0.5 transition-all"
                      aria-label="Apply filters"
                    >
                      <Wand2 className="h-4 w-4 mr-1.5" />
                      <span className="text-sm">Filters</span>
                    </Button>

                    <Button
                      onClick={handleEffects}
                      variant="outline"
                      className="h-10 border-2 hover:-translate-y-0.5 transition-all"
                      aria-label="Apply effects"
                    >
                      <Sparkles className="h-4 w-4 mr-1.5" />
                      <span className="text-sm">Effects</span>
                    </Button>

                    <Button
                      onClick={handleTextOverlay}
                      variant="outline"
                      className="h-10 border-2 hover:-translate-y-0.5 transition-all"
                      aria-label="Add text"
                    >
                      <Type className="h-4 w-4 mr-1.5" />
                      <span className="text-sm">Text</span>
                    </Button>
                  </div>
                </>
              )}
              
              {/* Action Row - Share and Save */}
              <div className="flex gap-2 lg:gap-3">
                <Button
                  onClick={handleShare}
                  variant="ghost"
                  className="flex-1 h-10 hover:bg-secondary-50 dark:hover:bg-secondary-900/20"
                  aria-label="Share image"
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  <span className="text-sm">Share</span>
                </Button>
                
                <Button
                  onClick={handleSave}
                  variant="ghost"
                  className="w-12 h-10 hover:bg-secondary-50 dark:hover:bg-secondary-900/20"
                  aria-label={isSaved ? "Remove from favorites" : "Save to favorites"}
                >
                  <Heart className={`h-5 w-5 ${isSaved ? 'fill-current text-red-500' : ''}`} />
                </Button>
              </div>
            </div>
          </div>

          {/* Keyboard Shortcuts Hint */}
          <div className="text-center mt-4 pb-2 flex-shrink-0">
            <p className="text-xs lg:text-sm text-muted-foreground">
              <span className="hidden md:inline">
                <kbd className="px-2 py-1 bg-muted rounded text-xs lg:text-sm">Ctrl+Z</kbd> Undo • 
                <kbd className="px-2 py-1 bg-muted rounded text-xs lg:text-sm">Ctrl+Shift+Z</kbd> Redo • 
                <kbd className="px-2 py-1 bg-muted rounded text-xs lg:text-sm">←</kbd> <kbd className="px-2 py-1 bg-muted rounded text-xs lg:text-sm">→</kbd> Navigate • 
              </span>
              <span className="md:hidden">Swipe down to close • </span>
              <kbd className="px-2 py-1 bg-muted rounded text-xs lg:text-sm">ESC</kbd> to close
            </p>
          </div>
          </ScrollArea>

          {/* Sticky Download Button - Always visible on mobile */}
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-sm border-t sm:hidden z-50">
            <Button
              onClick={handleDownload}
              className="w-full h-12 bg-yellow-400 hover:bg-yellow-500 text-black font-bold text-base shadow-lg"
              aria-label="Download image"
            >
              <Download className="h-4 w-4 mr-2" />
              {hasAnyEdits ? "Download Edited" : "Download"}
            </Button>
          </div>

          {/* Download Button - Desktop only (inside normal flow) */}
          <div className="hidden sm:block pt-4 border-t">
            <Button
              onClick={handleDownload}
              className="w-full h-12 bg-yellow-400 hover:bg-yellow-500 text-black font-bold text-base shadow-lg hover:shadow-xl transition-all"
              aria-label="Download image"
            >
              <Download className="h-4 w-4 mr-2" />
              {hasAnyEdits ? "Download Edited" : "Download"}
            </Button>
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

          <ImageEffectsModal
            open={showEffectsModal}
            onOpenChange={setShowEffectsModal}
            imageUrl={getCurrentImageUrl()}
            onEffectsComplete={handleEffectsComplete}
          />

          <TextOverlayModal
            open={showTextOverlayModal}
            onOpenChange={setShowTextOverlayModal}
            imageUrl={getCurrentImageUrl()}
            onOverlayComplete={handleTextOverlayComplete}
          />

          {/* Social Media Template Modal */}
          <Dialog open={showTemplateModal} onOpenChange={setShowTemplateModal}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Social Media Templates</DialogTitle>
              </DialogHeader>
              <SocialMediaTemplates onSelectTemplate={handleTemplateSelect} />
            </DialogContent>
          </Dialog>
        </>
      )}
    </>
  );
};
