import { useState, useEffect } from 'react';
import { BackgroundPreset, ShaderParams } from '@/types/procedural-background';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { X, Check, Settings2, ChevronUp, ChevronDown } from 'lucide-react';
import { Canvas2DFallback } from './Canvas2DFallback';

interface PresetPreviewModalProps {
  preset: BackgroundPreset | null;
  isOpen: boolean;
  onClose: () => void;
  onSelect: (preset: BackgroundPreset) => void;
}

export function PresetPreviewModal({ preset, isOpen, onClose, onSelect }: PresetPreviewModalProps) {
  const [customParams, setCustomParams] = useState<ShaderParams | null>(null);
  const [showControls, setShowControls] = useState(false);

  // Reset customParams when preset changes
  useEffect(() => {
    if (preset) {
      setCustomParams({ ...preset.params });
    }
  }, [preset]);

  if (!preset || !customParams) return null;

  const handleParamChange = (key: keyof ShaderParams, value: number) => {
    setCustomParams(prev => prev ? { ...prev, [key]: value } : null);
  };

  const handleApply = () => {
    if (customParams) {
      onSelect({ ...preset, params: customParams });
      onClose();
    }
  };

  const handleReset = () => {
    setCustomParams({ ...preset.params });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[95vw] h-[90vh] p-0 overflow-hidden border-border bg-background">
        {/* Canvas background */}
        <div className="absolute inset-0">
          <Canvas2DFallback params={customParams} className="w-full h-full" />
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

        {/* Customization panel */}
        <div className={`absolute right-4 top-1/2 -translate-y-1/2 z-10 transition-all duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          <div className="bg-background/90 backdrop-blur-sm rounded-lg border border-border p-4 w-64 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Customize</h3>
              <Button variant="ghost" size="sm" onClick={handleReset} className="text-xs h-7">
                Reset
              </Button>
            </div>

            {/* Instance Count */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label className="text-sm text-muted-foreground">Count</Label>
                <span className="text-sm text-foreground">{customParams.instanceCount}</span>
              </div>
              <Slider
                value={[customParams.instanceCount]}
                onValueChange={([v]) => handleParamChange('instanceCount', v)}
                min={100}
                max={8000}
                step={100}
                className="w-full"
              />
            </div>

            {/* Camera Speed */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label className="text-sm text-muted-foreground">Speed</Label>
                <span className="text-sm text-foreground">{customParams.cameraSpeed.toFixed(2)}</span>
              </div>
              <Slider
                value={[customParams.cameraSpeed]}
                onValueChange={([v]) => handleParamChange('cameraSpeed', v)}
                min={0.05}
                max={1}
                step={0.05}
                className="w-full"
              />
            </div>

            {/* Metallic */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label className="text-sm text-muted-foreground">Metallic</Label>
                <span className="text-sm text-foreground">{customParams.metallic.toFixed(2)}</span>
              </div>
              <Slider
                value={[customParams.metallic]}
                onValueChange={([v]) => handleParamChange('metallic', v)}
                min={0}
                max={1}
                step={0.05}
                className="w-full"
              />
            </div>

            {/* Panel Size - only for solarpanel arrangement */}
            {preset.params.arrangement === 'solarpanel' && (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label className="text-sm text-muted-foreground">Panel Size</Label>
                  <span className="text-sm text-foreground">{(customParams.panelSize ?? 1).toFixed(1)}x</span>
                </div>
                <Slider
                  value={[(customParams.panelSize ?? 1) * 100]}
                  onValueChange={([v]) => handleParamChange('panelSize', v / 100)}
                  min={50}
                  max={1000}
                  step={25}
                  className="w-full"
                />
              </div>
            )}
          </div>
        </div>

        {/* Toggle controls button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowControls(!showControls)}
          className="absolute right-4 top-20 z-10 gap-2 bg-background/80 backdrop-blur-sm"
        >
          <Settings2 className="h-4 w-4" />
          {showControls ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </Button>

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
            onClick={handleApply}
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
