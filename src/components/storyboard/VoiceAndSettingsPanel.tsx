/**
 * Voice And Settings Panel Component
 * Main card containing all voice and advanced settings sections
 */

import { ChevronDown, Volume2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { VoiceSelector } from '@/components/generation/VoiceSelector';
import { SubtitleSettingsSection } from './SubtitleSettingsSection';
import type { Storyboard } from '@/types/storyboard';
import type { 
  MusicSettingsUpdate,
  ImageAnimationSettingsUpdate 
} from '@/types/media-settings';

interface VoiceAndSettingsPanelProps {
  storyboard: Storyboard;
  isRendering: boolean;
  onUpdateSettings: (settings: 
    | MusicSettingsUpdate 
    | ImageAnimationSettingsUpdate 
    | { subtitle_settings?: unknown }
    | { voice_id?: string; voice_name?: string }
    | { video_quality?: string }
  ) => void;
  onOpenSubtitleCustomizer: () => void;
}

/**
 * Complete voice & advanced settings panel
 * Contains voice selector and subtitle settings
 */
export const VoiceAndSettingsPanel = ({
  storyboard,
  isRendering,
  onUpdateSettings,
  onOpenSubtitleCustomizer,
}: VoiceAndSettingsPanelProps) => {
  return (
    <Card className="p-6 space-y-6">
      <Collapsible defaultOpen={false}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between -ml-4" type="button">
            <span className="text-lg font-bold flex items-center">
              <Volume2 className="mr-2 h-5 w-5" />
              Voice & Advanced Settings
              {isRendering && (
                <span className="text-xs text-muted-foreground ml-2 font-normal">(settings locked during render)</span>
              )}
            </span>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-6 pt-4">
          {isRendering && (
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Settings cannot be changed during rendering. Cancel the render to make changes.
              </AlertDescription>
            </Alert>
          )}
          <p className="text-sm text-muted-foreground">
            Customize your video settings before rendering. Changes are saved automatically.
          </p>
            
          {/* Voice Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Voiceover Voice</Label>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full justify-start" type="button" disabled={isRendering}>
                  <Volume2 className="w-4 h-4 mr-2" />
                  <span className="truncate">
                    {storyboard?.voice_name || 'Select Voice'}
                  </span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Select Voiceover Voice</DialogTitle>
                </DialogHeader>
                <VoiceSelector
                  selectedValue={storyboard?.voice_id || ''}
                  onSelectVoice={(voiceId, voiceName) => {
                    onUpdateSettings({ voice_id: voiceId, voice_name: voiceName });
                  }}
                  showAzureVoices={true}
                  showElevenLabs={false}
                />
              </DialogContent>
            </Dialog>
          </div>

          {/* Subtitle Settings */}
          <SubtitleSettingsSection
            subtitleSettings={storyboard?.subtitle_settings}
            onUpdate={onUpdateSettings}
            isRendering={isRendering}
            onOpenCustomizer={onOpenSubtitleCustomizer}
          />

          <p className="text-xs text-muted-foreground pt-2 border-t">
            💡 Settings are saved automatically as you make changes
          </p>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};