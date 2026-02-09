import { ShotstackCreator } from '@/components/shotstack-test/ShotstackCreator';
import { Video, Coins, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function ShotstackTest() {
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
              SHOTSTACK TEST
              <span className="inline-flex items-center gap-1 text-sm md:text-base font-medium text-muted-foreground ml-2">
                <Coins className="w-4 h-4" />
                API Testing
              </span>
            </h1>
          </div>
          <p className="text-sm md:text-base lg:text-lg text-muted-foreground">
            Test Shotstack.io video rendering with custom configurations
          </p>
        </div>

        {/* Warning */}
        <Alert className="mb-6 border-destructive/50 bg-destructive/10">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <AlertDescription className="text-foreground">
            <strong>Development Only:</strong> This page is for testing Shotstack API integration. 
            Each render consumes API credits.
          </AlertDescription>
        </Alert>

        {/* Main Content */}
        <div className="w-full min-w-0">
          <ShotstackCreator />
        </div>

        {/* Info Section */}
        <div className="mt-12 grid sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
          <div className="rounded-lg border-2 p-4 md:p-6 bg-card">
            <div className="text-2xl md:text-3xl mb-3">🎬</div>
            <h3 className="font-bold text-base md:text-lg mb-2">Video Rendering</h3>
            <p className="text-xs md:text-sm text-muted-foreground">
              Shotstack processes video clips, overlays, and effects into final MP4
            </p>
          </div>
          <div className="rounded-lg border-2 p-4 md:p-6 bg-card">
            <div className="text-2xl md:text-3xl mb-3">⚡</div>
            <h3 className="font-bold text-base md:text-lg mb-2">Fast Processing</h3>
            <p className="text-xs md:text-sm text-muted-foreground">
              Cloud-based rendering with typical completion in 30-60 seconds
            </p>
          </div>
          <div className="rounded-lg border-2 p-4 md:p-6 bg-card">
            <div className="text-2xl md:text-3xl mb-3">🔧</div>
            <h3 className="font-bold text-base md:text-lg mb-2">API Testing</h3>
            <p className="text-xs md:text-sm text-muted-foreground">
              Experiment with different payload configurations and settings
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
