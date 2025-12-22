import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  MediaUploader,
  MediaLibrary,
  ClipList,
  OutputSettingsPanel,
  RenderButton,
  useVideoEditorStore,
} from '@/features/video-editor';

const VideoEditorPage = () => {
  const { clips, assets, getTotalDuration } = useVideoEditorStore();

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
                Drag to reorder clips. Click settings to adjust duration and transitions.
              </p>
              <ClipList />
            </div>
          </div>

          {/* Right column - Settings & Render */}
          <div className="space-y-6">
            <div className="bg-card border rounded-lg p-4">
              <h3 className="font-medium mb-4">Output Settings</h3>
              <OutputSettingsPanel />
            </div>

            <div className="bg-card border rounded-lg p-4">
              <h3 className="font-medium mb-4">Render</h3>
              <RenderButton />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default VideoEditorPage;
