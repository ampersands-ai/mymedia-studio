import { BackgroundPreset } from '@/types/procedural-background';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Check } from 'lucide-react';
import { Canvas2DFallback } from './Canvas2DFallback';

interface PresetPreviewModalProps {
  preset: BackgroundPreset | null;
  isOpen: boolean;
  onClose: () => void;
  onSelect: (preset: BackgroundPreset) => void;
}

export function PresetPreviewModal({ preset, isOpen, onClose, onSelect }: PresetPreviewModalProps) {
  if (!preset) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[95vw] h-[90vh] p-0 overflow-hidden border-border bg-background">
        {/* Canvas background */}
        <div className="absolute inset-0">
          <Canvas2DFallback params={preset.params} className="w-full h-full" />
        </div>

        {/* Overlay controls */}
        <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-background/80 to-transparent">
          <div>
            <h2 className="text-xl font-bold text-foreground">{preset.name}</h2>
            <span className="text-sm text-muted-foreground">{preset.category}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-foreground hover:bg-background/50"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Bottom action bar */}
        <div className="absolute inset-x-0 bottom-0 z-10 flex items-center justify-center gap-4 p-6 bg-gradient-to-t from-background/80 to-transparent">
          <Button
            variant="outline"
            onClick={onClose}
            className="min-w-[120px]"
          >
            Close
          </Button>
          <Button
            onClick={() => {
              onSelect(preset);
              onClose();
            }}
            className="min-w-[120px] gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Check className="h-4 w-4" />
            Use This
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
