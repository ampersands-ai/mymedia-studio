import { useState, useCallback, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RefreshCw, Save, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Scene {
  id: string;
  order_number: number;
  voice_over_text: string;
  image_prompt: string;
  is_edited: boolean;
}

interface SceneCardProps {
  scene: Scene;
  sceneNumber: number;
  isActive: boolean;
  onUpdate: (id: string, field: string, value: string) => void;
  onRegenerate: (id: string) => void;
  onClick: () => void;
}

export const SceneCard = ({
  scene,
  sceneNumber,
  isActive,
  onUpdate,
  onRegenerate,
  onClick,
}: SceneCardProps) => {
  const [voiceOverText, setVoiceOverText] = useState(scene.voice_over_text);
  const [imagePrompt, setImagePrompt] = useState(scene.image_prompt);
  const [isSaving, setIsSaving] = useState(false);
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);

  // Debounced save
  useEffect(() => {
    const timer = setTimeout(() => {
      if (voiceOverText !== scene.voice_over_text) {
        setIsSaving(true);
        onUpdate(scene.id, 'voice_over_text', voiceOverText);
        setTimeout(() => setIsSaving(false), 500);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [voiceOverText, scene.id, scene.voice_over_text, onUpdate]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (imagePrompt !== scene.image_prompt) {
        setIsSaving(true);
        onUpdate(scene.id, 'image_prompt', imagePrompt);
        setTimeout(() => setIsSaving(false), 500);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [imagePrompt, scene.id, scene.image_prompt, onUpdate]);

  const handleRegenerate = () => {
    setShowRegenerateDialog(false);
    onRegenerate(scene.id);
  };

  return (
    <>
      <Card
        onClick={onClick}
        className={cn(
          'relative p-4 transition-all duration-300 cursor-pointer',
          'bg-white/10 backdrop-blur-xl border border-white/20',
          'hover:bg-white/15 hover:scale-[1.01] hover:shadow-lg',
          isActive && 'ring-2 ring-primary scale-[1.02] shadow-xl',
          scene.is_edited && 'border-primary/50'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="px-2 py-1 rounded-md bg-primary/20 text-primary text-xs font-bold">
              Scene {sceneNumber}
            </div>
            {scene.is_edited && (
              <div className="px-2 py-1 rounded-md bg-accent/20 text-accent text-xs font-bold">
                Edited
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isSaving && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground animate-pulse">
                <Save className="w-3 h-3" />
                Saving...
              </div>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                setShowRegenerateDialog(true);
              }}
              className="h-8 px-2"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Voiceover */}
        <div className="space-y-2 mb-4">
          <Label className="text-xs font-semibold text-muted-foreground">🎤 Voiceover</Label>
          <Textarea
            value={voiceOverText}
            onChange={(e) => setVoiceOverText(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            className="min-h-[80px] text-sm bg-background/50"
            maxLength={1000}
          />
        </div>

        {/* Image Prompt */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-muted-foreground">🖼️ Image Prompt</Label>
          <Textarea
            value={imagePrompt}
            onChange={(e) => setImagePrompt(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            className="min-h-[80px] text-sm bg-background/50"
            maxLength={2000}
          />
        </div>
      </Card>

      <AlertDialog open={showRegenerateDialog} onOpenChange={setShowRegenerateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerate Scene {sceneNumber}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will use AI to create a new version of this scene. It will cost 50 tokens.
              Your edits will be replaced with the new content.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRegenerate}>
              Regenerate (50 tokens)
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};