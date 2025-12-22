import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
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
import { useState } from 'react';

const VideoEditorPage = () => {
  const { clips, assets, getTotalDuration } = useVideoEditorStore();
  const [openSections, setOpenSections] = useState({
    audio: true,
    subtitles: false,
    transitions: false,
    output: true,
  });

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/dashboard/create">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-xl font-bold">Video Editor</h1>
              <p className="text-sm text-muted-foreground">
                {assets.length} assets • {clips.length} clips • {getTotalDuration().toFixed(1)}s total
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-6">
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
              <ClipList />
            </div>
          </div>

          {/* Right column - Settings & Render */}
          <div className="space-y-4">
            {/* Audio Track */}
            <Collapsible open={openSections.audio} onOpenChange={() => toggleSection('audio')}>
              <div className="bg-card border rounded-lg">
                <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                  <h3 className="font-medium">Background Audio</h3>
                  <ChevronDown className={`h-5 w-5 transition-transform ${openSections.audio ? 'rotate-180' : ''}`} />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-4 pb-4">
                    <AudioTrackPanel />
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>

            {/* Subtitles */}
            <Collapsible open={openSections.subtitles} onOpenChange={() => toggleSection('subtitles')}>
              <div className="bg-card border rounded-lg">
                <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                  <h3 className="font-medium">Subtitles & Captions</h3>
                  <ChevronDown className={`h-5 w-5 transition-transform ${openSections.subtitles ? 'rotate-180' : ''}`} />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-4 pb-4">
                    <SubtitlePanel />
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>

            {/* Global Transitions */}
            <Collapsible open={openSections.transitions} onOpenChange={() => toggleSection('transitions')}>
              <div className="bg-card border rounded-lg">
                <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                  <h3 className="font-medium">Global Transitions</h3>
                  <ChevronDown className={`h-5 w-5 transition-transform ${openSections.transitions ? 'rotate-180' : ''}`} />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-4 pb-4">
                    <GlobalTransitionsPanel />
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>

            {/* Output Settings */}
            <Collapsible open={openSections.output} onOpenChange={() => toggleSection('output')}>
              <div className="bg-card border rounded-lg">
                <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                  <h3 className="font-medium">Output Settings</h3>
                  <ChevronDown className={`h-5 w-5 transition-transform ${openSections.output ? 'rotate-180' : ''}`} />
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
              <RenderButton />
            </div>

            {/* Video Output */}
            <div className="bg-card border rounded-lg p-4">
              <h3 className="font-medium mb-4">Video Output</h3>
              <VideoPreview />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default VideoEditorPage;
