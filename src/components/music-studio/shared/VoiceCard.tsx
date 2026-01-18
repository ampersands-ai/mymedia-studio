import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Check, User, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { VoiceData } from '@/lib/voice-mapping';

interface VoiceCardProps {
  voice: VoiceData;
  isSelected: boolean;
  onSelect: () => void;
  size?: 'sm' | 'md';
}

export function VoiceCard({ voice, isSelected, onSelect, size = 'md' }: VoiceCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const handlePreview = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!voice.hasPreview) return;
    
    // If already playing, stop
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      return;
    }

    setIsLoading(true);

    try {
      // ElevenLabs preview URL - this may have CORS issues in browser
      // In production, you'd proxy this through your backend
      const previewUrl = (voice as any).preview_url || `https://api.elevenlabs.io/v1/voices/${voice.voice_id}/preview`;
      
      const audio = new Audio(previewUrl);
      audioRef.current = audio;
      
      audio.onended = () => {
        setIsPlaying(false);
      };
      
      audio.onerror = () => {
        console.warn('Voice preview failed to load');
        setIsPlaying(false);
        setIsLoading(false);
      };

      audio.oncanplaythrough = () => {
        setIsLoading(false);
      };

      await audio.play();
      setIsPlaying(true);
      setIsLoading(false);
    } catch (err) {
      console.error('Error playing voice preview:', err);
      setIsPlaying(false);
      setIsLoading(false);
    }
  };

  const isSmall = size === 'sm';

  return (
    <button
      onClick={onSelect}
      className={cn(
        "relative group text-left rounded-lg border-2 transition-all duration-200",
        "bg-card hover:bg-accent/50",
        isSelected 
          ? "border-primary-orange shadow-[2px_2px_0px_0px_hsl(var(--primary-orange))]" 
          : "border-border hover:border-primary-orange/50",
        isSmall ? "p-3" : "p-4"
      )}
    >
      {/* Selected indicator */}
      {isSelected && (
        <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-primary-orange flex items-center justify-center">
          <Check className="h-3 w-3 text-black" />
        </div>
      )}

      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className={cn(
          "rounded-full bg-muted flex items-center justify-center shrink-0",
          isSmall ? "h-8 w-8" : "h-10 w-10"
        )}>
          <User className={cn("text-muted-foreground", isSmall ? "h-4 w-4" : "h-5 w-5")} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h4 className={cn(
            "font-semibold text-foreground truncate",
            isSmall ? "text-sm" : "text-base"
          )}>
            {voice.name}
          </h4>
          <div className="flex items-center gap-2 mt-1">
            <span className={cn(
              "px-2 py-0.5 rounded-full text-xs font-medium",
              voice.gender === 'female' 
                ? "bg-accent-pink/20 text-accent-pink" 
                : voice.gender === 'male'
                ? "bg-accent-purple/20 text-accent-purple"
                : "bg-muted text-muted-foreground"
            )}>
              {voice.gender}
            </span>
            <span className="text-xs text-muted-foreground">{voice.accent}</span>
          </div>
          {!isSmall && voice.description && (
            <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">
              {voice.description}
            </p>
          )}
        </div>

        {/* Preview button */}
        {voice.hasPreview && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePreview}
            disabled={isLoading}
            className={cn(
              "shrink-0 rounded-full",
              isSmall ? "h-7 w-7" : "h-8 w-8",
              "hover:bg-primary-orange/20 hover:text-primary-orange"
            )}
          >
            {isLoading ? (
              <Loader2 className={cn("animate-spin", isSmall ? "h-3 w-3" : "h-4 w-4")} />
            ) : isPlaying ? (
              <Pause className={isSmall ? "h-3 w-3" : "h-4 w-4"} />
            ) : (
              <Play className={isSmall ? "h-3 w-3" : "h-4 w-4"} />
            )}
          </Button>
        )}
      </div>
    </button>
  );
}
