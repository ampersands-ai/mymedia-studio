import type { SubtitleSettings } from "@/types/subtitle";
import { cn } from "@/lib/utils";

interface SubtitlePreviewProps {
  settings: SubtitleSettings;
  className?: string;
}

export function SubtitlePreview({ settings, className }: SubtitlePreviewProps) {
  const getPositionStyles = () => {
    const baseStyles: React.CSSProperties = {
      transform: `translate(${settings.x}px, ${settings.y}px)`,
    };

    switch (settings.position) {
      case "top-left":
        return { ...baseStyles, top: "10%", left: "10%", transform: `translate(${settings.x}px, ${settings.y}px)` };
      case "top-center":
        return { ...baseStyles, top: "10%", left: "50%", transform: `translate(calc(-50% + ${settings.x}px), ${settings.y}px)` };
      case "top-right":
        return { ...baseStyles, top: "10%", right: "10%", transform: `translate(${settings.x}px, ${settings.y}px)` };
      case "mid-left-center":
        return { ...baseStyles, top: "50%", left: "10%", transform: `translate(${settings.x}px, calc(-50% + ${settings.y}px))` };
      case "mid-center":
        return { ...baseStyles, top: "50%", left: "50%", transform: `translate(calc(-50% + ${settings.x}px), calc(-50% + ${settings.y}px))` };
      case "mid-right-center":
        return { ...baseStyles, top: "50%", right: "10%", transform: `translate(${settings.x}px, calc(-50% + ${settings.y}px))` };
      case "mid-bottom-center":
        return { ...baseStyles, bottom: "25%", left: "50%", transform: `translate(calc(-50% + ${settings.x}px), ${settings.y}px)` };
      case "bottom-left":
        return { ...baseStyles, bottom: "10%", left: "10%", transform: `translate(${settings.x}px, ${settings.y}px)` };
      case "bottom-right":
        return { ...baseStyles, bottom: "10%", right: "10%", transform: `translate(${settings.x}px, ${settings.y}px)` };
      case "bottom-center":
      default:
        return { ...baseStyles, bottom: "10%", left: "50%", transform: `translate(calc(-50% + ${settings.x}px), ${settings.y}px)` };
    }
  };

  const subtitleStyles: React.CSSProperties = {
    position: 'absolute',
    fontFamily: settings.fontFamily,
    fontSize: `${settings.fontSize}px`,
    color: settings.lineColor,
    textAlign: 'center',
    WebkitTextStroke: settings.outlineWidth > 0 
      ? `${settings.outlineWidth}px ${settings.outlineColor}` 
      : undefined,
    textShadow: settings.shadowOffset > 0 
      ? `0 ${settings.shadowOffset}px 0 rgba(0,0,0,0.5)`
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
              ...subtitleStyles,
              maxWidth: '90%',
            }}
          >
            {words.map((word, idx) => (
              <div 
                key={idx}
                style={{
                  fontFamily: settings.fontFamily,
                  fontSize: `${settings.fontSize}px`,
                  color: settings.lineColor,
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
            padding: '16px 24px',
            borderRadius: '8px',
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
