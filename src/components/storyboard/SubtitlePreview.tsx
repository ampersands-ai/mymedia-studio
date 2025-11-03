import type { SubtitleSettings } from "@/types/subtitle";
import { cn } from "@/lib/utils";

interface SubtitlePreviewProps {
  settings: SubtitleSettings;
  className?: string;
}

export function SubtitlePreview({ settings, className }: SubtitlePreviewProps) {
  const getPositionStyles = () => {
    const baseStyles: React.CSSProperties = {
      transform: `translate(${settings.offsetX}px, ${settings.offsetY}px)`,
    };

    switch (settings.position) {
      case "top-left":
        return { ...baseStyles, top: "10%", left: "10%", transform: `translate(${settings.offsetX}px, ${settings.offsetY}px)` };
      case "top-center":
        return { ...baseStyles, top: "10%", left: "50%", transform: `translate(calc(-50% + ${settings.offsetX}px), ${settings.offsetY}px)` };
      case "top-right":
        return { ...baseStyles, top: "10%", right: "10%", transform: `translate(${settings.offsetX}px, ${settings.offsetY}px)` };
      case "mid-left-center":
        return { ...baseStyles, top: "50%", left: "10%", transform: `translate(${settings.offsetX}px, calc(-50% + ${settings.offsetY}px))` };
      case "mid-center":
        return { ...baseStyles, top: "50%", left: "50%", transform: `translate(calc(-50% + ${settings.offsetX}px), calc(-50% + ${settings.offsetY}px))` };
      case "mid-right-center":
        return { ...baseStyles, top: "50%", right: "10%", transform: `translate(${settings.offsetX}px, calc(-50% + ${settings.offsetY}px))` };
      case "mid-bottom-center":
        return { ...baseStyles, bottom: "25%", left: "50%", transform: `translate(calc(-50% + ${settings.offsetX}px), ${settings.offsetY}px)` };
      case "bottom-left":
        return { ...baseStyles, bottom: "10%", left: "10%", transform: `translate(${settings.offsetX}px, ${settings.offsetY}px)` };
      case "bottom-right":
        return { ...baseStyles, bottom: "10%", right: "10%", transform: `translate(${settings.offsetX}px, ${settings.offsetY}px)` };
      case "bottom-center":
      default:
        return { ...baseStyles, bottom: "10%", left: "50%", transform: `translate(calc(-50% + ${settings.offsetX}px), ${settings.offsetY}px)` };
    }
  };

  const subtitleStyles: React.CSSProperties = {
    fontFamily: settings.fontFamily,
    fontSize: `${settings.fontSize}px`,
    color: settings.fontColor,
    fontWeight: settings.fontWeight,
    fontStyle: settings.fontStyle,
    textAlign: settings.textAlign as any,
    textTransform: settings.textTransform as any,
    lineHeight: settings.lineHeight,
    letterSpacing: `${settings.letterSpacing}px`,
    maxWidth: `${settings.maxWidth}px`,
    padding: `${settings.backgroundPadding}px`,
    borderRadius: `${settings.backgroundRadius}px`,
    backgroundColor: settings.backgroundColor === 'transparent' 
      ? 'transparent' 
      : `${settings.backgroundColor}${Math.round(settings.backgroundOpacity * 255).toString(16).padStart(2, '0')}`,
    WebkitTextStroke: settings.outlineWidth > 0 
      ? `${settings.outlineWidth}px ${settings.outlineColor}` 
      : undefined,
    textShadow: settings.shadowBlur > 0 
      ? `${settings.shadowX}px ${settings.shadowY}px ${settings.shadowBlur}px ${settings.shadowColor}`
      : undefined,
    ...getPositionStyles(),
  };

  return (
    <div className={cn("relative w-full aspect-video bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-lg overflow-hidden", className)}>
      {/* Mock video background */}
      <div className="absolute inset-0 opacity-20">
        <div className="w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-600 via-slate-800 to-slate-900" />
      </div>
      
      {/* Subtitle text */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          style={subtitleStyles}
          className={cn(
            "font-bold leading-tight inline-block",
            settings.animation === 'fade' && "animate-in fade-in",
            settings.animation === 'slide-up' && "animate-in slide-in-from-bottom-4",
            settings.animation === 'slide-down' && "animate-in slide-in-from-top-4",
            settings.animation === 'zoom' && "animate-in zoom-in-50",
            settings.animation === 'bounce' && "animate-bounce"
          )}
        >
          The future is here
        </div>
      </div>

      {/* Corner label */}
      <div className="absolute top-2 left-2 text-xs text-white/50 bg-black/30 px-2 py-1 rounded">
        Live Preview
      </div>
    </div>
  );
}
