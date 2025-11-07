/**
 * Image Animation Section Component
 * Collapsible section for image zoom and position controls
 */

import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface ImageAnimationSectionProps {
  animationSettings: any;
  onUpdate: (settings: any) => void;
  isRendering: boolean;
}

/**
 * Collapsible image animation settings with zoom and position controls
 */
export const ImageAnimationSection = ({
  animationSettings,
  onUpdate,
  isRendering,
}: ImageAnimationSectionProps) => {
  return (
    <Collapsible className="space-y-3">
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full justify-between -ml-4" type="button">
          <span className="text-sm font-medium">🎬 Image Animation</span>
          <ChevronDown className="h-3 w-3" />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-4 pl-4">
        <div className="space-y-2">
          <Label className="text-xs">Zoom Level: {(animationSettings?.zoom || 2).toFixed(1)}x</Label>
          <Slider
            value={[animationSettings?.zoom || 2]}
            onValueChange={([value]) => {
              onUpdate({
                image_animation_settings: {
                  ...animationSettings,
                  zoom: value,
                },
              });
            }}
            min={1}
            max={5}
            step={0.1}
            className="w-full"
            disabled={isRendering}
          />
        </div>
        
        <div className="space-y-2">
          <Label className="text-xs">Position</Label>
          <Select 
            value={animationSettings?.position || 'center-center'}
            onValueChange={(value) => {
              onUpdate({
                image_animation_settings: {
                  ...animationSettings,
                  position: value,
                },
              });
            }}
            disabled={isRendering}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              <SelectItem value="center-center">Center</SelectItem>
              <SelectItem value="top-center">Top Center</SelectItem>
              <SelectItem value="bottom-center">Bottom Center</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
