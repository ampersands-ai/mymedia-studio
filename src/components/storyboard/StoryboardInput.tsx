import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useStoryboard } from '@/hooks/useStoryboard';
import { useUserTokens } from '@/hooks/useUserTokens';
import { Sparkles, Film, Coins, Volume2, Play, Loader2, Palette, Image as ImageIcon, Video as VideoIcon, Wand2, Music, ChevronDown, RotateCcw, Minus, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { BackgroundMusicSelector } from './BackgroundMusicSelector';
import { VoiceSelector } from '@/components/generation/VoiceSelector';
import { supabase } from '@/integrations/supabase/client';
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
import type { MediaType } from '@/types/video';
import { Input } from '@/components/ui/input';
import hyperRealisticImg from '@/assets/styles/hyper-realistic.jpg';
import cinematicImg from '@/assets/styles/cinematic.jpg';
import animatedImg from '@/assets/styles/animated.jpg';
import cartoonImg from '@/assets/styles/cartoon.jpg';
import naturalImg from '@/assets/styles/natural.jpg';
import sketchImg from '@/assets/styles/sketch.jpg';


const STYLES = [
  { 
    value: 'hyper-realistic', 
    label: 'Hyper Realistic', 
    emoji: '📷',
    image: hyperRealisticImg,
    description: 'Ultra-realistic, photo-quality visuals'
  },
  { 
    value: 'cinematic', 
    label: 'Cinematic', 
    emoji: '🎬',
    image: cinematicImg,
    description: 'Movie-like dramatic lighting & composition'
  },
  { 
    value: 'animated', 
    label: 'Animated', 
    emoji: '✨',
    image: animatedImg,
    description: '3D rendered, Pixar-style animation'
  },
  { 
    value: 'cartoon', 
    label: 'Cartoon', 
    emoji: '🎨',
    image: cartoonImg,
    description: '2D illustrated, playful cartoon style'
  },
  { 
    value: 'natural', 
    label: 'Natural', 
    emoji: '🍃',
    image: naturalImg,
    description: 'Natural photography, authentic look'
  },
  { 
    value: 'sketch', 
    label: 'Sketch', 
    emoji: '✏️',
    image: sketchImg,
    description: 'Hand-drawn, artistic pencil sketch'
  },
];

const TONES = [
  { value: 'engaging', label: 'Engaging & Curious' },
  { value: 'educational', label: 'Educational & Informative' },
  { value: 'dramatic', label: 'Dramatic & Intense' },
  { value: 'humorous', label: 'Humorous & Playful' },
  { value: 'mysterious', label: 'Mysterious & Intriguing' },
];

const TOPIC_SUGGESTIONS = [
  'Why octopuses have 3 hearts and blue blood',
  'The science behind lucid dreaming',
  'How ancient pyramids were actually built',
  'The hidden psychology of social media addiction',
  'Why we forget our dreams seconds after waking up',
  'The butterfly effect in quantum physics',
  'How your brain creates false memories',
  'The secret language of dolphins',
  'Why time feels faster as you get older',
  'The truth about the Bermuda Triangle',
  'How honey never expires',
  'The science of déjà vu',
  'Why cats always land on their feet',
  'The mystery of dark matter',
  'How trees communicate underground',
  'The real reason we yawn',
  'Why we get goosebumps',
  'The hidden power of your subconscious mind',
  'How artificial intelligence dreams',
  'The science behind love at first sight',
];

const MEDIA_TYPES = [
  { value: 'image' as MediaType, label: 'Static Images', icon: ImageIcon, description: 'AI-generated images' },
  { value: 'video' as MediaType, label: 'Video Clips', icon: VideoIcon, description: 'Stock video footage' },
  { value: 'animated' as MediaType, label: 'Animated', icon: Wand2, description: 'Images with motion effects' },
];

const DRAFT_KEY = 'storyboardInputDraft';

export function StoryboardInput() {
  // Load from localStorage or use defaults
  const loadDraft = () => {
    try {
      const draft = localStorage.getItem(DRAFT_KEY);
      return draft ? JSON.parse(draft) : null;
    } catch {
      return null;
    }
  };
  
  const draft = loadDraft();
  
  const [topic, setTopic] = useState(draft?.topic || '');
  const [duration, setDuration] = useState(draft?.duration || 60);
  const [style, setStyle] = useState(draft?.style || 'hyper-realistic');
  const [tone, setTone] = useState(draft?.tone || 'engaging');
  const [voiceID, setVoiceID] = useState(draft?.voiceID || 'en-US-TonyNeural');
  const [voiceName, setVoiceName] = useState(draft?.voiceName || 'Tony');
  const [mediaType, setMediaType] = useState<MediaType>(draft?.mediaType || 'image');
  const [backgroundMusicUrl, setBackgroundMusicUrl] = useState(draft?.backgroundMusicUrl || '');
  const [backgroundMusicVolume, setBackgroundMusicVolume] = useState(draft?.backgroundMusicVolume || 5);
  const [voiceDialogOpen, setVoiceDialogOpen] = useState(false);
  const [styleDialogOpen, setStyleDialogOpen] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  
  // Advanced video settings
  const [aspectRatio, setAspectRatio] = useState(draft?.aspectRatio || 'instagram-story');
  // Migrate old/invalid quality values to 'high'
  const validQualities = ['low', 'medium', 'high'];
  const draftQuality = draft?.videoQuality && validQualities.includes(draft.videoQuality) ? draft.videoQuality : 'high';
  const [videoQuality, setVideoQuality] = useState(draftQuality);
  const [customWidth, setCustomWidth] = useState(draft?.customWidth || 1920);
  const [customHeight, setCustomHeight] = useState(draft?.customHeight || 1080);
  
  // Subtitle settings (comprehensive)
  const [subtitleLanguage, setSubtitleLanguage] = useState(draft?.subtitleLanguage || 'auto');
  const [subtitleModel, setSubtitleModel] = useState(draft?.subtitleModel || 'default');
  const [subtitleStyle, setSubtitleStyle] = useState(draft?.subtitleStyle || 'boxed-word');
  const [subtitleFontFamily, setSubtitleFontFamily] = useState(draft?.subtitleFontFamily || 'Oswald Bold');
  const [subtitlePosition, setSubtitlePosition] = useState(draft?.subtitlePosition || 'mid-bottom-center');
  const [subtitleFontSize, setSubtitleFontSize] = useState(draft?.subtitleFontSize || 140);
  const [subtitleAllCaps, setSubtitleAllCaps] = useState(draft?.subtitleAllCaps ?? false);
  const [subtitleBoxColor, setSubtitleBoxColor] = useState(draft?.subtitleBoxColor || '#000000');
  const [subtitleLineColor, setSubtitleLineColor] = useState(draft?.subtitleLineColor || '#FFFFFF');
  const [subtitleWordColor, setSubtitleWordColor] = useState(draft?.subtitleWordColor || '#FFFF00');
  const [subtitleOutlineColor, setSubtitleOutlineColor] = useState(draft?.subtitleOutlineColor || '#000000');
  const [subtitleOutlineWidth, setSubtitleOutlineWidth] = useState(draft?.subtitleOutlineWidth || 8);
  const [subtitleShadowColor, setSubtitleShadowColor] = useState(draft?.subtitleShadowColor || '#000000');
  const [subtitleShadowOffset, setSubtitleShadowOffset] = useState(draft?.subtitleShadowOffset || 0);
  const [subtitleMaxWordsPerLine, setSubtitleMaxWordsPerLine] = useState(draft?.subtitleMaxWordsPerLine || 4);
  
  // Audio settings
  const [musicVolume, setMusicVolume] = useState(draft?.musicVolume || 0.05);
  const [musicFadeIn, setMusicFadeIn] = useState(draft?.musicFadeIn || 2);
  const [musicFadeOut, setMusicFadeOut] = useState(draft?.musicFadeOut || 2);
  
  // Image animation settings
  const [imageZoom, setImageZoom] = useState(draft?.imageZoom || 2);
  const [imagePosition, setImagePosition] = useState(draft?.imagePosition || 'center-center');
  
  // Advanced options
  const [enableCache, setEnableCache] = useState(draft?.enableCache ?? true);
  const [draftMode, setDraftMode] = useState(draft?.draftMode ?? false);

  const { generateStoryboard, isGenerating, storyboard, clearStoryboard } = useStoryboard();
  const { data: tokenData } = useUserTokens();
  
  // Save draft to localStorage (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      const draftData = {
        topic, duration, style, tone, voiceID, voiceName, mediaType, backgroundMusicUrl,
        backgroundMusicVolume, aspectRatio, videoQuality, subtitleLanguage, subtitleModel,
        subtitleStyle, subtitleFontFamily, subtitlePosition, subtitleFontSize, subtitleAllCaps,
        subtitleBoxColor, subtitleLineColor, subtitleWordColor, subtitleOutlineColor,
        subtitleOutlineWidth, subtitleShadowColor, subtitleShadowOffset, subtitleMaxWordsPerLine,
        musicVolume, musicFadeIn, musicFadeOut, imageZoom, imagePosition, enableCache, draftMode,
        customWidth, customHeight
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draftData));
    }, 500);
    return () => clearTimeout(timer);
  }, [topic, duration, style, tone, voiceID, voiceName, mediaType, backgroundMusicUrl, backgroundMusicVolume,
      aspectRatio, videoQuality, subtitleLanguage, subtitleModel, subtitleStyle, subtitleFontFamily,
      subtitlePosition, subtitleFontSize, subtitleAllCaps, subtitleBoxColor, subtitleLineColor,
      subtitleWordColor, subtitleOutlineColor, subtitleOutlineWidth, subtitleShadowColor,
      subtitleShadowOffset, subtitleMaxWordsPerLine, musicVolume, musicFadeIn, musicFadeOut,
      imageZoom, imagePosition, enableCache, draftMode, customWidth, customHeight]);

  // Cost: 0.25 credits per second of video duration
  const estimatedCost = duration * 0.25;
  const canGenerate = topic.length >= 5 && topic.length <= 500 && (tokenData?.tokens_remaining || 0) >= estimatedCost;

  const handleSurpriseMe = () => {
    const randomTopic = TOPIC_SUGGESTIONS[Math.floor(Math.random() * TOPIC_SUGGESTIONS.length)];
    setTopic(randomTopic);
    toast.success('✨ Random topic selected!', { id: 'random-topic' });
  };

  const handleSelectVoice = (selectedVoiceId: string, selectedVoiceName: string) => {
    setVoiceID(selectedVoiceId);
    setVoiceName(selectedVoiceName);
    setVoiceDialogOpen(false);
  };

  const handleReset = async () => {
    // If there's an active storyboard, show confirmation dialog
    if (storyboard?.id) {
      setShowResetDialog(true);
      return;
    }
    
    // Just reset inputs if no storyboard
    performReset();
  };
  
  const performReset = async (deleteStoryboard = false) => {
    // Delete storyboard if requested
    if (deleteStoryboard && storyboard?.id) {
      try {
        const { error } = await supabase.functions.invoke('delete-storyboard', {
          body: { storyboardId: storyboard.id }
        });
        
        if (error) throw error;
        
        clearStoryboard();
        toast.success('Storyboard deleted and form reset', { id: 'storyboard-reset' });
      } catch (error: any) {
        toast.error(error.message || 'Failed to delete storyboard', { id: 'delete-error' });
        return;
      }
    }
    
    // Reset all fields
    setTopic('');
    setDuration(15);
    setStyle('hyper-realistic');
    setTone('engaging');
    setVoiceID('en-US-AndrewMultilingualNeural');
    setVoiceName('Andrew');
    setMediaType('image');
    setBackgroundMusicUrl('');
    setBackgroundMusicVolume(5);
    setAspectRatio('instagram-story');
    setVideoQuality('high');
    setCustomWidth(1920);
    setCustomHeight(1080);
    setSubtitleLanguage('auto');
    setSubtitleModel('default');
    setSubtitleStyle('boxed-word');
    setSubtitleFontFamily('Oswald Bold');
    setSubtitlePosition('mid-bottom-center');
    setSubtitleFontSize(140);
    setSubtitleAllCaps(false);
    setSubtitleBoxColor('#000000');
    setSubtitleLineColor('#FFFFFF');
    setSubtitleWordColor('#FFFF00');
    setSubtitleOutlineColor('#000000');
    setSubtitleOutlineWidth(8);
    setSubtitleShadowColor('#000000');
    setSubtitleShadowOffset(0);
    setSubtitleMaxWordsPerLine(4);
    setMusicVolume(0.05);
    setMusicFadeIn(2);
    setMusicFadeOut(2);
    setImageZoom(2);
    setImagePosition('center-center');
    setEnableCache(true);
    setDraftMode(false);
    
    // Clear localStorage draft
    localStorage.removeItem(DRAFT_KEY);
    
    if (!deleteStoryboard) {
      toast.success('Form reset to defaults', { id: 'form-reset' });
    }
  };

  const handleGenerate = async () => {
    if (!canGenerate) {
      if (topic.length < 5) {
        toast.error('Topic must be at least 5 characters', { id: 'topic-error' });
      } else if (topic.length > 500) {
        toast.error('Topic must be less than 500 characters', { id: 'topic-error' });
      } else {
        toast.error('Insufficient tokens', { id: 'token-error' });
      }
      return;
    }

    await generateStoryboard({
      topic,
      duration,
      style,
      tone,
      voiceID,
      voiceName,
      mediaType,
      backgroundMusicUrl,
      backgroundMusicVolume,
      aspectRatio,
      videoQuality,
      customWidth: aspectRatio === 'custom' ? customWidth : undefined,
      customHeight: aspectRatio === 'custom' ? customHeight : undefined,
      subtitleSettings: {
        language: subtitleLanguage,
        model: subtitleModel,
        style: subtitleStyle,
        fontFamily: subtitleFontFamily,
        fontSize: subtitleFontSize,
        allCaps: subtitleAllCaps,
        boxColor: subtitleBoxColor,
        lineColor: subtitleLineColor,
        wordColor: subtitleWordColor,
        position: subtitlePosition,
        outlineColor: subtitleOutlineColor,
        outlineWidth: subtitleOutlineWidth,
        shadowColor: subtitleShadowColor,
        shadowOffset: subtitleShadowOffset,
        maxWordsPerLine: subtitleMaxWordsPerLine,
      },
      musicSettings: {
        volume: musicVolume,
        fadeIn: musicFadeIn,
        fadeOut: musicFadeOut,
        duration: -2,
      },
      imageAnimationSettings: {
        zoom: imageZoom,
        position: imagePosition,
      },
      enableCache,
      draftMode,
    });
  };

  return (
    <Card className="relative overflow-hidden bg-card border-2">
      <CardHeader className="space-y-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-black flex items-center gap-2">
            <Film className="w-5 h-5" />
            CREATE STORYBOARD
          </CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={isGenerating}
            className="gap-2"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </Button>
        </div>
        <CardDescription className="text-sm">
          Generate AI-powered video scripts with full editing control
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Topic Input */}
        <div className="space-y-2">
          <Label htmlFor="topic" className="text-sm font-medium">
            Video Topic *
          </Label>
          <Textarea
            id="topic"
            placeholder="e.g., 'The Science Behind Dreams' or 'Top 5 Ancient Civilizations'"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="min-h-[80px] resize-none"
            disabled={isGenerating}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSurpriseMe}
            disabled={isGenerating}
            className="gap-2"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Surprise Me
          </Button>
        </div>

        {/* Duration Slider */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Video Duration</Label>
            <span className="text-sm font-bold text-primary">
              {duration}s (~{Math.round(duration / 5)} scenes)
            </span>
          </div>
          <Slider
            value={[duration]}
            onValueChange={(values) => setDuration(values[0])}
            min={15}
            max={120}
            step={5}
            disabled={isGenerating}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>15s</span>
            <span>120s</span>
          </div>
        </div>

        {/* Resolution */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Resolution</Label>
          <Select value={aspectRatio} onValueChange={setAspectRatio} disabled={isGenerating}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              <SelectItem value="sd">SD - 640×480 (4:3)</SelectItem>
              <SelectItem value="hd">HD - 1280×720 (16:9)</SelectItem>
              <SelectItem value="full-hd">Full HD - 1920×1080 (16:9)</SelectItem>
              <SelectItem value="squared">Square - 1080×1080 (1:1)</SelectItem>
              <SelectItem value="instagram-story">Instagram Story - 1080×1920 (9:16)</SelectItem>
              <SelectItem value="instagram-feed">Instagram Feed - 1080×1350 (4:5)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Style Selection */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Video Style</Label>
          <Dialog open={styleDialogOpen} onOpenChange={setStyleDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full justify-start" disabled={isGenerating}>
                <Palette className="w-4 h-4 mr-2" />
                {STYLES.find(s => s.value === style)?.emoji} {STYLES.find(s => s.value === style)?.label}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-3xl lg:max-w-6xl max-h-[90vh] flex flex-col p-4 sm:p-6">
              <DialogHeader>
          <DialogTitle className="text-base sm:text-lg">Choose a Style</DialogTitle>
        </DialogHeader>

        {/* Mobile Compact Grid */}
        <ScrollArea className="sm:hidden h-[70vh] -mx-4 px-4 overscroll-contain">
          <div className="grid grid-cols-2 gap-2 p-1 pb-4">
            {STYLES.map((styleOption) => (
              <button
                key={styleOption.value}
                onClick={() => {
                  setStyle(styleOption.value);
                  setStyleDialogOpen(false);
                }}
                className={cn(
                  "group relative flex flex-col gap-1.5 p-2 rounded-lg border-2 transition-all bg-card text-left",
                  style === styleOption.value 
                    ? "border-primary ring-2 ring-primary/20" 
                    : "border-muted hover:border-primary/50"
                )}
              >
                <div className="w-full aspect-[4/3] rounded overflow-hidden">
                  <img src={styleOption.image} alt={styleOption.label} className="w-full h-full object-cover" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold truncate">{styleOption.emoji} {styleOption.label}</p>
                  <p className="text-[10px] text-muted-foreground line-clamp-1">{styleOption.description}</p>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>

              {/* Desktop Card Grid */}
              <div className="hidden sm:grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[calc(90vh-140px)] overflow-y-auto px-2 py-1">
                {STYLES.map((styleOption) => (
                  <div
                    key={styleOption.value}
                    className={cn(
                      "relative cursor-pointer rounded-lg overflow-hidden transition-all border-2 max-w-md mx-auto md:max-w-none w-full",
                      style === styleOption.value
                        ? "border-primary ring-4 ring-primary/20"
                        : "border-muted hover:border-primary/50"
                    )}
                    onClick={() => {
                      setStyle(styleOption.value);
                      setStyleDialogOpen(false);
                    }}
                  >
                    <div className="relative aspect-[16/10] sm:aspect-video md:aspect-[21/9] overflow-hidden bg-muted min-h-[180px] sm:min-h-0">
                      <img
                        src={styleOption.image}
                        alt={styleOption.label}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      
                      {/* Overlay Gradient */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      
                      {/* Selected Checkmark */}
                      {style === styleOption.value && (
                        <div className="absolute top-2 right-2 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary flex items-center justify-center shadow-lg">
                          <svg className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                      
                      {/* Style Info */}
                      <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4">
                        <p className="text-white font-bold text-sm sm:text-base leading-tight">
                          {styleOption.emoji} {styleOption.label}
                        </p>
                        <p className="text-white/80 text-xs sm:text-sm mt-0.5 leading-relaxed">
                          {styleOption.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Voice selection moved to editor before rendering */}

        {/* Tone */}
        <div className="space-y-2">
          <Label htmlFor="tone" className="text-sm font-medium">Tone & Style</Label>
          <Select value={tone} onValueChange={setTone} disabled={isGenerating}>
            <SelectTrigger id="tone">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TONES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Media Type Selection */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Media Type</Label>
          <div className="grid grid-cols-3 gap-2">
            {MEDIA_TYPES.map((type) => {
              const Icon = type.icon;
              return (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setMediaType(type.value)}
                  disabled={isGenerating}
                  className={cn(
                    "flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all",
                    mediaType === type.value
                      ? "border-primary bg-primary/10"
                      : "border-muted hover:border-primary/50"
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <div className="text-center">
                    <p className="text-xs font-medium">{type.label}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{type.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Background Music - Temporarily Hidden */}
        {/* <div className="space-y-2">
          <Label className="text-sm font-medium">Background Music</Label>
          <BackgroundMusicSelector
            selectedMusicUrl={backgroundMusicUrl}
            selectedMusicVolume={backgroundMusicVolume}
            onSelectMusic={(url, volume) => {
              setBackgroundMusicUrl(url);
              setBackgroundMusicVolume(volume);
            }}
          />
        </div> */}

        {/* Advanced Settings - Temporarily Disabled */}
        {/* All advanced settings (Video Quality, Subtitles, Audio, Image Animation) are now configured in the Editor before rendering */}

        {/* Token Cost Display */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-sm">
              <Coins className="w-4 h-4 text-primary" />
              <span>Estimated: <span className="font-bold">{estimatedCost.toFixed(2)}</span> credits</span>
            </div>
            <p className="text-xs text-muted-foreground ml-6">
              Based on {duration}s duration. Final cost may vary based on script length.
            </p>
          </div>
          <span className="text-sm">
            Balance: <span className="font-bold">{Number(tokenData?.tokens_remaining || 0).toFixed(2)}</span>
          </span>
        </div>

        {/* Generate Button */}
        <Button
          onClick={handleGenerate}
          disabled={!canGenerate || isGenerating}
          className="w-full"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              Generate Storyboard
              <Film className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>

        {/* Generation Status */}
        {isGenerating && (
          <p className="text-sm text-center text-muted-foreground">
            ✨ AI is crafting your video script...
          </p>
        )}
      </CardContent>
      
      {/* Reset Confirmation Dialog */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Storyboard?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete your current storyboard and all scenes, and reset the form to defaults. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                performReset(true);
                setShowResetDialog(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Reset & Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
