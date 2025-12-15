import { VideoCreator } from '@/components/video/VideoCreator';
import { Video } from 'lucide-react';

export default function VideoStudio() {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <div className="p-2 rounded-lg bg-primary/10 shrink-0">
              <Video className="h-6 w-6 md:h-8 md:w-8 text-primary" />
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black break-words">
              FACELESS VIDEOS
              <span className="text-sm md:text-base font-medium text-muted-foreground ml-2">
                from 0.3/s
              </span>
            </h1>
          </div>
          <p className="text-sm md:text-base lg:text-lg text-muted-foreground">
            Generate professional faceless videos with AI-powered script writing, voiceover, and video assembly
          </p>
        </div>

        {/* Main Content */}
        <div className="w-full min-w-0">
          <VideoCreator />
        </div>

        {/* Info Section */}
        <div className="mt-12 grid sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
          <div className="rounded-lg border-2 p-4 md:p-6 bg-card">
            <div className="text-2xl md:text-3xl mb-3">🤖</div>
            <h3 className="font-bold text-base md:text-lg mb-2">AI-Powered Scripts</h3>
            <p className="text-xs md:text-sm text-muted-foreground">
              Claude generates engaging, professional scripts tailored to your topic and style
            </p>
          </div>
          <div className="rounded-lg border-2 p-4 md:p-6 bg-card">
            <div className="text-2xl md:text-3xl mb-3">🎙️</div>
            <h3 className="font-bold text-base md:text-lg mb-2">Natural Voiceover</h3>
            <p className="text-xs md:text-sm text-muted-foreground">
              ElevenLabs creates natural, human-like voiceovers in multiple languages
            </p>
          </div>
          <div className="rounded-lg border-2 p-4 md:p-6 bg-card">
            <div className="text-2xl md:text-3xl mb-3">🎬</div>
            <h3 className="font-bold text-base md:text-lg mb-2">Professional Assembly</h3>
            <p className="text-xs md:text-sm text-muted-foreground">
              Shotstack automatically assembles videos with subtitles and effects
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
