import { useState, useEffect } from 'react';
import { MinimalSidebar } from '@/components/MinimalSidebar';
import { GlassCard } from '@/components/glass/GlassCard';
import { GlassButton } from '@/components/glass/GlassButton';
import { GlassTextarea } from '@/components/glass/GlassTextarea';
import { GlassSelect } from '@/components/glass/GlassSelect';
import { GlassInput } from '@/components/glass/GlassInput';
import { useStoryboard } from '@/hooks/useStoryboard';
import { useAzureVoices } from '@/hooks/useAzureVoices';
import { toast } from 'sonner';
import { 
  Film, 
  Sparkles, 
  ChevronDown, 
  Wand2, 
  Play,
  Download,
  RotateCcw,
  Settings,
  Music,
  Image as ImageIcon,
  Video as VideoIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Slider } from '@/components/ui/slider';
import { OptimizedGenerationPreview } from '@/components/generation/OptimizedGenerationPreview';
import { supabase } from '@/integrations/supabase/client';

export default function StoryboardMinimal() {
  const { 
    storyboard, 
    scenes,
    isLoading,
    generateStoryboard,
    isGenerating,
    updateScene,
    updateIntroScene,
    updateSceneImage,
    renderVideo,
    isRendering,
    renderProgress,
    cancelRender,
    clearStoryboard
  } = useStoryboard();

  const { data: voices } = useAzureVoices();

  // Form state
  const [topic, setTopic] = useState('');
  const [duration, setDuration] = useState(60);
  const [style, setStyle] = useState('Cinematic');
  const [tone, setTone] = useState('Professional');
  const [voiceId, setVoiceId] = useState('');
  const [voiceName, setVoiceName] = useState('');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [scenesOpen, setScenesOpen] = useState(true);

  // Auto-select first voice
  useEffect(() => {
    if (voices && voices.length > 0 && !voiceId) {
      setVoiceId(voices[0].voice_id);
      setVoiceName(voices[0].voice_name);
    }
  }, [voices, voiceId]);

  const handleGenerateStoryboard = async () => {
    if (!topic.trim()) {
      toast.error('Please enter a video topic');
      return;
    }

    if (!voiceId) {
      toast.error('Please select a voice');
      return;
    }

    try {
      await generateStoryboard({
        topic: topic.trim(),
        duration,
        style,
        tone,
        voiceID: voiceId,
        voiceName,
        mediaType: 'image',
      });
      toast.success('Storyboard generated!');
      setScenesOpen(true);
    } catch (error: any) {
      console.error('Generate error:', error);
    }
  };

  const handleRenderVideo = async () => {
    try {
      await renderVideo();
      toast.success('Video rendering started!');
    } catch (error: any) {
      console.error('Render error:', error);
    }
  };

  const handleReset = async () => {
    if (storyboard?.id) {
      try {
        await supabase.functions.invoke('delete-storyboard', {
          body: { storyboardId: storyboard.id }
        });
        clearStoryboard();
        setTopic('');
        setDuration(60);
        toast.success('Storyboard reset!');
      } catch (error) {
        toast.error('Failed to reset storyboard');
      }
    }
  };

  const handleSurpriseMe = () => {
    const topics = [
      'The fascinating world of deep sea creatures',
      'How artificial intelligence is changing healthcare',
      'Ancient civilizations we still don\'t understand',
      'The future of space exploration',
      'Mysterious natural phenomena explained',
    ];
    setTopic(topics[Math.floor(Math.random() * topics.length)]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      <MinimalSidebar />
      
      <div className="ml-20 min-h-screen p-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Film className="w-8 h-8 text-white/70" />
              <h1 className="text-5xl font-light text-gray-200">AI Storyboard Studio</h1>
            </div>
            <p className="text-gray-400 font-light">Create professional faceless videos with full creative control</p>
          </div>
          {storyboard && (
            <GlassButton variant="ghost" size="sm" onClick={handleReset}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </GlassButton>
          )}
        </div>

        <div className="max-w-5xl mx-auto space-y-6">
          {/* Input Form */}
          <GlassCard>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-light text-gray-200">Video Configuration</h2>
                {storyboard && (
                  <span className="text-sm text-gray-400">ID: {storyboard.id.slice(0, 8)}</span>
                )}
              </div>

              {/* Topic */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-light text-gray-400">Video Topic</label>
                  <GlassButton variant="ghost" size="sm" onClick={handleSurpriseMe}>
                    <Wand2 className="w-3 h-3 mr-2" />
                    Surprise Me
                  </GlassButton>
                </div>
                <GlassTextarea
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Describe your video topic..."
                  rows={3}
                />
              </div>

              {/* Duration */}
              <div className="space-y-2">
                <label className="text-sm font-light text-gray-400">
                  Duration: {duration} seconds
                </label>
                <Slider
                  value={[duration]}
                  onValueChange={(value) => setDuration(value[0])}
                  min={30}
                  max={180}
                  step={10}
                  className="w-full"
                />
              </div>

              {/* Style and Tone */}
              <div className="grid grid-cols-2 gap-4">
                <GlassSelect
                  label="Style"
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                >
                  <option value="Cinematic">Cinematic</option>
                  <option value="Documentary">Documentary</option>
                  <option value="Educational">Educational</option>
                  <option value="Entertaining">Entertaining</option>
                </GlassSelect>

                <GlassSelect
                  label="Tone"
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                >
                  <option value="Professional">Professional</option>
                  <option value="Casual">Casual</option>
                  <option value="Dramatic">Dramatic</option>
                  <option value="Humorous">Humorous</option>
                </GlassSelect>
              </div>

              {/* Voice Selector */}
              <GlassSelect
                label="Voice"
                value={voiceId}
                onChange={(e) => {
                  const selectedVoice = voices?.find(v => v.voice_id === e.target.value);
                  setVoiceId(e.target.value);
                  setVoiceName(selectedVoice?.voice_name || '');
                }}
              >
                <option value="">Select voice...</option>
                {voices?.map((voice) => (
                  <option key={voice.voice_id} value={voice.voice_id}>
                    {voice.voice_name} ({voice.language}, {voice.country})
                  </option>
                ))}
              </GlassSelect>

              {/* Advanced Settings */}
              <GlassCard>
                <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-center justify-between text-gray-300 hover:text-white transition-colors">
                      <div className="flex items-center gap-2">
                        <Settings className="w-5 h-5" />
                        <span className="font-light">Advanced Settings</span>
                      </div>
                      <ChevronDown className={cn(
                        "w-5 h-5 transition-transform",
                        advancedOpen && "transform rotate-180"
                      )} />
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-4">
                    <p className="text-sm text-gray-400 font-light">
                      Advanced settings coming soon...
                    </p>
                  </CollapsibleContent>
                </Collapsible>
              </GlassCard>

              {/* Generate Button */}
              <GlassButton
                variant="primary"
                size="lg"
                className="w-full"
                onClick={handleGenerateStoryboard}
                loading={isGenerating}
                disabled={!topic.trim() || !voiceId}
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Generate Storyboard
              </GlassButton>
            </div>
          </GlassCard>

          {/* Scenes Grid */}
          {scenes && scenes.length > 0 && (
            <GlassCard>
              <Collapsible open={scenesOpen} onOpenChange={setScenesOpen}>
                <CollapsibleTrigger className="w-full mb-4">
                  <div className="flex items-center justify-between text-gray-200 hover:text-white transition-colors">
                    <h2 className="text-2xl font-light">Scenes ({scenes.length})</h2>
                    <ChevronDown className={cn(
                      "w-5 h-5 transition-transform",
                      scenesOpen && "transform rotate-180"
                    )} />
                  </div>
                </CollapsibleTrigger>
                
                <CollapsibleContent className="space-y-4">
                  {/* Intro Scene */}
                  {storyboard && (
                    <GlassCard hover className="p-4">
                      <div className="flex items-start gap-2 mb-3">
                        <div className="px-3 py-1 rounded-full backdrop-blur-xl bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-medium">
                          INTRO
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <GlassTextarea
                            label="Voiceover"
                            value={storyboard.intro_voiceover_text}
                            onChange={(e) => updateIntroScene('intro_voiceover_text', e.target.value)}
                            rows={4}
                          />
                          <GlassTextarea
                            label="Image Prompt"
                            value={storyboard.intro_image_prompt}
                            onChange={(e) => updateIntroScene('intro_image_prompt', e.target.value)}
                            rows={4}
                          />
                        </div>
                        
                        <div className="flex items-center justify-center">
                          {storyboard.intro_image_preview_url ? (
                            <OptimizedGenerationPreview
                              storagePath={storyboard.intro_image_preview_url}
                              contentType="image"
                            />
                          ) : (
                            <div className="w-full aspect-video rounded-xl backdrop-blur-xl bg-white/5 border border-white/10 flex items-center justify-center">
                              <ImageIcon className="w-12 h-12 text-white/30" />
                            </div>
                          )}
                        </div>
                      </div>
                    </GlassCard>
                  )}

                  {/* Regular Scenes */}
                  {scenes.map((scene, index) => (
                    <GlassCard key={scene.id} hover className="p-4">
                      <div className="flex items-start gap-2 mb-3">
                        <div className="px-3 py-1 rounded-full backdrop-blur-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-medium">
                          SCENE {scene.order_number}
                        </div>
                        {scene.is_edited && (
                          <div className="px-3 py-1 rounded-full backdrop-blur-xl bg-yellow-500/20 border border-yellow-500/30 text-yellow-300 text-xs font-medium">
                            EDITED
                          </div>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <GlassTextarea
                            label="Voiceover"
                            value={scene.voice_over_text}
                            onChange={(e) => updateScene(scene.id, 'voice_over_text', e.target.value)}
                            rows={4}
                          />
                          <GlassTextarea
                            label="Image Prompt"
                            value={scene.image_prompt}
                            onChange={(e) => updateScene(scene.id, 'image_prompt', e.target.value)}
                            rows={4}
                          />
                        </div>
                        
                        <div className="flex items-center justify-center">
                          {scene.image_preview_url || scene.video_url ? (
                            <OptimizedGenerationPreview
                              storagePath={scene.image_preview_url || scene.video_url!}
                              contentType={scene.video_url ? 'video' : 'image'}
                            />
                          ) : (
                            <div className="w-full aspect-video rounded-xl backdrop-blur-xl bg-white/5 border border-white/10 flex items-center justify-center">
                              {scene.video_url ? (
                                <VideoIcon className="w-12 h-12 text-white/30" />
                              ) : (
                                <ImageIcon className="w-12 h-12 text-white/30" />
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </GlassCard>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            </GlassCard>
          )}

          {/* Render Section */}
          {storyboard && scenes && scenes.length > 0 && (
            <GlassCard>
              <div className="space-y-4">
                <h2 className="text-2xl font-light text-gray-200">Render Video</h2>
                
                {storyboard.video_url ? (
                  <div className="space-y-4">
                    <div className="aspect-video rounded-xl overflow-hidden">
                      <OptimizedGenerationPreview
                        storagePath={storyboard.video_url}
                        contentType="video"
                      />
                    </div>
                    <div className="flex gap-3">
                      <GlassButton variant="primary" size="lg" className="flex-1" onClick={handleRenderVideo}>
                        <RotateCcw className="w-5 h-5 mr-2" />
                        Re-render
                      </GlassButton>
                      <GlassButton 
                        variant="secondary" 
                        size="lg" 
                        className="flex-1"
                        onClick={async () => {
                          const { data } = await supabase.storage
                            .from('generated-content')
                            .createSignedUrl(storyboard.video_url!, 60);
                          if (data?.signedUrl) {
                            window.open(data.signedUrl, '_blank');
                          }
                        }}
                      >
                        <Download className="w-5 h-5 mr-2" />
                        Download
                      </GlassButton>
                    </div>
                  </div>
                ) : isRendering ? (
                  <div className="space-y-4">
                    <div className="p-6 rounded-2xl backdrop-blur-xl bg-indigo-500/10 border border-indigo-500/20">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-gray-200 font-light">Rendering video...</span>
                        <span className="text-gray-400 text-sm">{renderProgress}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full backdrop-blur-xl bg-white/5 border border-white/10 overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
                          style={{ width: `${renderProgress}%` }}
                        />
                      </div>
                    </div>
                    <GlassButton variant="ghost" size="sm" onClick={cancelRender} className="w-full">
                      Cancel Render
                    </GlassButton>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10">
                      <span className="text-gray-400 font-light">Estimated cost</span>
                      <span className="text-gray-200 font-medium">{storyboard.estimated_render_cost || 0} tokens</span>
                    </div>
                    <GlassButton variant="primary" size="lg" className="w-full" onClick={handleRenderVideo}>
                      <Play className="w-5 h-5 mr-2" />
                      RENDER VIDEO
                    </GlassButton>
                  </div>
                )}
              </div>
            </GlassCard>
          )}
        </div>
      </div>
    </div>
  );
}
