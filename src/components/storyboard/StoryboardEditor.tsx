import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { SceneCard } from './SceneCard';
import { ScenePreviewGenerator } from './ScenePreviewGenerator';
import { GeneratingOutputConsole } from './GeneratingOutputConsole';
import { SubtitleCustomizer } from './SubtitleCustomizer';
import { useStoryboard } from '@/hooks/useStoryboard';
import type { SubtitleSettings } from '@/types/subtitle';
import { Play, ArrowLeft, Coins, Loader2, AlertCircle, RefreshCw, X, ChevronDown, Volume2, Settings } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { VoiceSelector } from '@/components/generation/VoiceSelector';
import { useNavigate } from 'react-router-dom';
import { useUserTokens } from '@/hooks/useUserTokens';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useVideoUrl } from '@/hooks/media/useVideoUrl';
import { cn } from '@/lib/utils';

export const StoryboardEditor = () => {
  const navigate = useNavigate();
  const {
    storyboard,
    scenes,
    activeSceneId,
    isRendering,
    renderProgress,
    renderingStartTime,
    updateScene,
    updateIntroScene,
    regenerateScene,
    setActiveScene,
    navigateScene,
    renderVideo,
    cancelRender,
    isCancelingRender,
    clearStoryboard,
    refreshStatus,
    updateSceneImage,
    updateRenderSettings,
  } = useStoryboard();
  const { data: tokenData } = useUserTokens();
  
  // Get video URL from Supabase Storage
  const { url: videoSignedUrl, isLoading: isLoadingVideo } = useVideoUrl(
    storyboard?.status === 'complete' ? storyboard.video_storage_path : null,
    { strategy: 'public-direct', bucket: 'generated-content' }
  );
  const [renderStatusMessage, setRenderStatusMessage] = useState('');
  const [introVoiceOverText, setIntroVoiceOverText] = useState(storyboard?.intro_voiceover_text || '');
  const [introImagePrompt, setIntroImagePrompt] = useState(storyboard?.intro_image_prompt || '');
  const [showScenes, setShowScenes] = useState(storyboard?.status !== 'complete');
  const [showSubtitleCustomizer, setShowSubtitleCustomizer] = useState(false);

  // Sync intro fields with storyboard
  useEffect(() => {
    if (storyboard) {
      setIntroVoiceOverText(storyboard.intro_voiceover_text || '');
      setIntroImagePrompt(storyboard.intro_image_prompt || '');
    }
  }, [storyboard?.intro_voiceover_text, storyboard?.intro_image_prompt]);

  // Debounced save for intro fields
  useEffect(() => {
    const timer = setTimeout(() => {
      if (storyboard && introVoiceOverText !== storyboard.intro_voiceover_text) {
        updateIntroScene('intro_voiceover_text', introVoiceOverText);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [introVoiceOverText, storyboard?.intro_voiceover_text, updateIntroScene]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (storyboard && introImagePrompt !== storyboard.intro_image_prompt) {
        updateIntroScene('intro_image_prompt', introImagePrompt);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [introImagePrompt, storyboard?.intro_image_prompt, updateIntroScene]);

  const activeScene = scenes.find(s => s.id === activeSceneId) || scenes[0];
  const estimatedDuration = storyboard ? storyboard.duration : 0;
  // Sanitize wildly incorrect estimates (e.g., legacy 800 credits)
  const rawEstimate = storyboard?.estimated_render_cost ?? 0;
  const expectedEstimate = (storyboard?.duration || 0) * 0.25; // 0.25 credits/sec
  const initialEstimate = (!Number.isFinite(rawEstimate) || rawEstimate <= 0 || rawEstimate > Math.max(100, expectedEstimate * 10))
    ? expectedEstimate
    : rawEstimate;
  
  // Calculate actual render cost based on script character changes
  const calculateRenderCost = useCallback(() => {
    if (!storyboard) return 0;
    
    const countChars = (text: string) => text?.trim().length || 0;
    
    // Calculate current total character count
    const introChars = countChars(storyboard.intro_voiceover_text || '');
    const sceneChars = scenes.reduce((sum, scene) => sum + countChars(scene.voice_over_text || ''), 0);
    const currentTotalChars = introChars + sceneChars;
    
    // Get original character count (stored at creation)
    const originalChars = (storyboard as any).original_character_count || currentTotalChars;
    
    // Calculate character difference
    const charDifference = currentTotalChars - originalChars;
    
    // Start with initial estimate
    let cost = initialEstimate;
    
    // If script increased by 100+ characters, add 0.25 credits per 100 chars
    if (charDifference >= 100) {
      const additionalChunks = Math.floor(charDifference / 100);
      cost += additionalChunks * 0.25;
    }
    // If script decreased by 100+ characters, reduce cost proportionally
    else if (charDifference <= -100) {
      const reducedChunks = Math.floor(Math.abs(charDifference) / 100);
      cost -= reducedChunks * 0.25;
      cost = Math.max(0, cost); // Never go below 0
    }
    
    return cost;
  }, [storyboard, scenes, initialEstimate]);
  
  const actualRenderCost = calculateRenderCost();
  const costDifference = actualRenderCost - initialEstimate;
  
  // Display price: show initial estimate if actual is same/higher, show actual if lower
  const displayPrice = actualRenderCost >= initialEstimate ? initialEstimate : actualRenderCost;
  const showSavings = actualRenderCost < initialEstimate;

  // Phase 5: Dynamic status messages based on rendering time
  useEffect(() => {
    if (!isRendering || !renderingStartTime) {
      setRenderStatusMessage('');
      return;
    }

    const interval = setInterval(() => {
      const elapsedSeconds = Math.floor((Date.now() - renderingStartTime) / 1000);
      
      if (elapsedSeconds < 120) {
        setRenderStatusMessage(`Rendering started... (typically 1-2 minutes)`);
      } else if (elapsedSeconds < 300) {
        setRenderStatusMessage(`Taking longer than usual... still checking status`);
      } else {
        setRenderStatusMessage(`This is taking much longer than expected. Auto-recovery will attempt shortly.`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isRendering, renderingStartTime]);

  // Auto-collapse scenes when rendering starts
  useEffect(() => {
    if (isRendering) {
      setShowScenes(false);
    }
  }, [isRendering]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        navigateScene('prev');
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        navigateScene('next');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigateScene]);

  const handleRender = async () => {
    // Validate all scenes
    const incompleteScene = scenes.find(
      s => !s.voice_over_text || !s.image_prompt
    );
    if (incompleteScene) {
      toast.error('Please complete all scenes before rendering');
      return;
    }

    // Check if script increased and user needs to pay additional credits
    if (actualRenderCost > initialEstimate) {
      const additionalCharge = actualRenderCost - initialEstimate;
      if ((tokenData?.tokens_remaining || 0) < additionalCharge) {
        toast.error(`Insufficient credits. Need ${additionalCharge.toFixed(2)} more credits for script changes.`);
        return;
      }
    }

    await renderVideo();
  };

  const handleBack = () => {
    clearStoryboard();
  };

  const handleImageGenerated = useCallback((sceneId: string, imageUrl: string) => {
    if (!storyboard) return;

    // Check if it's the intro scene (using storyboard ID)
    if (sceneId === storyboard.id) {
      // Only update if value actually changed
      if (storyboard.intro_image_preview_url !== imageUrl) {
        updateIntroScene('intro_image_preview_url', imageUrl);
      }
    } else {
      // Find the scene
      const scene = scenes.find(s => s.id === sceneId);
      // Only update if value actually changed
      if (scene && scene.image_preview_url !== imageUrl) {
        updateSceneImage({ sceneId, imageUrl });
      }
    }
  }, [storyboard, scenes, updateIntroScene, updateSceneImage]);

  if (!storyboard || scenes.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Phase 5: Rendering Status Alert */}
      {isRendering && renderStatusMessage && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{renderStatusMessage}</span>
            <div className="flex gap-2 ml-4">
              <Button
                variant="outline"
                size="sm"
                onClick={refreshStatus}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Check Status
              </Button>
              
              {/* Cancel Render Button */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={isCancelingRender}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel Render
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancel Video Rendering?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure? Your tokens will NOT be refunded as the job has already started.
                      
                      <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-md">
                        <p className="text-sm text-amber-600 dark:text-amber-400">
                          ⚠️ The video may still complete on the server, but it won't be saved to your account.
                        </p>
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep Rendering</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={cancelRender}
                      className="bg-destructive hover:bg-destructive/90"
                    >
                      Cancel Anyway
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Show Refresh button for stuck videos */}
      {storyboard?.status === 'rendering' && !isRendering && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>Video rendering was interrupted. Click to check if it completed.</span>
            <Button
              variant="outline"
              size="sm"
              onClick={refreshStatus}
              className="ml-4"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Check Status
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {scenes.length} scenes • ~{estimatedDuration}s video
        </div>
      </div>

      {/* Main Content - Scene Cards (Collapsible) */}
      <Collapsible open={showScenes} onOpenChange={setShowScenes}>
        {/* Toggle button - only show when there's an active render or completed video */}
        {(isRendering || storyboard?.status === 'complete') && (
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full mb-4">
              {showScenes ? 'Hide Scenes' : 'Show Scenes'}
              <ChevronDown className={cn(
                "ml-2 h-4 w-4 transition-transform",
                showScenes && "rotate-180"
              )} />
            </Button>
          </CollapsibleTrigger>
        )}
        
        <CollapsibleContent forceMount className={cn(!showScenes && "hidden")}>
          <div className="space-y-4">
            <h3 className="text-lg font-bold">📋 Scenes</h3>
            
            {/* Title/Intro Scene (Scene 1) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
              <Card className="relative p-4 bg-primary/5 backdrop-blur-xl border-2 border-primary/30 lg:col-span-2 h-full">
                <div className="flex items-center justify-between mb-4">
                  <div className="px-2 py-1 rounded-md bg-primary/30 text-primary text-xs font-bold">
                    Scene 1 - Title
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <Label className="text-xs font-semibold text-muted-foreground">🎤 Voiceover</Label>
                  <Textarea
                    value={introVoiceOverText}
                    onChange={(e) => setIntroVoiceOverText(e.target.value)}
                    className="min-h-[80px] text-sm bg-background/50"
                    maxLength={1000}
                    placeholder="Title voiceover text..."
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground">🖼️ Image Prompt</Label>
                  <Textarea
                    value={introImagePrompt}
                    onChange={(e) => setIntroImagePrompt(e.target.value)}
                    className="min-h-[160px] sm:min-h-[200px] text-sm bg-background/50 resize-y"
                    maxLength={2000}
                    placeholder="Title scene visual description..."
                  />
                </div>
              </Card>
              <div className="lg:col-span-1 h-full">
                <ScenePreviewGenerator
                  scene={{
                    id: storyboard.id,
                    image_prompt: introImagePrompt,
                    image_preview_url: storyboard.intro_image_preview_url,
                  }}
                  sceneNumber={1}
                  onImageGenerated={handleImageGenerated}
                />
              </div>
            </div>

            {scenes.map((scene, idx) => (
              <div key={scene.id} className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
                <div className="lg:col-span-2 h-full">
                  <SceneCard
                    scene={scene}
                    sceneNumber={idx + 2}
                    isActive={activeSceneId === scene.id}
                    onUpdate={updateScene}
                    onRegenerate={regenerateScene}
                    onClick={() => setActiveScene(scene.id)}
                  />
                </div>
                <div className="lg:col-span-1 h-full">
                  <ScenePreviewGenerator
                    scene={scene}
                    sceneNumber={idx + 2}
                    onImageGenerated={handleImageGenerated}
                  />
                </div>
              </div>
            ))}

          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Voice & Advanced Settings - Editable Before Rendering */}
      {!isRendering && (
        <Card className="p-6 space-y-6">
          <Collapsible defaultOpen>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between -ml-4" type="button">
                <span className="text-lg font-bold">🎙️ Voice & Advanced Settings</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-6 pt-4">
              <p className="text-sm text-muted-foreground">
                Customize your video settings before rendering. Changes are saved automatically.
              </p>
              
              {/* Voice Selection - Editable */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Voiceover Voice</Label>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full justify-start" type="button">
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
                        updateRenderSettings?.({ voice_id: voiceId, voice_name: voiceName });
                      }}
                      showAzureVoices={true}
                      showElevenLabs={false}
                    />
                  </DialogContent>
                </Dialog>
              </div>

              {/* Video Quality */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Video Quality</Label>
                <Select 
                  value={storyboard?.video_quality || 'high'}
                  onValueChange={(value) => {
                    updateRenderSettings?.({ video_quality: value });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Subtitle Settings */}
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
                        value={storyboard?.subtitle_settings?.fontFamily || 'Oswald Bold'}
                        onValueChange={(value) => {
                          updateRenderSettings?.({
                            subtitle_settings: {
                              ...storyboard?.subtitle_settings,
                              fontFamily: value,
                            },
                          });
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-background z-50">
                          <SelectItem value="Oswald Bold">Oswald Bold</SelectItem>
                          <SelectItem value="Montserrat Bold">Montserrat Bold</SelectItem>
                          <SelectItem value="Inter Bold">Inter Bold</SelectItem>
                          <SelectItem value="Arial">Arial</SelectItem>
                          <SelectItem value="Impact">Impact</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-xs">Size: {storyboard?.subtitle_settings?.fontSize || 140}px</Label>
                      <Slider
                        value={[storyboard?.subtitle_settings?.fontSize || 140]}
                        onValueChange={([value]) => {
                          updateRenderSettings?.({
                            subtitle_settings: {
                              ...storyboard?.subtitle_settings,
                              fontSize: value,
                            },
                          });
                        }}
                        min={80}
                        max={200}
                        step={10}
                        className="w-full"
                      />
                    </div>
                  </div>

                  {/* Advanced Customizer Button */}
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="w-full"
                    onClick={() => setShowSubtitleCustomizer(true)}
                    type="button"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Advanced Subtitle Customizer
                  </Button>
                </CollapsibleContent>
              </Collapsible>

              {/* Audio Settings */}
              <Collapsible className="space-y-3">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-between -ml-4" type="button">
                    <span className="text-sm font-medium">🎵 Audio Settings</span>
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 pl-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Music Volume: {Math.round((storyboard?.music_settings?.volume || 0.05) * 100)}%</Label>
                    <Slider
                      value={[(storyboard?.music_settings?.volume || 0.05) * 100]}
                      onValueChange={([value]) => {
                        updateRenderSettings?.({
                          music_settings: {
                            ...storyboard?.music_settings,
                            volume: value / 100,
                          },
                        });
                      }}
                      min={0}
                      max={100}
                      step={5}
                      className="w-full"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs">Fade In: {storyboard?.music_settings?.fadeIn || 2}s</Label>
                      <Slider
                        value={[storyboard?.music_settings?.fadeIn || 2]}
                        onValueChange={([value]) => {
                          updateRenderSettings?.({
                            music_settings: {
                              ...storyboard?.music_settings,
                              fadeIn: value,
                            },
                          });
                        }}
                        min={0}
                        max={10}
                        step={1}
                        className="w-full"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-xs">Fade Out: {storyboard?.music_settings?.fadeOut || 2}s</Label>
                      <Slider
                        value={[storyboard?.music_settings?.fadeOut || 2]}
                        onValueChange={([value]) => {
                          updateRenderSettings?.({
                            music_settings: {
                              ...storyboard?.music_settings,
                              fadeOut: value,
                            },
                          });
                        }}
                        min={0}
                        max={10}
                        step={1}
                        className="w-full"
                      />
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Image Animation */}
              <Collapsible className="space-y-3">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-between -ml-4" type="button">
                    <span className="text-sm font-medium">🎬 Image Animation</span>
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 pl-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Zoom Level: {(storyboard?.image_animation_settings?.zoom || 2).toFixed(1)}x</Label>
                    <Slider
                      value={[storyboard?.image_animation_settings?.zoom || 2]}
                      onValueChange={([value]) => {
                        updateRenderSettings?.({
                          image_animation_settings: {
                            ...storyboard?.image_animation_settings,
                            zoom: value,
                          },
                        });
                      }}
                      min={1}
                      max={5}
                      step={0.1}
                      className="w-full"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-xs">Position</Label>
                    <Select 
                      value={storyboard?.image_animation_settings?.position || 'center-center'}
                      onValueChange={(value) => {
                        updateRenderSettings?.({
                          image_animation_settings: {
                            ...storyboard?.image_animation_settings,
                            position: value,
                          },
                        });
                      }}
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

              <p className="text-xs text-muted-foreground pt-2 border-t">
                💡 Settings are saved automatically as you make changes
              </p>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      )}

      {/* Render Video Button - After settings */}
      {!isRendering && (
        <Card className="p-6 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-sm">
              <Coins className="w-5 h-5 text-primary" />
              <span className="text-muted-foreground">
                Balance: <span className="font-semibold text-foreground">{Number(tokenData?.tokens_remaining || 0).toFixed(2)}</span>
              </span>
            </div>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="lg"
                  disabled={isRendering || (actualRenderCost > initialEstimate && (tokenData?.tokens_remaining || 0) < (actualRenderCost - initialEstimate))}
                  className="bg-gradient-to-r from-primary via-primary to-primary/80 hover:scale-105 transition-transform font-bold w-full sm:w-auto"
                >
                  <Play className="w-5 h-5 mr-2" />
                  Render Video ({displayPrice.toFixed(2)} credits)
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Render Video?</AlertDialogTitle>
                  <AlertDialogDescription className="space-y-2">
                    <p>
                      This will create your final video with {scenes.length} scenes.
                    </p>
                    <div className="space-y-2">
                      {showSavings ? (
                        <>
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Originally charged:</span>
                            <span className="line-through text-muted-foreground">{initialEstimate.toFixed(2)} credits</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="font-semibold">Final price:</span>
                            <span className="font-bold text-green-600">{actualRenderCost.toFixed(2)} credits</span>
                          </div>
                          <p className="text-xs text-green-600">
                            {Math.abs(costDifference).toFixed(2)} credits refund - script shortened!
                          </p>
                        </>
                      ) : actualRenderCost > initialEstimate ? (
                        <>
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Originally charged:</span>
                            <span>{initialEstimate.toFixed(2)} credits</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Script increase charge:</span>
                            <span className="text-amber-600">+{costDifference.toFixed(2)} credits</span>
                          </div>
                          <div className="flex justify-between items-center pt-2 border-t">
                            <span className="font-semibold">Total price:</span>
                            <span className="font-bold">{actualRenderCost.toFixed(2)} credits</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Script expanded by {Math.floor(Math.abs(costDifference / 0.25) * 100)}+ characters
                          </p>
                        </>
                      ) : (
                        <>
                          <div className="flex justify-between items-center">
                            <span className="font-semibold">Final price:</span>
                            <span className="font-bold">{displayPrice.toFixed(2)} credits</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Same as original - already charged.
                          </p>
                        </>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground pt-2 border-t">
                      {actualRenderCost > initialEstimate && costDifference > (tokenData?.tokens_remaining || 0) 
                        ? `Insufficient balance. Need ${costDifference.toFixed(2)} more credits.`
                        : `Current balance: ${Number(tokenData?.tokens_remaining || 0).toFixed(2)} credits`} • Est. time: ~60s
                    </p>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleRender}>
                    Render Video
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </Card>
      )}

      {/* Generating Output Console - shows when rendering and scenes are collapsed */}
      {isRendering && !showScenes && (
        <GeneratingOutputConsole
          progress={renderProgress}
          statusMessage={renderStatusMessage}
          elapsedTime={renderingStartTime ? Date.now() - renderingStartTime : 0}
          onCheckStatus={refreshStatus}
          onCancelRender={cancelRender}
          isCanceling={isCancelingRender}
        />
      )}

      {/* Final Video (appears below scenes after rendering) */}
      {storyboard?.status === 'complete' && storyboard?.video_url && (
        <div className="space-y-2">
          <h3 className="text-lg font-bold">🎬 Final Video</h3>
          <div className="rounded-lg overflow-hidden border border-primary/20 bg-black">
            {isLoadingVideo ? (
              <div className="w-full aspect-video flex items-center justify-center bg-muted">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <video
                controls
                className="w-full aspect-video"
                src={videoSignedUrl}
                preload="metadata"
                crossOrigin="anonymous"
              >
                Your browser does not support the video tag.
              </video>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => window.open(videoSignedUrl, '_blank')}
            >
              Open in New Tab
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={async () => {
                try {
                  if (!videoSignedUrl) {
                    toast.error('Video URL not available');
                    return;
                  }

                  toast.loading('Downloading video...', { id: 'download-video' });
                  
                  const response = await fetch(videoSignedUrl);
                  if (!response.ok) throw new Error('Download failed');
                  
                  const blob = await response.blob();
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `storyboard-${storyboard.id}.mp4`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  window.URL.revokeObjectURL(url);
                  
                  toast.success('Video downloaded!', { id: 'download-video' });
                } catch (error) {
                  console.error('[StoryboardEditor] Download error:', error);
                  toast.error('Failed to download video. Try "Open in New Tab" and save from there.', { 
                    id: 'download-video' 
                  });
                }
              }}
            >
              Download
            </Button>
          </div>
        </div>
      )}

      {/* Subtitle Customizer Dialog */}
      <SubtitleCustomizer
        open={showSubtitleCustomizer}
        onOpenChange={setShowSubtitleCustomizer}
        initialSettings={storyboard?.subtitle_settings as Partial<SubtitleSettings>}
        onSave={(settings) => {
          updateRenderSettings?.({ subtitle_settings: settings });
          setShowSubtitleCustomizer(false);
          toast.success('Subtitle settings saved');
        }}
      />

    </div>
  );
};