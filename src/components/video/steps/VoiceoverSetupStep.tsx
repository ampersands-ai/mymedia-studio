import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Volume2, Loader2, Crown } from 'lucide-react';
import { VoiceSelector } from '@/components/generation/VoiceSelector';
import { useIsMobile } from '@/hooks/use-mobile';

interface VoiceoverSetupStepProps {
  voiceId: string;
  voiceName: string;
  voiceoverTier: 'standard' | 'pro';
  scriptLength: number;
  onVoiceChange: (voiceId: string, voiceName: string) => void;
  onTierChange: (tier: 'standard' | 'pro') => void;
  onGenerateVoiceover: () => void;
  isGenerating: boolean;
  isDisabled: boolean;
  availableCredits: number;
}

export function VoiceoverSetupStep({
  voiceId,
  voiceName,
  voiceoverTier,
  scriptLength,
  onVoiceChange,
  onTierChange,
  onGenerateVoiceover,
  isGenerating,
  isDisabled,
  availableCredits,
}: VoiceoverSetupStepProps) {
  const [voiceDialogOpen, setVoiceDialogOpen] = useState(false);
  const isMobile = useIsMobile();

  // Calculate Pro voiceover cost: +3 credits per 900 characters
  const proCost = Math.ceil(scriptLength / 900) * 3;
  const canAffordPro = availableCredits >= proCost;

  // First generation cost
  const generationCost = voiceoverTier === 'pro' ? proCost : 0;
  const canAfford = voiceoverTier === 'standard' || canAffordPro;

  const handleSelectVoice = (id: string, name: string) => {
    onVoiceChange(id, name);
    setVoiceDialogOpen(false);
  };

  const VoiceSelectorContent = (
    <VoiceSelector
      selectedValue={voiceId}
      onSelectVoice={handleSelectVoice}
    />
  );

  const VoiceTriggerButton = (
    <Button
      variant="outline"
      className="w-full justify-start min-h-[48px]"
      disabled={isDisabled}
    >
      <Volume2 className="w-4 h-4 mr-2 shrink-0" />
      <span className="truncate">{voiceName}</span>
    </Button>
  );

  return (
    <div className="space-y-4">
      {/* Voice Selector */}
      <div className="space-y-2">
        <Label className="text-sm font-bold">Choose Voice</Label>
        {isMobile ? (
          <Sheet open={voiceDialogOpen} onOpenChange={setVoiceDialogOpen}>
            <SheetTrigger asChild>
              {VoiceTriggerButton}
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[85vh]">
              <SheetHeader className="pb-4">
                <SheetTitle>Choose a Voice</SheetTitle>
              </SheetHeader>
              {VoiceSelectorContent}
            </SheetContent>
          </Sheet>
        ) : (
          <Dialog open={voiceDialogOpen} onOpenChange={setVoiceDialogOpen}>
            <DialogTrigger asChild>
              {VoiceTriggerButton}
            </DialogTrigger>
            <DialogContent className="max-w-5xl max-h-[85vh] p-6">
              <DialogHeader className="pb-4">
                <DialogTitle className="text-lg md:text-xl">Choose a Voice</DialogTitle>
                <DialogDescription className="sr-only">
                  Browse and select a professional AI voice for your video
                </DialogDescription>
              </DialogHeader>
              {VoiceSelectorContent}
            </DialogContent>
          </Dialog>
        )}
        <p className="text-xs text-muted-foreground">
          Powered by ElevenLabs
        </p>
      </div>

      {/* Voiceover Tier Selection */}
      <div className="space-y-2">
        <Label className="text-sm font-bold">Voiceover Quality</Label>
        <RadioGroup
          value={voiceoverTier}
          onValueChange={(value) => onTierChange(value as 'standard' | 'pro')}
          className="grid gap-3"
          disabled={isDisabled}
        >
          {/* Standard Option */}
          <label
            className={`flex items-start p-4 border rounded-lg cursor-pointer transition-all min-h-[72px] touch-manipulation ${
              voiceoverTier === 'standard'
                ? 'border-primary bg-primary/5 ring-1 ring-primary'
                : 'hover:border-primary/50'
            } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <RadioGroupItem value="standard" className="mt-1 shrink-0" />
            <div className="ml-3 flex-1">
              <p className="font-medium text-sm">Standard</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                First generation: <span className="text-primary font-medium">FREE</span> • Regenerate: 3 credits
              </p>
            </div>
          </label>

          {/* Pro Option */}
          <label
            className={`flex items-start p-4 border rounded-lg cursor-pointer transition-all min-h-[72px] touch-manipulation ${
              voiceoverTier === 'pro'
                ? 'border-primary bg-primary/5 ring-1 ring-primary'
                : 'hover:border-primary/50'
            } ${isDisabled || !canAffordPro ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <RadioGroupItem value="pro" className="mt-1 shrink-0" disabled={!canAffordPro} />
            <div className="ml-3 flex-1">
              <div className="flex items-center gap-2">
                <p className="font-medium text-sm">Pro</p>
                <Badge variant="secondary" className="text-xs">
                  <Crown className="h-3 w-3 mr-1" />
                  Premium
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                First generation: <span className="font-medium">+{proCost} credits</span> • Regenerate: 6 credits
              </p>
              {!canAffordPro && (
                <p className="text-xs text-destructive mt-1">
                  Insufficient credits ({availableCredits} available)
                </p>
              )}
            </div>
          </label>
        </RadioGroup>
      </div>

      {/* Generate Voiceover Button */}
      <Button
        onClick={onGenerateVoiceover}
        disabled={isDisabled || isGenerating || !canAfford}
        className="w-full min-h-[48px] font-bold"
        size="lg"
      >
        {isGenerating ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Generating Voiceover...
          </>
        ) : generationCost > 0 ? (
          `Generate Voiceover (${generationCost} credits)`
        ) : (
          'Generate Voiceover (Free)'
        )}
      </Button>
    </div>
  );
}
