import { BackgroundPreset } from '@/types/procedural-background';
import { cn } from '@/lib/utils';
import { Play, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMemo } from 'react';

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

  const isCannon = preset.params.arrangement === 'cannon';

  // Generate 1000+ shapes for cannon arrangement
  const cannonShapes = useMemo(() => {
    if (!isCannon) return null;

    const shapes: JSX.Element[] = [];
    const centerX = 50;
    const centerY = 50;
    const numSpokes = 32;
    const shapesPerSpoke = 32; // 32 * 32 = 1024 shapes

    for (let spoke = 0; spoke < numSpokes; spoke++) {
      const spokeAngle = (spoke / numSpokes) * Math.PI * 2;

      for (let ring = 0; ring < shapesPerSpoke; ring++) {
        const index = spoke * shapesPerSpoke + ring;
        const distance = 2 + ring * 3;
        const jitter = Math.sin(index * 0.7) * 1.2;
        const x = centerX + Math.cos(spokeAngle) * (distance + jitter);
        const y = centerY + Math.sin(spokeAngle) * (distance + jitter);

        // Size increases with distance
        const baseSize = 1.5 + ring * 0.25;
        const size = baseSize + Math.sin(index * 0.3) * 0.3;

        // Cannon rotation - point toward center
        const angleToCenter = Math.atan2(centerY - y, centerX - x);
        const rotationDeg = (angleToCenter * 180) / Math.PI;

        const useSecondary = (spoke + ring) % 3 === 0;
        const baseColor = useSecondary ? preset.params.colorSecondary : preset.params.colorPrimary;
        const gradientAngle = rotationDeg + 45;
        const opacity = 0.25 + (ring / shapesPerSpoke) * 0.6;
        const highlightIntensity = preset.params.metallic > 0.5 ? 0.7 : 0.3;

        shapes.push(
          <div
            key={`c-${index}`}
            className="absolute"
            style={{
              width: `${size}px`,
              height: `${size}px`,
              left: `${x}%`,
              top: `${y}%`,
              transform: `translate(-50%, -50%) rotate(${rotationDeg}deg)`,
              background: preset.params.metallic > 0.3
                ? `linear-gradient(${gradientAngle}deg, ${baseColor} 0%, rgba(255,255,255,${highlightIntensity}) 45%, ${baseColor} 55%, rgba(0,0,0,0.3) 100%)`
                : baseColor,
              borderRadius: preset.params.shape === 'sphere' ? '50%' : preset.params.shape === 'pyramid' ? '0' : '1px',
              opacity,
              clipPath: preset.params.shape === 'pyramid' ? 'polygon(50% 0%, 0% 100%, 100% 100%)' : undefined,
              boxShadow: preset.params.metallic > 0.6 && ring > 15 ? `0 0 ${1 + ring * 0.05}px ${baseColor}30` : undefined,
            }}
          />
        );
      }
    }
    return shapes;
  }, [isCannon, preset.params]);

  // Generate shapes for standard arrangements (220 shapes)
  const standardShapes = useMemo(() => {
    if (isCannon) return null;

    const shapes: JSX.Element[] = [];
    const layers = [
      { count: 40, opacity: 0.06, sizeBase: 30, sizeRange: 12 },
      { count: 50, opacity: 0.12, sizeBase: 20, sizeRange: 6 },
      { count: 60, opacity: 0.25, sizeBase: 10, sizeRange: 3 },
      { count: 40, opacity: 0.55, sizeBase: 6, sizeRange: 2 },
      { count: 30, opacity: 0.7, sizeBase: 3, sizeRange: 1.5 },
    ];

    let globalIndex = 0;
    layers.forEach((layer, layerIndex) => {
      for (let i = 0; i < layer.count; i++) {
        const angle = (i / layer.count) * Math.PI * 6 + layerIndex;
        const radius = 10 + i * (80 / layer.count);
        const x = 50 + Math.cos(angle) * radius * 0.5;
        const y = 50 + Math.sin(angle) * radius * 0.8;
        const size = layer.sizeBase + (i % 5) * (layer.sizeRange / 5);
        const rotation = i * 15 + layerIndex * 30;

        shapes.push(
          <div
            key={`s-${globalIndex}`}
            className={layerIndex > 1 ? 'absolute animate-float' : 'absolute'}
            style={{
              width: `${size}px`,
              height: `${size}px`,
              left: `${x}%`,
              top: `${y}%`,
              transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
              background: i % 2 === 0 ? preset.params.colorPrimary : preset.params.colorSecondary,
              borderRadius: preset.params.shape === 'sphere' ? '50%' : preset.params.shape === 'pyramid' ? '0' : '4px',
              opacity: layer.opacity,
              clipPath: preset.params.shape === 'pyramid' ? 'polygon(50% 0%, 0% 100%, 100% 100%)' : undefined,
              animationDelay: `${(i % 10) * 0.1}s`,
            }}
          />
        );
        globalIndex++;
      }
    });

    return shapes;
  }, [isCannon, preset.params]);

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
        {/* Dynamic gradient background */}
        <div
          className="absolute inset-0"
          style={{
            background: isCannon
              ? `radial-gradient(ellipse at 50% 50%, ${preset.params.colorPrimary}50 0%, transparent 40%), ${preset.params.backgroundColor}`
              : `radial-gradient(ellipse at 30% 20%, ${preset.params.colorPrimary}25 0%, transparent 50%),
                 radial-gradient(ellipse at 70% 80%, ${preset.params.colorSecondary}25 0%, transparent 50%),
                 linear-gradient(145deg, ${preset.params.backgroundColor} 0%, ${preset.params.colorPrimary}15 100%)`,
          }}
        />

        {/* Central light source glow for cannon */}
        {isCannon && (
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full animate-pulse"
            style={{
              width: '16px',
              height: '16px',
              background: `radial-gradient(circle, rgba(255,255,255,0.95) 0%, ${preset.params.colorPrimary}90 35%, transparent 70%)`,
              boxShadow: `0 0 25px ${preset.params.colorPrimary}90, 0 0 50px ${preset.params.colorPrimary}50, 0 0 80px ${preset.params.colorPrimary}30`,
            }}
          />
        )}

        {/* Render shapes */}
        <div className="absolute inset-0 overflow-hidden">
          {isCannon ? cannonShapes : standardShapes}
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
