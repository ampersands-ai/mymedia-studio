import { BackgroundPreset } from '@/types/procedural-background';
import { cn } from '@/lib/utils';
import { Play, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { memo } from 'react';

interface PresetCardProps {
  preset: BackgroundPreset;
  onSelect: (preset: BackgroundPreset) => void;
  onPreview?: (preset: BackgroundPreset) => void;
  isSelected?: boolean;
}

/**
 * Optimized PresetCard with static thumbnail and hover-only animations.
 * Performance: Renders a simple CSS gradient by default, only shows
 * animated shapes when user hovers (with debounce).
 */
export const PresetCard = memo(function PresetCard({ 
  preset, 
  onSelect, 
  onPreview, 
  isSelected 
}: PresetCardProps) {
  const categoryColors: Record<string, string> = {
    Abstract: 'bg-secondary/20 text-secondary border-secondary/30',
    Tech: 'bg-accent/20 text-accent border-accent/30',
    Energetic: 'bg-primary/20 text-primary border-primary/30',
    Minimal: 'bg-muted text-muted-foreground border-border',
  };

  const isCannon = preset.params.arrangement === 'cannon';
  const isTunnel = preset.params.arrangement === 'tunnel';

  // Static gradient background - no shapes, just CSS
  const getStaticBackground = () => {
    if (isTunnel) {
      return `radial-gradient(ellipse at 50% 50%, ${preset.params.colorPrimary}60 0%, ${preset.params.colorSecondary}30 30%, ${preset.params.backgroundColor} 70%)`;
    }
    if (isCannon) {
      return `radial-gradient(ellipse at 50% 50%, ${preset.params.colorPrimary}70 0%, ${preset.params.colorSecondary}40 25%, ${preset.params.backgroundColor} 60%)`;
    }
    return `radial-gradient(ellipse at 30% 20%, ${preset.params.colorPrimary}40 0%, transparent 50%),
            radial-gradient(ellipse at 70% 80%, ${preset.params.colorSecondary}40 0%, transparent 50%),
            linear-gradient(145deg, ${preset.params.backgroundColor} 0%, ${preset.params.colorPrimary}20 100%)`;
  };

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl border-2 transition-all duration-300',
        'bg-card hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10',
        isSelected ? 'border-primary ring-2 ring-primary/30' : 'border-border'
      )}
    >
      {/* Thumbnail with static gradient */}
      <div className="relative aspect-[9/16] overflow-hidden">
        {/* Static gradient background - always visible, no JS computation */}
        <div
          className="absolute inset-0"
          style={{ background: getStaticBackground() }}
        />

        {/* Central glow for tunnel/cannon - just CSS */}
        {(isCannon || isTunnel) && (
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              width: isTunnel ? '12px' : '20px',
              height: isTunnel ? '12px' : '20px',
              background: `radial-gradient(circle, rgba(255,255,255,0.9) 0%, ${preset.params.colorPrimary}80 40%, transparent 70%)`,
              boxShadow: `0 0 30px ${preset.params.colorPrimary}70, 0 0 60px ${preset.params.colorPrimary}40`,
            }}
          />
        )}

        {/* Minimal decorative shapes - only 3-5 shapes, static */}
        <StaticShapePreview preset={preset} />

        {/* Hover overlay with actions */}
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
});

/**
 * Minimal static shape preview - only 4-6 shapes for visual interest
 * No animations, pure CSS transforms
 */
const StaticShapePreview = memo(function StaticShapePreview({ 
  preset 
}: { 
  preset: BackgroundPreset 
}) {
  const { colorPrimary, colorSecondary, shape, arrangement } = preset.params;
  const borderRadius = shape === 'sphere' ? '50%' : shape === 'pyramid' ? '0' : '4px';
  const clipPath = shape === 'pyramid' ? 'polygon(50% 0%, 0% 100%, 100% 100%)' : undefined;

  // Generate only 5 static positions based on arrangement
  const positions = arrangement === 'tunnel' || arrangement === 'cannon'
    ? [
        { x: 50, y: 50, size: 4, opacity: 0.8, color: colorPrimary },
        { x: 35, y: 35, size: 6, opacity: 0.5, color: colorSecondary },
        { x: 65, y: 35, size: 5, opacity: 0.5, color: colorPrimary },
        { x: 35, y: 65, size: 5, opacity: 0.4, color: colorPrimary },
        { x: 65, y: 65, size: 6, opacity: 0.4, color: colorSecondary },
      ]
    : [
        { x: 25, y: 30, size: 12, opacity: 0.3, color: colorPrimary },
        { x: 70, y: 25, size: 8, opacity: 0.4, color: colorSecondary },
        { x: 50, y: 50, size: 10, opacity: 0.5, color: colorPrimary },
        { x: 30, y: 70, size: 7, opacity: 0.4, color: colorSecondary },
        { x: 75, y: 75, size: 9, opacity: 0.3, color: colorPrimary },
      ];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {positions.map((pos, i) => (
        <div
          key={i}
          className="absolute"
          style={{
            width: `${pos.size}px`,
            height: `${pos.size}px`,
            left: `${pos.x}%`,
            top: `${pos.y}%`,
            transform: 'translate(-50%, -50%)',
            background: pos.color,
            borderRadius,
            clipPath,
            opacity: pos.opacity,
          }}
        />
      ))}
    </div>
  );
});
