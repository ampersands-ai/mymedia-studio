import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Download, ChevronLeft, ChevronRight } from "lucide-react";
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
        className="max-w-[95vw] max-h-[95vh] p-0 bg-background/95 backdrop-blur-sm border-2"
      >
        {/* Header Controls Bar */}
        <div className="absolute top-0 left-0 right-0 z-50 p-3 md:p-4 flex justify-between items-center bg-gradient-to-b from-background/80 to-transparent">
          {/* Back Button */}
          <Button
            variant="secondary"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="h-9 w-9 shadow-lg"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          {/* Output Indicator */}
          <Badge 
            variant="secondary" 
            className="bg-background/90 backdrop-blur-sm shadow-lg px-3 py-1"
          >
            Output {selectedIndex + 1} of {outputs.length}
          </Badge>

          {/* Download Button */}
          <Button
            variant="secondary"
            size="icon"
            onClick={handleDownload}
            className="h-9 w-9 shadow-lg"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>

        {/* Navigation Arrows (only if multiple outputs) */}
        {outputs.length > 1 && (
          <>
            {/* Previous Button */}
            <Button
              variant="secondary"
              size="icon"
              className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 z-50 h-10 w-10 shadow-lg"
              onClick={() => onNavigate('prev')}
              disabled={selectedIndex === 0}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>

            {/* Next Button */}
            <Button
              variant="secondary"
              size="icon"
              className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2 z-50 h-10 w-10 shadow-lg"
              onClick={() => onNavigate('next')}
              disabled={selectedIndex === outputs.length - 1}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </>
        )}

        {/* Image Display - FIT TO WINDOW (key requirement) */}
        <div className="flex items-center justify-center w-full h-[95vh] p-16 md:p-20">
          <div className="relative w-full h-full flex items-center justify-center">
            <GenerationPreview
              storagePath={currentOutput.storage_path}
              contentType={contentType}
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          </div>
        </div>

        {/* Keyboard Shortcuts Hint */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-50">
          <Badge 
            variant="outline" 
            className="bg-background/70 backdrop-blur-sm text-xs opacity-60 hover:opacity-100 transition-opacity"
          >
            ← → Navigate • ESC Close • D Download
          </Badge>
        </div>
      </DialogContent>
    </Dialog>
  );
};
