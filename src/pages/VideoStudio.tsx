import { VideoCreator } from '@/components/video/VideoCreator';
import { VideoJobsList } from '@/components/video/VideoJobsList';
import { Video } from 'lucide-react';

export default function VideoStudio() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Video className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-4xl md:text-5xl font-black">
              FACELESS VIDEOS
            </h1>
          </div>
          <p className="text-lg text-muted-foreground">
            Generate professional faceless videos with AI-powered script writing, voiceover, and video assembly
          </p>
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-2 gap-8">
          <div className="min-h-[600px] h-full">
            <VideoCreator />
          </div>
          <div className="min-h-[600px] h-full">
            <VideoJobsList />
          </div>
        </div>

        {/* Info Section */}
        <div className="mt-12 grid md:grid-cols-3 gap-6">
          <div className="rounded-lg border-2 p-6 bg-card">
            <div className="text-3xl mb-3">🤖</div>
            <h3 className="font-bold text-lg mb-2">AI-Powered Scripts</h3>
            <p className="text-sm text-muted-foreground">
              Claude generates engaging, professional scripts tailored to your topic and style
            </p>
          </div>
          <div className="rounded-lg border-2 p-6 bg-card">
            <div className="text-3xl mb-3">🎙️</div>
            <h3 className="font-bold text-lg mb-2">Natural Voiceover</h3>
            <p className="text-sm text-muted-foreground">
              ElevenLabs creates natural, human-like voiceovers in multiple languages
            </p>
          </div>
          <div className="rounded-lg border-2 p-6 bg-card">
            <div className="text-3xl mb-3">🎬</div>
            <h3 className="font-bold text-lg mb-2">Professional Assembly</h3>
            <p className="text-sm text-muted-foreground">
              Shotstack automatically assembles videos with subtitles and effects
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
