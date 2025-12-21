import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  MediaUploader,
  MediaLibrary,
  ClipList,
  OutputSettingsPanel,
  RenderButton,
  useVideoEditorStore,
} from '@/features/video-editor';

const VideoEditorPage = () => {
  const { clips, getTotalDuration } = useVideoEditorStore();

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
                {clips.length} clips • {getTotalDuration().toFixed(1)}s total
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left column - Media & Clips */}
          <div className="lg:col-span-2 space-y-6">
            <Tabs defaultValue="upload" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="upload">Upload Media</TabsTrigger>
                <TabsTrigger value="arrange">Arrange Clips</TabsTrigger>
              </TabsList>
              
              <TabsContent value="upload" className="space-y-4 mt-4">
                <MediaUploader />
                <div>
                  <h3 className="font-medium mb-3">Media Library</h3>
                  <MediaLibrary />
                </div>
              </TabsContent>
              
              <TabsContent value="arrange" className="space-y-4 mt-4">
                <div>
                  <h3 className="font-medium mb-3">Clip Sequence</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Drag to reorder clips. Click settings to adjust duration and transitions.
                  </p>
                  <ClipList />
                </div>
              </TabsContent>
            </Tabs>
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
