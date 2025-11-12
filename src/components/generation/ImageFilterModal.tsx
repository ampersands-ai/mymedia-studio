import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Loader2 } from 'lucide-react';
import { applyFiltersToImage, defaultFilters, filterPresets, type FilterSettings } from '@/utils/image-filters';
import { logger } from '@/lib/logger';

interface ImageFilterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  onFilterComplete: (filteredBlob: Blob, filteredUrl: string) => void;
}

export function ImageFilterModal({
  open,
  onOpenChange,
  imageUrl,
  onFilterComplete,
}: ImageFilterModalProps) {
  const [filters, setFilters] = useState<FilterSettings>(defaultFilters);
  const [isApplying, setIsApplying] = useState(false);

  const handleApplyFilters = async () => {
    try {
      setIsApplying(true);
      const { blob, url } = await applyFiltersToImage(imageUrl, filters);
      onFilterComplete(blob, url);
      onOpenChange(false);
    } catch (error) {
      logger.error('Image filter application failed', error as Error, {
        component: 'ImageFilterModal',
        imageUrl: imageUrl.substring(0, 50),
        filters,
        operation: 'handleApplyFilters'
      });
    } finally {
      setIsApplying(false);
    }
  };

  const applyPreset = (presetName: string) => {
    if (presetName === 'reset') {
      setFilters(defaultFilters);
    } else {
      setFilters(filterPresets[presetName]);
    }
  };

  const getFilterStyle = () => {
    return {
      filter: `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturation}%) blur(${filters.blur}px) grayscale(${filters.grayscale}%) sepia(${filters.sepia}%)`,
    };
  };

  // Keyboard shortcuts
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleApplyFilters();
      } else if (e.key === 'Escape') {
        onOpenChange(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, filters]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Image Filters</DialogTitle>
        </DialogHeader>

        {/* Preview */}
        <div className="relative bg-muted/30 rounded-lg p-4 flex items-center justify-center min-h-[300px] max-h-[400px]">
          <img
            src={imageUrl}
            alt="Filter preview"
            className="max-w-full max-h-[350px] object-contain rounded"
            style={getFilterStyle()}
          />
        </div>

        {/* Filter Controls */}
        <div className="space-y-4 py-4">
          {/* Brightness */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium">Brightness</label>
              <span className="text-sm text-muted-foreground">{filters.brightness}%</span>
            </div>
            <Slider
              value={[filters.brightness]}
              onValueChange={([value]) => setFilters({ ...filters, brightness: value })}
              min={0}
              max={200}
              step={1}
            />
          </div>

          {/* Contrast */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium">Contrast</label>
              <span className="text-sm text-muted-foreground">{filters.contrast}%</span>
            </div>
            <Slider
              value={[filters.contrast]}
              onValueChange={([value]) => setFilters({ ...filters, contrast: value })}
              min={0}
              max={200}
              step={1}
            />
          </div>

          {/* Saturation */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium">Saturation</label>
              <span className="text-sm text-muted-foreground">{filters.saturation}%</span>
            </div>
            <Slider
              value={[filters.saturation]}
              onValueChange={([value]) => setFilters({ ...filters, saturation: value })}
              min={0}
              max={200}
              step={1}
            />
          </div>

          {/* Blur */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium">Blur</label>
              <span className="text-sm text-muted-foreground">{filters.blur}px</span>
            </div>
            <Slider
              value={[filters.blur]}
              onValueChange={([value]) => setFilters({ ...filters, blur: value })}
              min={0}
              max={10}
              step={0.5}
            />
          </div>

          {/* Quick Presets */}
          <div className="pt-4 border-t">
            <label className="text-sm font-medium mb-3 block">Quick Presets</label>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => applyPreset('bw')}
              >
                B&W
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => applyPreset('sepia')}
              >
                Sepia
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => applyPreset('vintage')}
              >
                Vintage
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => applyPreset('vibrant')}
              >
                Vibrant
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
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isApplying}>
            Cancel
          </Button>
          <Button onClick={handleApplyFilters} disabled={isApplying}>
            {isApplying && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Apply Filters
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
