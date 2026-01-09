import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import {
  MediaUploader,
  MediaLibrary,
  ClipList,
  OutputSettingsPanel,
  RenderButton,
  useVideoEditorStore,
  VideoPreview,
  AudioTrackPanel,
  SubtitlePanel,
  GlobalTransitionsPanel,
} from '@/features/video-editor';
import { useState, useCallback } from 'react';

type SectionKey = 'audio' | 'subtitles' | 'transitions' | 'output' | null;

const VideoEditorPage = () => {
  const { clips, assets, getTotalDuration, selectClip } = useVideoEditorStore();
  // Single open section - only one can be open at a time
  const [openSection, setOpenSection] = useState<SectionKey>(null);

  const toggleSection = (section: SectionKey) => {
    // When opening a sidebar section, collapse any expanded clip
    if (section !== openSection) {
      selectClip(null);
    }
    setOpenSection(prev => prev === section ? null : section);
  };

  // Collapse all sections (called from RenderButton on new render/retry)
  const collapseAll = useCallback(() => {
    setOpenSection(null);
    selectClip(null);
  }, [selectClip]);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 md:py-8 max-w-7xl">
        <div className="space-y-6">
          {/* Page Header */}
          <div>
            <h1 className="text-3xl md:text-4xl font-black">Video Editor</h1>
            <p className="text-sm md:text-base text-foreground/80 font-medium">
              {assets.length} assets • {clips.length} clips • {getTotalDuration().toFixed(1)}s total
            </p>
          </div>

          {/* Main content */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left column - Upload, Library & Clips */}
            <div className="lg:col-span-2 space-y-6">
              {/* Upload */}
              <MediaUploader />

              {/* Media Library */}
              <div>
                <h3 className="font-medium mb-3">Media Library</h3>
                <MediaLibrary />
              </div>

              {/* Clip Sequence */}
              <div>
                <h3 className="font-medium mb-3">Clip Sequence</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Drag to reorder clips. Click the arrow to expand settings.
                </p>
                <ClipList onClipExpand={() => setOpenSection(null)} />
              </div>
            </div>

            {/* Right column - Settings & Render */}
            <div className="space-y-4">
              {/* Audio Track */}
              <Collapsible open={openSection === 'audio'} onOpenChange={() => toggleSection('audio')}>
                <div className="bg-card border rounded-lg">
                  <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                    <h3 className="font-medium">Background Audio</h3>
                    <ChevronDown className={`h-5 w-5 transition-transform ${openSection === 'audio' ? 'rotate-180' : ''}`} />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-4 pb-4">
                      <AudioTrackPanel />
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>

              {/* Subtitles */}
              <Collapsible open={openSection === 'subtitles'} onOpenChange={() => toggleSection('subtitles')}>
                <div className="bg-card border rounded-lg">
                  <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                    <h3 className="font-medium">Subtitles & Captions</h3>
                    <ChevronDown className={`h-5 w-5 transition-transform ${openSection === 'subtitles' ? 'rotate-180' : ''}`} />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-4 pb-4">
                      <SubtitlePanel />
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>

              {/* Global Transitions */}
              <Collapsible open={openSection === 'transitions'} onOpenChange={() => toggleSection('transitions')}>
                <div className="bg-card border rounded-lg">
                  <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                    <h3 className="font-medium">Global Transitions</h3>
                    <ChevronDown className={`h-5 w-5 transition-transform ${openSection === 'transitions' ? 'rotate-180' : ''}`} />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-4 pb-4">
                      <GlobalTransitionsPanel />
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>

              {/* Output Settings */}
              <Collapsible open={openSection === 'output'} onOpenChange={() => toggleSection('output')}>
                <div className="bg-card border rounded-lg">
                  <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                    <h3 className="font-medium">Output Settings</h3>
                    <ChevronDown className={`h-5 w-5 transition-transform ${openSection === 'output' ? 'rotate-180' : ''}`} />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-4 pb-4">
                      <OutputSettingsPanel />
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>

              {/* Render Button */}
              <div className="bg-card border rounded-lg p-4">
                <h3 className="font-medium mb-4">Render</h3>
                <RenderButton onRenderAction={collapseAll} />
              </div>
            </div>
          </div>

          {/* Video Output - Full Width */}
          <div className="bg-card border rounded-lg p-4">
            <h3 className="font-medium mb-4">Video Output</h3>
            <div className="max-w-xl mx-auto">
              <VideoPreview />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoEditorPage;
