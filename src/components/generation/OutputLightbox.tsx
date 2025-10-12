import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, ChevronLeft, ChevronRight, Image as ImageIcon } from "lucide-react";
import { GenerationPreview } from "./GenerationPreview";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

  // Keyboard shortcuts
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onOpenChange(false);
      } else if (e.key === 'ArrowLeft' && selectedIndex > 0) {
        onNavigate('prev');
      } else if (e.key === 'ArrowRight' && selectedIndex < outputs.length - 1) {
        onNavigate('next');
      } else if (e.key === 'd' || e.key === 'D') {
        handleDownload();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, selectedIndex, outputs.length]);

  const handleDownload = async () => {
    try {
      const { data } = await supabase.storage
        .from('generated-content')
        .createSignedUrl(currentOutput.storage_path, 60);
      
      if (data?.signedUrl) {
        const response = await fetch(data.signedUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const extension = currentOutput.storage_path.split('.').pop() || 'file';
        a.download = `output-${currentOutput.output_index + 1}-${Date.now()}.${extension}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('Download started!');
      }
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
      >
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
        <div className="flex items-center justify-center bg-muted/30 rounded-lg p-4 my-4">
          <GenerationPreview
            storagePath={currentOutput.storage_path}
            contentType={contentType}
            className="max-w-full max-h-[400px] object-contain rounded-lg"
          />
        </div>

        {/* Navigation Controls (only if multiple outputs) */}
        {outputs.length > 1 && (
          <div className="flex items-center justify-center gap-2 mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate('prev')}
              disabled={selectedIndex === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate('next')}
              disabled={selectedIndex === outputs.length - 1}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t">
          <Button
            onClick={handleDownload}
            className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-black font-bold"
          >
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </div>

        {/* Keyboard Shortcuts Hint */}
        <div className="text-center mt-2">
          <p className="text-xs text-muted-foreground">
            Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">←</kbd> <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">→</kbd> to navigate • <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">ESC</kbd> to close
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
