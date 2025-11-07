/**
 * Subtitle Settings Section Component
 * Collapsible section for quick subtitle controls
 */

import { ChevronDown, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { FONT_FAMILIES } from '@/config/subtitlePresets';

interface SubtitleSettingsSectionProps {
  subtitleSettings: any;
  onUpdate: (settings: any) => void;
  isRendering: boolean;
  onOpenCustomizer: () => void;
}

/**
 * Collapsible subtitle settings with quick font/size controls
 * Includes button to open advanced customizer
 */
export const SubtitleSettingsSection = ({
  subtitleSettings,
  onUpdate,
  isRendering,
  onOpenCustomizer,
}: SubtitleSettingsSectionProps) => {
  return (
    <Collapsible className="space-y-3">
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full justify-between -ml-4" type="button">
          <span className="text-sm font-medium">📝 Subtitle Settings</span>
          <ChevronDown className="h-3 w-3" />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-4 pl-4">
        <div className="text-xs text-muted-foreground mb-2">
          Configure subtitle appearance with advanced styling options
        </div>
        
        {/* Quick Preview */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-xs">Font</Label>
            <Select 
              value={subtitleSettings?.fontFamily || 'Oswald Bold'}
              onValueChange={(value) => {
                onUpdate({
                  subtitle_settings: {
                    ...subtitleSettings,
                    fontFamily: value,
                  },
                });
              }}
              disabled={isRendering}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                {FONT_FAMILIES.map((font) => (
                  <SelectItem key={font} value={font}>
                    {font}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label className="text-xs">Size: {subtitleSettings?.fontSize || 40}px</Label>
            <Slider
              value={[subtitleSettings?.fontSize || 40]}
              onValueChange={([value]) => {
                onUpdate({
                  subtitle_settings: {
                    ...subtitleSettings,
                    fontSize: value,
                  },
                });
              }}
              min={20}
              max={200}
              step={10}
              className="w-full"
              disabled={isRendering}
            />
          </div>
        </div>

        {/* Advanced Customizer Button */}
        <Button 
          variant="outline" 
          size="sm"
          className="w-full"
          onClick={onOpenCustomizer}
          type="button"
          disabled={isRendering}
        >
          <Settings className="h-4 w-4 mr-2" />
          Advanced Subtitle Customizer
        </Button>
      </CollapsibleContent>
    </Collapsible>
  );
};
