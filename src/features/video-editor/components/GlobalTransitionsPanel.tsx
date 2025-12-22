import { Sparkles } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useVideoEditorStore } from '../store';
import { TransitionType } from '../types';
import { useState } from 'react';

const TRANSITIONS: { value: TransitionType; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'fade', label: 'Fade' },
  { value: 'fadeToBlack', label: 'Fade to Black' },
  { value: 'fadeToWhite', label: 'Fade to White' },
  { value: 'slideLeft', label: 'Slide Left' },
  { value: 'slideRight', label: 'Slide Right' },
  { value: 'slideUp', label: 'Slide Up' },
  { value: 'slideDown', label: 'Slide Down' },
  { value: 'zoom', label: 'Zoom' },
  { value: 'wipeLeft', label: 'Wipe Left' },
  { value: 'wipeRight', label: 'Wipe Right' },
];

export const GlobalTransitionsPanel = () => {
  const { clips, updateClip } = useVideoEditorStore();
  const [globalTransitionIn, setGlobalTransitionIn] = useState<TransitionType>('fade');
  const [globalTransitionOut, setGlobalTransitionOut] = useState<TransitionType>('fade');

  const applyToAllClips = () => {
    clips.forEach((clip) => {
      updateClip(clip.id, {
        transitionIn: globalTransitionIn,
        transitionOut: globalTransitionOut,
      });
    });
  };

  if (clips.length === 0) {
    return (
      <div className="p-4 bg-muted/50 rounded-lg text-center">
        <p className="text-sm text-muted-foreground">
          Add clips to apply global transitions
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Set transitions for all {clips.length} clips at once
      </p>

      {/* Transition In */}
      <div className="space-y-2">
        <Label className="text-sm">Transition In</Label>
        <Select
          value={globalTransitionIn}
          onValueChange={(value) => setGlobalTransitionIn(value as TransitionType)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TRANSITIONS.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Transition Out */}
      <div className="space-y-2">
        <Label className="text-sm">Transition Out</Label>
        <Select
          value={globalTransitionOut}
          onValueChange={(value) => setGlobalTransitionOut(value as TransitionType)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TRANSITIONS.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Apply Button */}
      <Button onClick={applyToAllClips} className="w-full">
        <Sparkles className="h-4 w-4 mr-2" />
        Apply to All Clips
      </Button>
    </div>
  );
};
