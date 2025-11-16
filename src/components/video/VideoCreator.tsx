import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useVideoJobs } from '@/hooks/useVideoJobs';
import { useUserTokens } from '@/hooks/useUserTokens';
import { useSavedCaptionPresets } from '@/hooks/useSavedCaptionPresets';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Coins, Sparkles, Volume2, Clock, ChevronDown, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { VoiceSelector } from '../generation/VoiceSelector';
import { BackgroundMediaSelector, SelectedMedia } from './BackgroundMediaSelector';
import { captionPresets, aspectRatioConfig, textEffectPresets } from '@/config/captionStyles';
import { logger } from '@/lib/logger';
import { CaptionStyle } from '@/types/video';
import type { VideoJobInput } from '@/types/video';

export function VideoCreator() {
  const [topic, setTopic] = useState('');
  const [duration, setDuration] = useState(15);
  const [style, setStyle] = useState('modern');
  const [voiceId, setVoiceId] = useState('nPczCjzI2devNBz1zQrb');
  const [voiceName, setVoiceName] = useState('Brian');
  const [voiceDialogOpen, setVoiceDialogOpen] = useState(false);
  const [isGeneratingTopic, setIsGeneratingTopic] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16' | '4:5' | '1:1'>('4:5');
  const [captionStyle, setCaptionStyle] = useState<string>('modern');
  const [customCaptionStyle, setCustomCaptionStyle] = useState<CaptionStyle>(captionPresets.modern);
  const [captionCustomizationOpen, setCaptionCustomizationOpen] = useState(false);
  const [textEffect, setTextEffect] = useState<string>('none');
  const [selectedBackgroundMedia, setSelectedBackgroundMedia] = useState<SelectedMedia[]>([]);
  const [savePresetDialogOpen, setSavePresetDialogOpen] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [confirmGenerateOpen, setConfirmGenerateOpen] = useState(false);
  const { createJob, isCreating, jobs } = useVideoJobs();
  const { data: tokens } = useUserTokens();
  const { presets, savePreset, deletePreset } = useSavedCaptionPresets();

  // Calculate dynamic cost based on duration (0.5 credits per second)
  const estimatedCost = duration * 0.5;
  const maxAffordableDuration = Math.floor((tokens?.tokens_remaining ?? 0) / 0.5);

  const handleSurpriseMe = async () => {
    setIsGeneratingTopic(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-video-topic');
      
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      
      if (data.topic) {
        setTopic(data.topic);
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Error generating topic', err, {
        component: 'VideoCreator',
        operation: 'generateTopic',
        errorMessage: err.message
      });
      toast.error(err.message);
    } finally {
      setIsGeneratingTopic(false);
    }
  };

  const handleSelectVoice = (voiceId: string, voiceName: string) => {
    setVoiceId(voiceId);
    setVoiceName(voiceName);
    setVoiceDialogOpen(false);
  };

  const handleStartGeneration = () => {
    if (!topic.trim()) {
      toast.error('Please enter a topic for your video');
      return;
    }
    setConfirmGenerateOpen(true);
  };

  const handleConfirmGenerate = async () => {
    setConfirmGenerateOpen(false);
    
    createJob.mutate({
      topic: topic.trim(),
      duration,
      style: style as VideoJobInput['style'],
      voice_id: voiceId,
      voice_name: voiceName,
      aspect_ratio: aspectRatio,
      background_video_url: selectedBackgroundMedia[0]?.url || undefined,
      background_video_thumbnail: selectedBackgroundMedia[0]?.thumbnail || undefined,
      background_media_type: selectedBackgroundMedia[0]?.type || 'video',
      caption_style: customCaptionStyle,
    }, {
      onSuccess: (data) => {
        // Track activity
        import('@/lib/logging/client-logger').then(({ clientLogger }) => {
          clientLogger.activity({
            activityType: 'video',
            activityName: 'video_job_created',
            routeName: 'Video Studio',
            description: 'Created new video job',
            metadata: {
              video_job_id: data.job.id,
              duration,
              style,
              aspect_ratio: aspectRatio,
            },
          });
        });
      }
    });

    // Don't reset form - keep current generation visible until user explicitly cancels/resets
  };

  const hasActiveJob = jobs?.some(job => 
    ['pending', 'generating_script', 'awaiting_script_approval', 
     'generating_voice', 'awaiting_voice_approval', 
     'fetching_video', 'assembling'].includes(job.status)
  );

  const canAfford = (tokens?.tokens_remaining ?? 0) >= estimatedCost;
  const isDisabled = isCreating || isGeneratingTopic || hasActiveJob;

  return (
    <Card className="border-2 w-full overflow-hidden">
      <CardHeader className="space-y-2">
        <CardTitle className="text-xl sm:text-2xl font-black break-words">
          CREATE FACELESS VIDEO
        </CardTitle>
        <CardDescription className="text-sm">
          Generate professional videos with AI in minutes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 md:space-y-6 min-w-0">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <Label htmlFor="topic" className="text-sm font-bold">
              Video Topic *
            </Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSurpriseMe}
              disabled={isDisabled}
              className="h-8 text-xs"
            >
              {isGeneratingTopic ? (
                <>
                  <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-1.5 h-3 w-3" />
                  Surprise Me
                </>
              )}
            </Button>
          </div>
          <Input
            id="topic"
            placeholder="e.g., Top 5 AI tools for productivity"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            maxLength={500}
            disabled={isDisabled}
            className="text-sm w-full min-w-0"
          />
          <p className="text-xs text-muted-foreground">
            {topic.length}/500 characters
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="duration" className="text-sm font-bold">
            Duration: {duration} seconds
          </Label>
          <div className="overflow-x-hidden px-1">
            <Slider
              id="duration"
              min={15}
              max={180}
              step={5}
              value={[duration]}
              onValueChange={(value) => setDuration(value[0])}
              disabled={isDisabled}
              className="w-full max-w-full"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Approximate only: final length of the video to be determined by the audio time (1s = 0.5 credits)
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="style" className="text-sm font-bold">
            Video Style
          </Label>
          <Select value={style} onValueChange={setStyle} disabled={isDisabled}>
            <SelectTrigger id="style">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="modern">🎨 Modern - Clean & Professional</SelectItem>
              <SelectItem value="tech">💻 Tech - Futuristic & Digital</SelectItem>
              <SelectItem value="educational">📚 Educational - Learning Focused</SelectItem>
              <SelectItem value="dramatic">🎬 Dramatic - Cinematic & Bold</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-bold">
            Voiceover
          </Label>
          <Dialog open={voiceDialogOpen} onOpenChange={setVoiceDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                disabled={isDisabled}
              >
                <Volume2 className="w-4 h-4 mr-2" />
                {voiceName}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-5xl max-h-[85vh] p-6">
              <DialogHeader className="pb-4">
                <DialogTitle className="text-lg md:text-xl">Choose a Voice</DialogTitle>
              </DialogHeader>
              <VoiceSelector
                selectedValue={voiceId}
                onSelectVoice={handleSelectVoice}
              />
            </DialogContent>
          </Dialog>
          <p className="text-xs text-muted-foreground">
            Browse and preview professional AI voices (powered by ElevenLabs)
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="aspectRatio" className="text-sm font-bold">
            Aspect Ratio
          </Label>
          <Select value={aspectRatio} onValueChange={(value: any) => setAspectRatio(value)} disabled={isDisabled}>
            <SelectTrigger id="aspectRatio">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(aspectRatioConfig).map(([ratio, config]) => (
                <SelectItem key={ratio} value={ratio}>
                  {config.label} ({ratio})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Choose the format for your target platform
          </p>
        </div>

        <Collapsible 
          open={captionCustomizationOpen} 
          onOpenChange={setCaptionCustomizationOpen}
          className="space-y-2"
        >
          <CollapsibleTrigger className="flex items-center justify-between w-full group">
            <Label className="text-sm font-bold">Customize Captions</Label>
            <ChevronDown 
              className={`h-4 w-4 transition-transform ${captionCustomizationOpen ? 'rotate-180' : ''}`} 
            />
          </CollapsibleTrigger>
          
          {/* Preview Box */}
          <div 
            className="mt-2 p-4 rounded-lg border-2 border-dashed relative"
            style={{ minHeight: '100px' }}
          >
            <div className="text-xs text-muted-foreground mb-2">Caption Preview</div>
            <div 
              className="inline-block px-3 py-2 rounded"
              style={{
                backgroundColor: customCaptionStyle.backgroundColor,
                opacity: customCaptionStyle.backgroundOpacity ?? 0.95,
                padding: `${customCaptionStyle.backgroundPadding ?? 15}px`,
                borderRadius: `${customCaptionStyle.backgroundBorderRadius ?? 8}px`
              }}
            >
              <span 
                style={{
                  color: customCaptionStyle.textColor,
                  fontSize: `${Math.min(customCaptionStyle.fontSize / 2, 24)}px`,
                  fontWeight: customCaptionStyle.fontWeight,
                  lineHeight: customCaptionStyle.lineHeight ?? 1.3,
                  WebkitTextStroke: customCaptionStyle.strokeWidth 
                    ? `${customCaptionStyle.strokeWidth}px ${customCaptionStyle.strokeColor ?? '#000000'}`
                    : undefined,
                  textShadow: customCaptionStyle.shadowBlur
                    ? `${customCaptionStyle.shadowOffsetX ?? 0}px ${customCaptionStyle.shadowOffsetY ?? 0}px ${customCaptionStyle.shadowBlur}px ${customCaptionStyle.shadowColor ?? '#000000'}`
                    : undefined
                }}
              >
                Sample Caption Text
              </span>
            </div>
          </div>
          
          {/* Saved Presets Section */}
          {presets && presets.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs font-bold">Your Saved Presets</Label>
              <div className="grid gap-2">
                {presets.map((preset) => (
                  <div key={preset.id} className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 justify-start h-9"
                      onClick={() => {
                        setCustomCaptionStyle(preset.settings as unknown as CaptionStyle);
                        toast.success(`Loaded "${preset.name}"`);
                      }}
                      disabled={isDisabled}
                    >
                      {preset.name}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 flex-shrink-0"
                      onClick={() => deletePreset.mutate(preset.id)}
                      disabled={isDisabled}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Save Current Settings Button */}
          <Dialog open={savePresetDialogOpen} onOpenChange={setSavePresetDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="w-full h-9"
                disabled={isDisabled || (presets && presets.length >= 3)}
              >
                <Save className="mr-2 h-4 w-4" />
                Save Current Settings {presets && `(${presets.length}/3)`}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Save Caption Preset</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="preset-name">Preset Name</Label>
                  <Input
                    id="preset-name"
                    placeholder="e.g., My Bold Style"
                    value={presetName}
                    onChange={(e) => setPresetName(e.target.value)}
                    maxLength={30}
                  />
                </div>
                <Button
                  onClick={() => {
                    if (!presetName.trim()) {
                      toast.error('Please enter a preset name');
                      return;
                    }
                    savePreset.mutate({
                      name: presetName.trim(),
                      settings: customCaptionStyle,
                    });
                    setPresetName('');
                    setSavePresetDialogOpen(false);
                  }}
                  disabled={!presetName.trim() || savePreset.isPending}
                  className="w-full"
                >
                  {savePreset.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Preset'
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          
          <CollapsibleContent className="space-y-3 pt-2">
            {/* Preset selector */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Start with a Preset</Label>
              <Select 
                value={captionStyle} 
                onValueChange={(value) => {
                  setCaptionStyle(value);
                  setCustomCaptionStyle(captionPresets[value]);
                }} 
                disabled={isDisabled}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="modern">Modern</SelectItem>
                  <SelectItem value="minimal">Minimal</SelectItem>
                  <SelectItem value="bold">Bold</SelectItem>
                  <SelectItem value="elegant">Elegant</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Text Effect Presets */}
            <div className="space-y-2">
              <Label className="text-xs font-bold">✨ Text Effects (Quick Apply)</Label>
              <Select 
                value={textEffect} 
                onValueChange={(value) => {
                  setTextEffect(value);
                  setCustomCaptionStyle({
                    ...customCaptionStyle,
                    ...textEffectPresets[value]
                  });
                }} 
                disabled={isDisabled}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  <SelectItem value="none">🚫 No Effect</SelectItem>
                  <SelectItem value="classicShadow">🌑 Classic Shadow</SelectItem>
                  <SelectItem value="softShadow">☁️ Soft Shadow</SelectItem>
                  <SelectItem value="boldOutline">⚫ Bold Outline</SelectItem>
                  <SelectItem value="neonGlow">💚 Neon Glow</SelectItem>
                  <SelectItem value="dramaticGlow">💖 Dramatic Glow</SelectItem>
                  <SelectItem value="retroGlow">🌈 Retro Glow</SelectItem>
                  <SelectItem value="goldLuxury">✨ Gold Luxury</SelectItem>
                  <SelectItem value="iceEffect">❄️ Ice Effect</SelectItem>
                  <SelectItem value="fireGlow">🔥 Fire Glow</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Apply a preset effect or customize manually below
              </p>
            </div>

            {/* 2x3 Grid Layout for desktop spinners */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {/* Font Size */}
              <div className="space-y-2">
                <Label htmlFor="fontSize" className="text-xs">Font Size</Label>
                <Input
                  id="fontSize"
                  type="number"
                  min={30}
                  max={80}
                  step={1}
                  value={customCaptionStyle.fontSize}
                  onChange={(e) => {
                    const value = Math.max(30, Math.min(80, Number(e.target.value)));
                    setCustomCaptionStyle({
                      ...customCaptionStyle,
                      fontSize: value
                    });
                  }}
                  disabled={isDisabled}
                  className="h-9"
                />
              </div>

              {/* Line Height */}
              <div className="space-y-2">
                <Label htmlFor="lineHeight" className="text-xs">Line Height</Label>
                <Input
                  id="lineHeight"
                  type="number"
                  min={1.0}
                  max={2.0}
                  step={0.1}
                  value={(customCaptionStyle.lineHeight ?? 1.3).toFixed(1)}
                  onChange={(e) => {
                    const value = Math.max(1.0, Math.min(2.0, Number(e.target.value)));
                    setCustomCaptionStyle({
                      ...customCaptionStyle,
                      lineHeight: Number(value.toFixed(1))
                    });
                  }}
                  disabled={isDisabled}
                  className="h-9"
                />
              </div>

              {/* Background Opacity */}
              <div className="space-y-2">
                <Label htmlFor="bgOpacity" className="text-xs">BG Opacity</Label>
                <Input
                  id="bgOpacity"
                  type="number"
                  min={0}
                  max={100}
                  step={5}
                  value={Math.round((customCaptionStyle.backgroundOpacity ?? 0.95) * 100)}
                  onChange={(e) => {
                    const value = Math.max(0, Math.min(100, Number(e.target.value)));
                    setCustomCaptionStyle({
                      ...customCaptionStyle,
                      backgroundOpacity: value / 100
                    });
                  }}
                  disabled={isDisabled}
                  className="h-9"
                />
              </div>

              {/* Background Padding */}
              <div className="space-y-2">
                <Label htmlFor="bgPadding" className="text-xs">BG Padding</Label>
                <Input
                  id="bgPadding"
                  type="number"
                  min={0}
                  max={30}
                  step={1}
                  value={customCaptionStyle.backgroundPadding ?? 15}
                  onChange={(e) => {
                    const value = Math.max(0, Math.min(30, Number(e.target.value)));
                    setCustomCaptionStyle({
                      ...customCaptionStyle,
                      backgroundPadding: value
                    });
                  }}
                  disabled={isDisabled}
                  className="h-9"
                />
              </div>

              {/* Border Radius */}
              <div className="space-y-2">
                <Label htmlFor="borderRadius" className="text-xs">Border Radius</Label>
                <Input
                  id="borderRadius"
                  type="number"
                  min={0}
                  max={20}
                  step={1}
                  value={customCaptionStyle.backgroundBorderRadius ?? 8}
                  onChange={(e) => {
                    const value = Math.max(0, Math.min(20, Number(e.target.value)));
                    setCustomCaptionStyle({
                      ...customCaptionStyle,
                      backgroundBorderRadius: value
                    });
                  }}
                  disabled={isDisabled}
                  className="h-9"
                />
              </div>

              {/* Text Outline Width */}
              <div className="space-y-2">
                <Label htmlFor="outlineWidth" className="text-xs">Outline Width</Label>
                <Input
                  id="outlineWidth"
                  type="number"
                  min={0}
                  max={8}
                  step={1}
                  value={customCaptionStyle.strokeWidth ?? 0}
                  onChange={(e) => {
                    const value = Math.max(0, Math.min(8, Number(e.target.value)));
                    setCustomCaptionStyle({
                      ...customCaptionStyle,
                      strokeWidth: value
                    });
                  }}
                  disabled={isDisabled}
                  className="h-9"
                />
              </div>
            </div>

            {/* 2-Column Grid for remaining controls */}
            <div className="grid grid-cols-2 gap-3">
              {/* Horizontal Alignment */}
              <div className="space-y-2">
                <Label className="text-xs">H-Align</Label>
                <Select 
                  value={customCaptionStyle.horizontalAlignment ?? 'center'} 
                  onValueChange={(value: 'left' | 'center' | 'right') => 
                    setCustomCaptionStyle({
                      ...customCaptionStyle,
                      horizontalAlignment: value
                    })
                  } 
                  disabled={isDisabled}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">Left</SelectItem>
                    <SelectItem value="center">Center</SelectItem>
                    <SelectItem value="right">Right</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Vertical Alignment */}
              <div className="space-y-2">
                <Label className="text-xs">V-Align</Label>
                <Select 
                  value={customCaptionStyle.verticalAlignment ?? 'center'} 
                  onValueChange={(value: 'top' | 'center' | 'bottom') => 
                    setCustomCaptionStyle({
                      ...customCaptionStyle,
                      verticalAlignment: value
                    })
                  } 
                  disabled={isDisabled}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="top">Top</SelectItem>
                    <SelectItem value="center">Center</SelectItem>
                    <SelectItem value="bottom">Bottom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Font Family */}
              <div className="space-y-2">
                <Label className="text-xs">Font Family</Label>
                <Select 
                  value={customCaptionStyle.fontFamily} 
                  onValueChange={(value) => {
                    const fontUrls: Record<string, string | undefined> = {
                      'Space Grotesk Bold': 'https://github.com/floriankarsten/space-grotesk/raw/master/fonts/SpaceGrotesk-Bold.ttf',
                      'Permanent Marker': undefined,
                      'Clear Sans': undefined,
                      'Didact Gothic': undefined,
                      'Montserrat Bold': 'https://github.com/JulietaUla/Montserrat/raw/master/fonts/ttf/Montserrat-Bold.ttf',
                      'Bebas Neue': undefined,
                      'Oswald Bold': undefined,
                      'Roboto Black': undefined
                    };
                    setCustomCaptionStyle({
                      ...customCaptionStyle,
                      fontFamily: value,
                      fontUrl: fontUrls[value]
                    });
                  }} 
                  disabled={isDisabled}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Space Grotesk Bold">Space Grotesk</SelectItem>
                    <SelectItem value="Montserrat Bold">Montserrat</SelectItem>
                    <SelectItem value="Bebas Neue">Bebas Neue</SelectItem>
                    <SelectItem value="Oswald Bold">Oswald</SelectItem>
                    <SelectItem value="Roboto Black">Roboto</SelectItem>
                    <SelectItem value="Permanent Marker">Permanent</SelectItem>
                    <SelectItem value="Clear Sans">Clear Sans</SelectItem>
                    <SelectItem value="Didact Gothic">Didact</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Font Weight */}
              <div className="space-y-2">
                <Label className="text-xs">Font Weight</Label>
                <Select 
                  value={customCaptionStyle.fontWeight} 
                  onValueChange={(value: 'normal' | 'bold' | 'black') => 
                    setCustomCaptionStyle({
                      ...customCaptionStyle,
                      fontWeight: value
                    })
                  } 
                  disabled={isDisabled}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="bold">Bold</SelectItem>
                    <SelectItem value="black">Black</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Outline Color (conditional, full width) */}
            {customCaptionStyle.strokeWidth && customCaptionStyle.strokeWidth > 0 && (
              <div className="space-y-2">
                <Label className="text-xs">Outline Color</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start gap-2 h-9"
                      disabled={isDisabled}
                    >
                      <div 
                        className="w-5 h-5 rounded border-2" 
                        style={{ backgroundColor: customCaptionStyle.strokeColor ?? '#000000' }}
                      />
                      {customCaptionStyle.strokeColor ?? '#000000'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64">
                    <Input
                      type="color"
                      value={customCaptionStyle.strokeColor ?? '#000000'}
                      onChange={(e) => setCustomCaptionStyle({
                        ...customCaptionStyle,
                        strokeColor: e.target.value
                      })}
                      className="h-10 cursor-pointer"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}

            {/* Text Shadow Blur */}
            <div className="space-y-2">
              <Label className="text-xs">Text Shadow Blur: {customCaptionStyle.shadowBlur ?? 0}px</Label>
              <Slider
                min={0}
                max={20}
                step={1}
                value={[customCaptionStyle.shadowBlur ?? 0]}
                onValueChange={(value) => setCustomCaptionStyle({
                  ...customCaptionStyle,
                  shadowBlur: value[0]
                })}
                disabled={isDisabled}
              />
            </div>

            {/* Shadow settings (conditional) */}
            {customCaptionStyle.shadowBlur && customCaptionStyle.shadowBlur > 0 && (
              <>
                <div className="space-y-2">
                  <Label className="text-xs">Shadow Color</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="w-full justify-start gap-2 h-9"
                        disabled={isDisabled}
                      >
                        <div 
                          className="w-5 h-5 rounded border-2" 
                          style={{ backgroundColor: customCaptionStyle.shadowColor ?? '#000000' }}
                        />
                        {customCaptionStyle.shadowColor ?? '#000000'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64">
                      <Input
                        type="color"
                        value={customCaptionStyle.shadowColor ?? '#000000'}
                        onChange={(e) => setCustomCaptionStyle({
                          ...customCaptionStyle,
                          shadowColor: e.target.value
                        })}
                        className="h-10 cursor-pointer"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs">
                      Shadow X: {customCaptionStyle.shadowOffsetX ?? 0}px
                    </Label>
                    <Slider
                      min={-10}
                      max={10}
                      step={1}
                      value={[customCaptionStyle.shadowOffsetX ?? 0]}
                      onValueChange={(value) => setCustomCaptionStyle({
                        ...customCaptionStyle,
                        shadowOffsetX: value[0]
                      })}
                      disabled={isDisabled}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">
                      Shadow Y: {customCaptionStyle.shadowOffsetY ?? 0}px
                    </Label>
                    <Slider
                      min={-10}
                      max={10}
                      step={1}
                      value={[customCaptionStyle.shadowOffsetY ?? 0]}
                      onValueChange={(value) => setCustomCaptionStyle({
                        ...customCaptionStyle,
                        shadowOffsetY: value[0]
                      })}
                      disabled={isDisabled}
                    />
                  </div>
                </div>
              </>
            )}

          </CollapsibleContent>
        </Collapsible>

        <BackgroundMediaSelector
          style={style}
          duration={duration}
          aspectRatio={aspectRatio}
          selectedMedia={selectedBackgroundMedia}
          onSelectMedia={setSelectedBackgroundMedia}
        />

        {hasActiveJob && (
          <Alert className="bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800">
            <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            <AlertTitle className="text-orange-900 dark:text-orange-100">
              Generation In Progress
            </AlertTitle>
            <AlertDescription className="text-orange-800 dark:text-orange-200 text-sm">
              Please wait for your current video to complete or fail before creating a new one. 
              Check "Current Generation" section below for status.
            </AlertDescription>
          </Alert>
        )}

        <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-3 md:p-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Coins className="h-4 w-4 md:h-5 md:w-5 text-primary" />
              <span className="font-bold text-sm md:text-base">Cost: {Number(estimatedCost).toFixed(2)} credits</span>
            </div>
            <div className="text-xs md:text-sm text-muted-foreground">
              Balance: {Number(tokens?.tokens_remaining || 0).toFixed(2)} credits
            </div>
          </div>
          {!canAfford && (
            <p className="mt-2 text-xs md:text-sm text-destructive font-medium">
              Insufficient credits. Reduce duration to {maxAffordableDuration}s or purchase more credits.
            </p>
          )}
        </div>

        <Button 
          onClick={handleStartGeneration} 
          disabled={isDisabled || !topic.trim() || !canAfford}
          className="w-full h-11 md:h-12 text-base md:text-lg font-bold"
          size="lg"
        >
          {isCreating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 md:h-5 md:w-5 animate-spin" />
              Creating Video...
            </>
          ) : (
            <>
              🎬 Create Video ({Number(estimatedCost).toFixed(2)} credits)
            </>
          )}
        </Button>

        <div className="text-xs text-muted-foreground space-y-1">
          <p>• Generation takes 3-5 minutes</p>
          <p>• AI generates script, voiceover, and assembles video</p>
          <p>• You'll be notified when complete</p>
        </div>
      </CardContent>

      {/* Confirmation Dialog */}
      <Dialog open={confirmGenerateOpen} onOpenChange={setConfirmGenerateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Confirm Video Generation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Alert>
              <Sparkles className="h-4 w-4" />
              <AlertTitle>Ready to Generate</AlertTitle>
              <AlertDescription className="space-y-2 mt-2">
                <p className="font-medium">Topic: {topic}</p>
                <p>Duration: {duration} seconds</p>
                <p>Cost: {estimatedCost.toFixed(1)} credits</p>
              </AlertDescription>
            </Alert>
            <p className="text-sm text-muted-foreground">
              This will start the AI video generation process. It takes 3-5 minutes to complete.
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setConfirmGenerateOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmGenerate}
              disabled={isCreating}
              className="flex-1"
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Video
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
