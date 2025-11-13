/**
 * Audio Settings Section Component
 * Collapsible section for music volume and fade controls
 */

import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import type { 
  MusicSettings,
  MusicSettingsUpdate
} from '@/types/media-settings';
import { 
  getMusicSettings,
  volumeToPercentage,
  percentageToVolume,
  normalizeFadeDuration
} from '@/types/media-settings';

interface AudioSettingsSectionProps {
  musicSettings: Partial<MusicSettings> | null | undefined;
  onUpdate: (settings: MusicSettingsUpdate) => void;
  isRendering: boolean;
}

/**
 * Collapsible audio settings with volume, fade in/out controls
 */
export const AudioSettingsSection = ({
  musicSettings: musicSettingsProp,
  onUpdate,
  isRendering,
}: AudioSettingsSectionProps) => {
  const musicSettings = getMusicSettings(musicSettingsProp);
  
  return (
    <Collapsible className="space-y-3">
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full justify-between -ml-4" type="button">
          <span className="text-sm font-medium">🎵 Audio Settings</span>
          <ChevronDown className="h-3 w-3" />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-4 pl-4">
        <div className="space-y-2">
          <Label className="text-xs">Music Volume: {volumeToPercentage(musicSettings.volume)}%</Label>
          <Slider
            value={[volumeToPercentage(musicSettings.volume)]}
            onValueChange={([value]) => {
              onUpdate({
                music_settings: {
                  ...musicSettings,
                  volume: percentageToVolume(value),
                },
              });
            }}
            min={0}
            max={100}
            step={5}
            className="w-full"
            disabled={isRendering}
          />
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-xs">Fade In: {musicSettings.fadeIn}s</Label>
            <Slider
              value={[musicSettings.fadeIn]}
              onValueChange={([value]) => {
                onUpdate({
                  music_settings: {
                    ...musicSettings,
                    fadeIn: normalizeFadeDuration(value),
                  },
                });
              }}
              min={0}
              max={10}
              step={1}
              className="w-full"
              disabled={isRendering}
            />
          </div>
          
          <div className="space-y-2">
            <Label className="text-xs">Fade Out: {musicSettings.fadeOut}s</Label>
            <Slider
              value={[musicSettings.fadeOut]}
              onValueChange={([value]) => {
                onUpdate({
                  music_settings: {
                    ...musicSettings,
                    fadeOut: normalizeFadeDuration(value),
                  },
                });
              }}
              min={0}
              max={10}
              step={1}
              className="w-full"
              disabled={isRendering}
            />
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
