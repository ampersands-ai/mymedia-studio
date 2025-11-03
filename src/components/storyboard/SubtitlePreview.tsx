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

  const renderSubtitleByStyle = () => {
    const baseText = settings.allCaps ? "THE FUTURE IS HERE" : "The future is here";
    const words = baseText.split(' ');
    
    switch (settings.style) {
      case 'classic':
        return (
          <div style={subtitleStyles} className="inline-flex gap-1">
            <span style={{ color: settings.lineColor }}>The future is </span>
            <span style={{ color: settings.wordColor, fontWeight: 'bold' }}>here</span>
          </div>
        );
      
      case 'classic-progressive':
        return (
          <div style={subtitleStyles}>
            {baseText}
          </div>
        );
      
      case 'classic-one-word':
        return (
          <div style={subtitleStyles}>
            here
          </div>
        );
      
      case 'boxed-word':
        return (
          <div 
            className="flex gap-2 justify-center flex-wrap"
            style={{
              ...getPositionStyles(),
              position: 'absolute',
            }}
          >
            {words.map((word, idx) => (
              <div 
                key={idx}
                style={{
                  fontFamily: settings.fontFamily,
                  fontSize: `${settings.fontSize}px`,
                  color: settings.lineColor,
                  fontWeight: settings.fontWeight,
                  backgroundColor: settings.boxColor,
                  padding: '8px 16px',
                  borderRadius: '8px',
                }}
              >
                {word}
              </div>
            ))}
          </div>
        );
      
      case 'boxed-line':
        return (
          <div style={{
            ...subtitleStyles,
            backgroundColor: settings.boxColor,
            padding: `${settings.backgroundPadding}px`,
            borderRadius: `${settings.backgroundRadius}px`,
          }}>
            {baseText}
          </div>
        );
      
      default:
        return <div style={subtitleStyles}>{baseText}</div>;
    }
  };

  return (
    <div className={cn("relative w-full aspect-video bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-lg overflow-hidden", className)}>
      {/* Mock video background */}
      <div className="absolute inset-0 opacity-20">
        <div className="w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-600 via-slate-800 to-slate-900" />
      </div>
      
      {/* Active Screen Overlay - shows safe area */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 border-2 border-white/20 rounded-lg" />
        <div className="absolute inset-[5%] border border-dashed border-yellow-500/40 rounded-lg">
          <div className="absolute top-1 left-1 text-[10px] text-yellow-500/60 bg-black/30 px-1.5 py-0.5 rounded">
            Safe Area
          </div>
        </div>
      </div>
      
      {/* Subtitle rendering based on style */}
      {renderSubtitleByStyle()}

      {/* Corner label */}
      <div className="absolute top-2 left-2 text-xs text-white/50 bg-black/30 px-2 py-1 rounded z-10">
        Live Preview
      </div>
    </div>
  );
}
