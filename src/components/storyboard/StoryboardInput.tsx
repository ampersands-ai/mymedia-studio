import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useStoryboard } from '@/hooks/useStoryboard';
import { useUserTokens } from '@/hooks/useUserTokens';
import { useStoryboardForm } from '@/hooks/storyboard/useStoryboardForm';
import { Film, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { TopicSection } from './sections/TopicSection';
import { DurationSection } from './sections/DurationSection';
import { ResolutionSelector } from './sections/ResolutionSelector';
import { StyleSelector } from './sections/StyleSelector';
import { ToneSelector } from './sections/ToneSelector';
import { MediaTypeSelector } from './sections/MediaTypeSelector';
import { CostDisplay } from './sections/CostDisplay';

export function StoryboardInput() {
  const { formState, updateField, estimatedRenderCost, canGenerate } = useStoryboardForm();
  const { generateStoryboard, isGenerating } = useStoryboard();
  const { data: tokenData } = useUserTokens();

  const handleGenerate = async () => {
    if (!canGenerate) {
      if (formState.topic.length < 5) {
        toast.error('Topic must be at least 5 characters', { id: 'topic-error' });
      } else if (formState.topic.length > 500) {
        toast.error('Topic must be less than 500 characters', { id: 'topic-error' });
      }
      return;
    }

    await generateStoryboard({
      topic: formState.topic,
      duration: formState.duration,
      style: formState.style,
      tone: formState.tone,
      voiceID: formState.voiceID,
      voiceName: formState.voiceName,
      mediaType: formState.mediaType,
      backgroundMusicUrl: formState.backgroundMusicUrl,
      backgroundMusicVolume: formState.backgroundMusicVolume,
      aspectRatio: formState.aspectRatio,
      videoQuality: formState.videoQuality,
      customWidth: formState.aspectRatio === 'custom' ? formState.customWidth : undefined,
      customHeight: formState.aspectRatio === 'custom' ? formState.customHeight : undefined,
      subtitleSettings: {
        language: formState.subtitleLanguage,
        model: formState.subtitleModel,
        style: formState.subtitleStyle,
        fontFamily: formState.subtitleFontFamily,
        fontSize: formState.subtitleFontSize,
        allCaps: formState.subtitleAllCaps,
        boxColor: formState.subtitleBoxColor,
        lineColor: formState.subtitleLineColor,
        wordColor: formState.subtitleWordColor,
        position: formState.subtitlePosition,
        outlineColor: formState.subtitleOutlineColor,
        outlineWidth: formState.subtitleOutlineWidth,
        shadowColor: formState.subtitleShadowColor,
        shadowOffset: formState.subtitleShadowOffset,
        maxWordsPerLine: formState.subtitleMaxWordsPerLine,
      },
      musicSettings: {
        volume: formState.musicVolume,
        fadeIn: formState.musicFadeIn,
        fadeOut: formState.musicFadeOut,
        duration: -2,
      },
      imageAnimationSettings: {
        zoom: formState.imageZoom,
        position: formState.imagePosition,
      },
      enableCache: formState.enableCache,
      draftMode: formState.draftMode,
    });
  };

  return (
    <Card className="relative overflow-hidden bg-card border-2">
      <CardHeader className="space-y-2">
        <CardTitle className="text-xl font-black flex items-center gap-2">
          <Film className="w-5 h-5" />
          CREATE STORYBOARD
        </CardTitle>
        <CardDescription className="text-sm">
          Generate AI-powered video scripts with full editing control. Credits are charged when you render the video.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <TopicSection
          topic={formState.topic}
          onTopicChange={(topic) => updateField('topic', topic)}
          disabled={isGenerating}
        />

        <DurationSection
          duration={formState.duration}
          onDurationChange={(duration) => updateField('duration', duration)}
          disabled={isGenerating}
        />

        <ResolutionSelector
          aspectRatio={formState.aspectRatio}
          onAspectRatioChange={(ratio) => updateField('aspectRatio', ratio)}
          disabled={isGenerating}
        />

        <StyleSelector
          style={formState.style}
          onStyleChange={(style) => updateField('style', style)}
          disabled={isGenerating}
        />

        <ToneSelector
          tone={formState.tone}
          onToneChange={(tone) => updateField('tone', tone)}
          disabled={isGenerating}
        />

        <MediaTypeSelector
          mediaType={formState.mediaType}
          onMediaTypeChange={(type) => updateField('mediaType', type)}
          disabled={isGenerating}
        />

        <CostDisplay
          duration={formState.duration}
          estimatedCost={estimatedRenderCost}
          tokensRemaining={Number(tokenData?.tokens_remaining || 0)}
        />

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

        {isGenerating && (
          <p className="text-sm text-center text-muted-foreground">
            ✨ AI is crafting your video script...
          </p>
        )}
      </CardContent>
    </Card>
  );
}
