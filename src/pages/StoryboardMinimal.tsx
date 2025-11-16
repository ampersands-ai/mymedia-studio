import { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';
import { MinimalSidebar } from '@/components/MinimalSidebar';
import { GlassCard } from '@/components/glass/GlassCard';
import { GlassButton } from '@/components/glass/GlassButton';
import { GlassTextarea } from '@/components/glass/GlassTextarea';
import { GlassSelect } from '@/components/glass/GlassSelect';
import { useStoryboard } from '@/hooks/useStoryboard';
import { useAzureVoices } from '@/hooks/useAzureVoices';
import { toast } from 'sonner';
import {
  Wand2,
  Play,
  Download,
  RotateCcw,
  Image as ImageIcon,
  Video as VideoIcon,
  XCircle
} from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { OptimizedGenerationPreview } from '@/components/generation/OptimizedGenerationPreview';
import { supabase } from '@/integrations/supabase/client';

export default function StoryboardMinimal() {
  const {
    storyboard,
    scenes,
    generateStoryboard,
    isGenerating,
    updateScene,
    updateIntroScene,
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
    } catch (error: any) {
      logger.error('Failed to generate storyboard', error as Error, { 
        component: 'StoryboardMinimal',
        operation: 'handleGenerateStoryboard',
        topic,
        duration,
        style,
        tone
      });
    }
  };

  const handleRenderVideo = async () => {
    try {
      await renderVideo();
      toast.success('Video rendering started!');
    } catch (error: any) {
      logger.error('Failed to render video', error as Error, { 
        component: 'StoryboardMinimal',
        operation: 'handleRenderVideo',
        storyboardId: storyboard?.id
      });
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
      } catch {
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
    <div className="flex min-h-screen bg-black">
      <MinimalSidebar />
      
      {/* Left Panel - Controls */}
      <div className="w-[420px] border-r border-gray-800 overflow-y-auto">
        <div className="p-8 space-y-6">
          {/* Header */}
          <div className="space-y-1">
            <h1 className="minimal-title">Create Video</h1>
            <p className="minimal-body">Generate AI storyboards for faceless videos</p>
          </div>

          {/* Topic Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="minimal-label">Video Topic</label>
              <button
                onClick={handleSurpriseMe}
                className="text-xs text-gray-400 hover:text-white transition-colors flex items-center gap-1"
              >
                <Wand2 className="w-3 h-3" />
                Surprise Me
              </button>
            </div>
            <GlassTextarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Describe your video topic in detail..."
              rows={5}
              className="min-h-[120px]"
            />
          </div>

          {/* Duration */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="minimal-label">Duration</label>
              <span className="text-sm text-white font-medium">{duration}s</span>
            </div>
            <Slider
              value={[duration]}
              onValueChange={(value) => setDuration(value[0])}
              min={30}
              max={180}
              step={10}
              className="w-full"
            />
          </div>

          {/* Style */}
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

          {/* Tone */}
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

          {/* Voice */}
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
                {voice.voice_name} ({voice.language})
              </option>
            ))}
          </GlassSelect>

          {/* Generate Button */}
          <GlassButton
            variant="primary"
            size="lg"
            className="w-full"
            onClick={handleGenerateStoryboard}
            loading={isGenerating}
            disabled={!topic.trim() || !voiceId}
          >
            Generate Storyboard
          </GlassButton>

          {/* Reset Button */}
          {storyboard && (
            <GlassButton
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={handleReset}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset & Start Over
            </GlassButton>
          )}
        </div>
      </div>

      {/* Right Panel - Results */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-8">
          {/* Render Section (if video exists) */}
          {storyboard?.video_url && (
            <div className="mb-8">
              <h2 className="minimal-heading mb-4">Rendered Video</h2>
              <GlassCard className="p-4">
                <div className="aspect-video rounded-lg overflow-hidden mb-4">
                  <OptimizedGenerationPreview
                    storagePath={storyboard.video_url}
                    contentType="video"
                  />
                </div>
                <div className="flex gap-3">
                  <GlassButton variant="primary" className="flex-1" onClick={handleRenderVideo}>
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Re-render
                  </GlassButton>
                  <GlassButton 
                    variant="secondary" 
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
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </GlassButton>
                </div>
              </GlassCard>
            </div>
          )}

          {/* Rendering Progress */}
          {isRendering && (
            <div className="mb-8">
              <h2 className="minimal-heading mb-4">Rendering...</h2>
              <GlassCard className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="minimal-body">Rendering video...</span>
                  <span className="text-sm text-gray-400">{renderProgress}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-gray-800 overflow-hidden mb-4">
                  <div 
                    className="h-full bg-emerald-500 transition-all duration-500"
                    style={{ width: `${renderProgress}%` }}
                  />
                </div>
                <GlassButton variant="secondary" size="sm" onClick={cancelRender}>
                  <XCircle className="w-4 h-4 mr-2" />
                  Cancel
                </GlassButton>
              </GlassCard>
            </div>
          )}

          {/* Scenes Gallery */}
          {scenes && scenes.length > 0 ? (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="minimal-heading">Scenes ({scenes.length + 1})</h2>
                {storyboard && !storyboard.video_url && !isRendering && (
                  <GlassButton variant="primary" onClick={handleRenderVideo}>
                    <Play className="w-4 h-4 mr-2" />
                    Render Video
                  </GlassButton>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Intro Scene */}
                {storyboard && (
                  <GlassCard className="p-4 hover:bg-gray-850 transition-colors">
                    <div className="mb-3">
                      <span className="inline-block px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-medium">
                        INTRO
                      </span>
                    </div>
                    
                    {storyboard.intro_image_preview_url ? (
                      <div className="aspect-video rounded-lg overflow-hidden mb-3">
                        <OptimizedGenerationPreview
                          storagePath={storyboard.intro_image_preview_url}
                          contentType="image"
                        />
                      </div>
                    ) : (
                      <div className="aspect-video rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center mb-3">
                        <ImageIcon className="w-12 h-12 text-gray-600" />
                      </div>
                    )}

                    <div className="space-y-2">
                      <GlassTextarea
                        value={storyboard.intro_voiceover_text}
                        onChange={(e) => updateIntroScene('intro_voiceover_text', e.target.value)}
                        rows={3}
                        placeholder="Intro voiceover..."
                      />
                      <GlassTextarea
                        value={storyboard.intro_image_prompt}
                        onChange={(e) => updateIntroScene('intro_image_prompt', e.target.value)}
                        rows={2}
                        placeholder="Image prompt..."
                      />
                    </div>
                  </GlassCard>
                )}

                {/* Regular Scenes */}
                {scenes.map((scene) => (
                  <GlassCard key={scene.id} className="p-4 hover:bg-gray-850 transition-colors">
                    <div className="mb-3 flex items-center gap-2">
                      <span className="inline-block px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-medium">
                        SCENE {scene.order_number}
                      </span>
                      {scene.is_edited && (
                        <span className="inline-block px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-300 text-xs font-medium">
                          EDITED
                        </span>
                      )}
                    </div>
                    
                    {scene.image_preview_url || scene.video_url ? (
                      <div className="aspect-video rounded-lg overflow-hidden mb-3">
                        <OptimizedGenerationPreview
                          storagePath={scene.image_preview_url || scene.video_url!}
                          contentType={scene.video_url ? 'video' : 'image'}
                        />
                      </div>
                    ) : (
                      <div className="aspect-video rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center mb-3">
                        {scene.video_url ? (
                          <VideoIcon className="w-12 h-12 text-gray-600" />
                        ) : (
                          <ImageIcon className="w-12 h-12 text-gray-600" />
                        )}
                      </div>
                    )}

                    <div className="space-y-2">
                      <GlassTextarea
                        value={scene.voice_over_text}
                        onChange={(e) => updateScene(scene.id, 'voice_over_text', e.target.value)}
                        rows={3}
                        placeholder="Voiceover text..."
                      />
                      <GlassTextarea
                        value={scene.image_prompt}
                        onChange={(e) => updateScene(scene.id, 'image_prompt', e.target.value)}
                        rows={2}
                        placeholder="Image prompt..."
                      />
                    </div>
                  </GlassCard>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center space-y-3">
                <div className="w-16 h-16 rounded-full bg-gray-900 border border-gray-800 flex items-center justify-center mx-auto">
                  <ImageIcon className="w-8 h-8 text-gray-600" />
                </div>
                <p className="minimal-body">Generate a storyboard to see scenes</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
