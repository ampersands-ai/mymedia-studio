import { X, Loader2 } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { WaveformVisualizer } from './WaveformVisualizer';

interface GenerationProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCancel: () => void;
  title?: string;
  progress?: number;
  estimatedTime?: number;
}

export function GenerationProgressModal({
  isOpen,
  onClose,
  onCancel,
  title = 'Generating your track...',
  progress,
  estimatedTime,
}: GenerationProgressModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <div className="flex flex-col items-center py-8 px-4">
          {/* Animated Waveform */}
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-gradient-to-r from-primary-orange/20 via-accent-purple/20 to-accent-pink/20 blur-2xl" />
            <WaveformVisualizer isPlaying={true} variant="large" barCount={24} className="relative z-10" />
          </div>

          {/* Title */}
          <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>

          {/* Progress */}
          {typeof progress === 'number' && (
            <div className="w-full max-w-xs mb-4">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary-orange to-accent-purple transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-sm text-muted-foreground text-center mt-2">{Math.round(progress)}%</p>
            </div>
          )}

          {/* Estimated Time */}
          {!progress && (
            <div className="flex items-center gap-2 text-muted-foreground mb-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">
                {estimatedTime
                  ? `Estimated time: ~${Math.ceil(estimatedTime / 60)} min`
                  : 'This may take a few minutes...'}
              </span>
            </div>
          )}

          {/* Cancel Button */}
          <Button
            variant="outline"
            onClick={onCancel}
            className="mt-2"
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
