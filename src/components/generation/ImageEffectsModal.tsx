import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Sparkles } from 'lucide-react';
import { applyEffectsToImage, defaultEffects, effectPresets, type ImageEffects } from '@/utils/image-effects';

interface ImageEffectsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  onEffectsComplete: (effectsBlob: Blob, effectsUrl: string) => void;
}

export function ImageEffectsModal({
  open,
  onOpenChange,
  imageUrl,
  onEffectsComplete,
}: ImageEffectsModalProps) {
  const [effects, setEffects] = useState<ImageEffects>(defaultEffects);
  const [isApplying, setIsApplying] = useState(false);

  const handleApplyEffects = async () => {
    try {
      setIsApplying(true);
      const { blob, url } = await applyEffectsToImage(imageUrl, effects);
      onEffectsComplete(blob, url);
      onOpenChange(false);
    } catch (error) {
      console.error('Error applying effects:', error);
    } finally {
      setIsApplying(false);
    }
  };

  const applyPreset = (presetName: string) => {
    if (presetName === 'reset') {
      setEffects(defaultEffects);
    } else {
      setEffects(effectPresets[presetName as keyof typeof effectPresets]);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleApplyEffects();
      } else if (e.key === 'Escape') {
        onOpenChange(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, effects]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Image Effects
          </DialogTitle>
        </DialogHeader>

        {/* Preview */}
        <div className="relative bg-muted/30 rounded-lg p-4 flex items-center justify-center min-h-[300px] max-h-[400px]">
          <img
            src={imageUrl}
            alt="Effects preview"
            className="max-w-full max-h-[350px] object-contain rounded"
          />
          <div className="absolute top-4 right-4">
            <span className="text-xs px-2 py-1 bg-background/90 rounded">Live preview unavailable - apply to see</span>
          </div>
        </div>

        {/* Quick Presets */}
        <div className="space-y-2">
          <Label>Quick Presets</Label>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => applyPreset('drop-shadow')}
            >
              Drop Shadow
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => applyPreset('soft-glow')}
            >
              Soft Glow
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => applyPreset('dark-vignette')}
            >
              Dark Vignette
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => applyPreset('white-border')}
            >
              White Border
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => applyPreset('polaroid')}
            >
              Polaroid
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => applyPreset('reset')}
            >
              Reset
            </Button>
          </div>
        </div>

        {/* Effects Controls */}
        <div className="space-y-6 py-4">
          {/* Drop Shadow */}
          <div className="space-y-3 p-4 border rounded-lg">
            <div className="flex items-center justify-between">
              <Label htmlFor="drop-shadow">Drop Shadow</Label>
              <Switch
                id="drop-shadow"
                checked={effects.dropShadow}
                onCheckedChange={(checked) => setEffects({ ...effects, dropShadow: checked })}
              />
            </div>
            {effects.dropShadow && (
              <div className="space-y-3 pl-4">
                <div className="space-y-2">
                  <Label>Blur: {effects.dropShadowBlur}px</Label>
                  <Slider
                    value={[effects.dropShadowBlur]}
                    onValueChange={([value]) => setEffects({ ...effects, dropShadowBlur: value })}
                    min={0}
                    max={50}
                    step={1}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Offset X: {effects.dropShadowOffsetX}px</Label>
                    <Slider
                      value={[effects.dropShadowOffsetX]}
                      onValueChange={([value]) => setEffects({ ...effects, dropShadowOffsetX: value })}
                      min={-50}
                      max={50}
                      step={1}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Offset Y: {effects.dropShadowOffsetY}px</Label>
                    <Slider
                      value={[effects.dropShadowOffsetY]}
                      onValueChange={([value]) => setEffects({ ...effects, dropShadowOffsetY: value })}
                      min={-50}
                      max={50}
                      step={1}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Shadow Color</Label>
                  <Input
                    type="color"
                    value={effects.dropShadowColor}
                    onChange={(e) => setEffects({ ...effects, dropShadowColor: e.target.value })}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Glow */}
          <div className="space-y-3 p-4 border rounded-lg">
            <div className="flex items-center justify-between">
              <Label htmlFor="glow">Glow Effect</Label>
              <Switch
                id="glow"
                checked={effects.glow}
                onCheckedChange={(checked) => setEffects({ ...effects, glow: checked })}
              />
            </div>
            {effects.glow && (
              <div className="space-y-3 pl-4">
                <div className="space-y-2">
                  <Label>Intensity: {effects.glowIntensity}px</Label>
                  <Slider
                    value={[effects.glowIntensity]}
                    onValueChange={([value]) => setEffects({ ...effects, glowIntensity: value })}
                    min={0}
                    max={50}
                    step={1}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Glow Color</Label>
                  <Input
                    type="color"
                    value={effects.glowColor}
                    onChange={(e) => setEffects({ ...effects, glowColor: e.target.value })}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Vignette */}
          <div className="space-y-3 p-4 border rounded-lg">
            <div className="flex items-center justify-between">
              <Label htmlFor="vignette">Vignette</Label>
              <Switch
                id="vignette"
                checked={effects.vignette}
                onCheckedChange={(checked) => setEffects({ ...effects, vignette: checked })}
              />
            </div>
            {effects.vignette && (
              <div className="space-y-2 pl-4">
                <Label>Intensity: {Math.round(effects.vignetteIntensity * 100)}%</Label>
                <Slider
                  value={[effects.vignetteIntensity * 100]}
                  onValueChange={([value]) => setEffects({ ...effects, vignetteIntensity: value / 100 })}
                  min={0}
                  max={100}
                  step={1}
                />
              </div>
            )}
          </div>

          {/* Border */}
          <div className="space-y-3 p-4 border rounded-lg">
            <div className="flex items-center justify-between">
              <Label htmlFor="border">Frame Border</Label>
              <Switch
                id="border"
                checked={effects.border}
                onCheckedChange={(checked) => setEffects({ ...effects, border: checked })}
              />
            </div>
            {effects.border && (
              <div className="space-y-3 pl-4">
                <div className="space-y-2">
                  <Label>Width: {effects.borderWidth}px</Label>
                  <Slider
                    value={[effects.borderWidth]}
                    onValueChange={([value]) => setEffects({ ...effects, borderWidth: value })}
                    min={1}
                    max={50}
                    step={1}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Border Color</Label>
                    <Input
                      type="color"
                      value={effects.borderColor}
                      onChange={(e) => setEffects({ ...effects, borderColor: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Border Style</Label>
                    <Select
                      value={effects.borderStyle}
                      onValueChange={(value: 'solid' | 'dashed' | 'dotted') =>
                        setEffects({ ...effects, borderStyle: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="solid">Solid</SelectItem>
                        <SelectItem value="dashed">Dashed</SelectItem>
                        <SelectItem value="dotted">Dotted</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isApplying}>
            Cancel
          </Button>
          <Button onClick={handleApplyEffects} disabled={isApplying}>
            {isApplying && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Apply Effects
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
