import { AlertTriangle, Chrome, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function WebGPUFallback() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 rounded-xl border border-border bg-card p-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="h-8 w-8 text-destructive" />
      </div>
      
      <div className="space-y-2">
        <h3 className="text-xl font-semibold text-foreground">WebGPU Not Supported</h3>
        <p className="max-w-md text-sm text-muted-foreground">
          Your browser doesn't support WebGPU, which is required for real-time 3D rendering.
          Please use a compatible browser to access this feature.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium text-foreground">Supported Browsers:</p>
        <div className="flex flex-wrap justify-center gap-3">
          <div className="flex items-center gap-2 rounded-full border border-border bg-muted px-4 py-2">
            <Chrome className="h-4 w-4 text-primary" />
            <span className="text-sm">Chrome 113+</span>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-border bg-muted px-4 py-2">
            <Monitor className="h-4 w-4 text-accent" />
            <span className="text-sm">Edge 113+</span>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-border bg-muted px-4 py-2">
            <Monitor className="h-4 w-4 text-secondary" />
            <span className="text-sm">Safari 17+</span>
          </div>
        </div>
      </div>

      <Button
        variant="outline"
        onClick={() => window.open('https://caniuse.com/webgpu', '_blank')}
        className="mt-2"
      >
        Check Browser Compatibility
      </Button>
    </div>
  );
}
