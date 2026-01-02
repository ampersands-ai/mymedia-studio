import { BackgroundPreset } from '@/types/procedural-background';
import { cn } from '@/lib/utils';
import { Play, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PresetCardProps {
  preset: BackgroundPreset;
  onSelect: (preset: BackgroundPreset) => void;
  onPreview?: (preset: BackgroundPreset) => void;
  isSelected?: boolean;
}

export function PresetCard({ preset, onSelect, onPreview, isSelected }: PresetCardProps) {
  const categoryColors: Record<string, string> = {
    Abstract: 'bg-secondary/20 text-secondary border-secondary/30',
    Tech: 'bg-accent/20 text-accent border-accent/30',
    Energetic: 'bg-primary/20 text-primary border-primary/30',
    Minimal: 'bg-muted text-muted-foreground border-border',
  };

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl border-2 transition-all duration-300',
        'bg-card hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10',
        isSelected ? 'border-primary ring-2 ring-primary/30' : 'border-border'
      )}
    >
      {/* Thumbnail with gradient overlay */}
      <div className="relative aspect-[9/16] overflow-hidden">
        {/* Dynamic gradient background based on preset colors */}
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(145deg, ${preset.params.backgroundColor} 0%, ${preset.params.colorPrimary}30 50%, ${preset.params.colorSecondary}40 100%)`,
          }}
        />
        
        {/* Background layer - large, faint shapes */}
        <div className="absolute inset-0">
          {[...Array(6)].map((_, i) => {
            const angle = (i / 6) * Math.PI * 2;
            const radius = 60;
            const x = 50 + Math.cos(angle) * radius * 0.6;
            const y = 50 + Math.sin(angle) * radius * 0.8;
            return (
              <div
                key={`bg-${i}`}
                className="absolute animate-pulse"
                style={{
                  width: `${35 + i * 5}px`,
                  height: `${35 + i * 5}px`,
                  left: `${x}%`,
                  top: `${y}%`,
                  transform: 'translate(-50%, -50%)',
                  background: i % 2 === 0 ? preset.params.colorPrimary : preset.params.colorSecondary,
                  borderRadius: preset.params.shape === 'sphere' ? '50%' : preset.params.shape === 'pyramid' ? '0' : '4px',
                  opacity: 0.15,
                  clipPath: preset.params.shape === 'pyramid' ? 'polygon(50% 0%, 0% 100%, 100% 100%)' : undefined,
                  animationDuration: `${3 + i * 0.5}s`,
                }}
              />
            );
          })}
        </div>

        {/* Mid layer - medium shapes */}
        <div className="absolute inset-0">
          {[...Array(8)].map((_, i) => {
            const angle = (i / 8) * Math.PI * 2 + 0.3;
            const radius = 35;
            const x = 50 + Math.cos(angle) * radius;
            const y = 50 + Math.sin(angle) * radius;
            return (
              <div
                key={`mid-${i}`}
                className="absolute animate-float"
                style={{
                  width: `${18 + i * 3}px`,
                  height: `${18 + i * 3}px`,
                  left: `${x}%`,
                  top: `${y}%`,
                  transform: 'translate(-50%, -50%)',
                  background: i % 2 === 0 ? preset.params.colorSecondary : preset.params.colorPrimary,
                  borderRadius: preset.params.shape === 'sphere' ? '50%' : preset.params.shape === 'pyramid' ? '0' : '4px',
                  opacity: 0.4,
                  clipPath: preset.params.shape === 'pyramid' ? 'polygon(50% 0%, 0% 100%, 100% 100%)' : undefined,
                  animationDelay: `${i * 0.15}s`,
                  animationDuration: '2.5s',
                }}
              />
            );
          })}
        </div>

        {/* Foreground layer - small, bright shapes in center */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative w-24 h-24">
            {[...Array(6)].map((_, i) => {
              const angle = (i / 6) * Math.PI * 2;
              const radius = 25 + (i % 2) * 10;
              const x = 50 + Math.cos(angle) * radius;
              const y = 50 + Math.sin(angle) * radius;
              return (
                <div
                  key={`fg-${i}`}
                  className="absolute animate-float"
                  style={{
                    width: `${10 + i * 2}px`,
                    height: `${10 + i * 2}px`,
                    left: `${x}%`,
                    top: `${y}%`,
                    transform: 'translate(-50%, -50%)',
                    background: i % 2 === 0 ? preset.params.colorPrimary : preset.params.colorSecondary,
                    borderRadius: preset.params.shape === 'sphere' ? '50%' : preset.params.shape === 'pyramid' ? '0' : '4px',
                    opacity: 0.8,
                    clipPath: preset.params.shape === 'pyramid' ? 'polygon(50% 0%, 0% 100%, 100% 100%)' : undefined,
                    animationDelay: `${i * 0.1}s`,
                    animationDuration: '2s',
                    boxShadow: preset.params.metallic > 0.5 
                      ? `0 0 ${8 + i * 2}px ${preset.params.colorPrimary}60` 
                      : undefined,
                  }}
                />
              );
            })}
          </div>
        </div>

        {/* Hover overlay */}
        <div className="absolute inset-0 flex items-center justify-center gap-2 bg-background/80 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
          {onPreview && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={(e) => {
                e.stopPropagation();
                onPreview(preset);
              }}
            >
              <Play className="h-3.5 w-3.5" />
              Preview
            </Button>
          )}
          <Button
            size="sm"
            className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(preset);
            }}
          >
            <Check className="h-3.5 w-3.5" />
            Use
          </Button>
        </div>

        {/* Selected indicator */}
        {isSelected && (
          <div className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Check className="h-4 w-4" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="font-semibold text-foreground">{preset.name}</h3>
        <span
          className={cn(
            'mt-1 inline-block rounded-full border px-2 py-0.5 text-xs font-medium',
            categoryColors[preset.category]
          )}
        >
          {preset.category}
        </span>
      </div>
    </div>
  );
}
