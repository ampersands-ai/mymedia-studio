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
            background: `radial-gradient(ellipse at 30% 20%, ${preset.params.colorPrimary}25 0%, transparent 50%),
                         radial-gradient(ellipse at 70% 80%, ${preset.params.colorSecondary}25 0%, transparent 50%),
                         linear-gradient(145deg, ${preset.params.backgroundColor} 0%, ${preset.params.colorPrimary}15 100%)`,
          }}
        />
        
        {/* Layer 1: Far background - very large, very faint (40 shapes) */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(40)].map((_, i) => {
            const gridX = (i % 8) * 12.5;
            const gridY = Math.floor(i / 8) * 20;
            const offsetX = Math.sin(i * 0.7) * 8;
            const offsetY = Math.cos(i * 0.5) * 8;
            const size = 30 + (i % 5) * 12;
            const rotation = i * 9;
            return (
              <div
                key={`l1-${i}`}
                className="absolute"
                style={{
                  width: `${size}px`,
                  height: `${size}px`,
                  left: `${gridX + offsetX}%`,
                  top: `${gridY + offsetY}%`,
                  background: i % 2 === 0 ? preset.params.colorPrimary : preset.params.colorSecondary,
                  borderRadius: preset.params.shape === 'sphere' ? '50%' : preset.params.shape === 'pyramid' ? '0' : '6px',
                  opacity: 0.06,
                  transform: `rotate(${rotation}deg)`,
                  clipPath: preset.params.shape === 'pyramid' ? 'polygon(50% 0%, 0% 100%, 100% 100%)' : undefined,
                }}
              />
            );
          })}
        </div>

        {/* Layer 2: Background - large shapes in spiral (50 shapes) */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(50)].map((_, i) => {
            const angle = (i / 50) * Math.PI * 6;
            const radius = 10 + i * 1.8;
            const x = 50 + Math.cos(angle) * radius * 0.5;
            const y = 50 + Math.sin(angle) * radius * 0.8;
            const size = 20 + (i % 6) * 6;
            const rotationType = i % 4;
            const rotation = rotationType === 0 ? i * 15 : rotationType === 1 ? i * -12 : rotationType === 2 ? i * 7.2 : 45;
            return (
              <div
                key={`l2-${i}`}
                className="absolute animate-pulse"
                style={{
                  width: `${size}px`,
                  height: `${size}px`,
                  left: `${x}%`,
                  top: `${y}%`,
                  transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
                  background: i % 3 === 0 ? preset.params.colorPrimary : i % 3 === 1 ? preset.params.colorSecondary : `${preset.params.colorPrimary}80`,
                  borderRadius: preset.params.shape === 'sphere' ? '50%' : preset.params.shape === 'pyramid' ? '0' : '4px',
                  opacity: 0.12,
                  clipPath: preset.params.shape === 'pyramid' ? 'polygon(50% 0%, 0% 100%, 100% 100%)' : undefined,
                  animationDuration: `${4 + (i % 3)}s`,
                  animationDelay: `${(i % 10) * 0.1}s`,
                }}
              />
            );
          })}
        </div>

        {/* Layer 3: Mid-ground - medium shapes scattered (60 shapes) */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(60)].map((_, i) => {
            const goldenAngle = 137.5 * (Math.PI / 180);
            const angle = i * goldenAngle;
            const radius = Math.sqrt(i) * 6;
            const x = 50 + Math.cos(angle) * radius;
            const y = 50 + Math.sin(angle) * radius;
            const size = 10 + (i % 8) * 3;
            const rotationStyles = [i * 6, -i * 8, i * 4.5, 30, -30, i * 12, 0, 60];
            const rotation = rotationStyles[i % 8];
            return (
              <div
                key={`l3-${i}`}
                className="absolute animate-float"
                style={{
                  width: `${size}px`,
                  height: `${size}px`,
                  left: `${x}%`,
                  top: `${y}%`,
                  transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
                  background: i % 2 === 0 ? preset.params.colorSecondary : preset.params.colorPrimary,
                  borderRadius: preset.params.shape === 'sphere' ? '50%' : preset.params.shape === 'pyramid' ? '0' : '3px',
                  opacity: 0.25,
                  clipPath: preset.params.shape === 'pyramid' ? 'polygon(50% 0%, 0% 100%, 100% 100%)' : undefined,
                  animationDelay: `${(i % 12) * 0.08}s`,
                  animationDuration: '3s',
                }}
              />
            );
          })}
        </div>

        {/* Layer 4: Foreground cluster - small bright shapes (40 shapes) */}
        <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
          {[...Array(40)].map((_, i) => {
            const ring = Math.floor(i / 10);
            const indexInRing = i % 10;
            const angle = (indexInRing / 10) * Math.PI * 2 + ring * 0.3;
            const radius = 8 + ring * 12;
            const x = 50 + Math.cos(angle) * radius;
            const y = 50 + Math.sin(angle) * radius;
            const size = 6 + (i % 5) * 2;
            const rotationPattern = [0, 45, 90, 135, 180, -45, -90, 30, 60, 15];
            const rotation = rotationPattern[i % 10] + ring * 15;
            return (
              <div
                key={`l4-${i}`}
                className="absolute animate-float"
                style={{
                  width: `${size}px`,
                  height: `${size}px`,
                  left: `${x}%`,
                  top: `${y}%`,
                  transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
                  background: i % 2 === 0 ? preset.params.colorPrimary : preset.params.colorSecondary,
                  borderRadius: preset.params.shape === 'sphere' ? '50%' : preset.params.shape === 'pyramid' ? '0' : '2px',
                  opacity: 0.55,
                  clipPath: preset.params.shape === 'pyramid' ? 'polygon(50% 0%, 0% 100%, 100% 100%)' : undefined,
                  animationDelay: `${(i % 8) * 0.1}s`,
                  animationDuration: '2.5s',
                  boxShadow: preset.params.metallic > 0.5 
                    ? `0 0 ${4 + (i % 3) * 2}px ${i % 2 === 0 ? preset.params.colorPrimary : preset.params.colorSecondary}50` 
                    : undefined,
                }}
              />
            );
          })}
        </div>

        {/* Layer 5: Center focus - tiny bright particles (30 shapes) */}
        <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
          {[...Array(30)].map((_, i) => {
            const spiralAngle = i * 0.5;
            const spiralRadius = i * 0.8;
            const x = 50 + Math.cos(spiralAngle) * spiralRadius;
            const y = 50 + Math.sin(spiralAngle) * spiralRadius;
            const size = 3 + (i % 4) * 1.5;
            const rotation = i * 12;
            return (
              <div
                key={`l5-${i}`}
                className="absolute animate-pulse"
                style={{
                  width: `${size}px`,
                  height: `${size}px`,
                  left: `${x}%`,
                  top: `${y}%`,
                  transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
                  background: preset.params.colorPrimary,
                  borderRadius: preset.params.shape === 'sphere' ? '50%' : preset.params.shape === 'pyramid' ? '0' : '1px',
                  opacity: 0.7,
                  clipPath: preset.params.shape === 'pyramid' ? 'polygon(50% 0%, 0% 100%, 100% 100%)' : undefined,
                  animationDelay: `${(i % 6) * 0.15}s`,
                  animationDuration: '2s',
                  boxShadow: preset.params.metallic > 0.3 
                    ? `0 0 ${6}px ${preset.params.colorPrimary}70` 
                    : undefined,
                }}
              />
            );
          })}
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
