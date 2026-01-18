import { useState, useRef, useCallback, useEffect } from 'react';
import { Play, Pause, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface VoicePreviewPlayerProps {
  voiceId: string;
  voiceName: string;
  hasPreview?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

// Cache for signed URLs to avoid re-fetching
const urlCache = new Map<string, { url: string; expiry: number }>();

export function VoicePreviewPlayer({
  voiceId,
  voiceName,
  hasPreview = true,
  size = 'md',
  className,
}: VoicePreviewPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const getPreviewUrl = useCallback(async (): Promise<string | null> => {
    // Check cache first
    const cached = urlCache.get(voiceId);
    if (cached && cached.expiry > Date.now()) {
      return cached.url;
    }

    try {
      // Try Supabase storage first (cached previews)
      const { data: signedData, error: signedError } = await supabase.storage
        .from('voice-previews')
        .createSignedUrl(`${voiceId}.mp3`, 3600); // 1 hour

      if (!signedError && signedData?.signedUrl) {
        // Cache the URL
        urlCache.set(voiceId, {
          url: signedData.signedUrl,
          expiry: Date.now() + 3500000, // Cache for ~58 minutes
        });
        return signedData.signedUrl;
      }

      // Fallback: ElevenLabs direct preview requires API proxy due to CORS
      // For now, return null and show "no preview" state
      console.log(`[VoicePreview] No cached preview for ${voiceName}, ElevenLabs preview may require API proxy`);
      
      return null;
    } catch (err) {
      console.error('[VoicePreview] Error getting preview URL:', err);
      return null;
    }
  }, [voiceId, voiceName]);

  const handlePlay = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (!hasPreview) return;

    // If already playing, stop
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      return;
    }

    setIsLoading(true);
    setError(false);

    try {
      const url = await getPreviewUrl();
      
      if (!url) {
        setError(true);
        setIsLoading(false);
        return;
      }

      // Create or reuse audio element
      if (!audioRef.current) {
        audioRef.current = new Audio();
        audioRef.current.onended = () => setIsPlaying(false);
        audioRef.current.onerror = () => {
          setIsPlaying(false);
          setError(true);
        };
      }

      audioRef.current.src = url;
      await audioRef.current.play();
      setIsPlaying(true);
    } catch (err) {
      console.error('[VoicePreview] Playback error:', err);
      setError(true);
    } finally {
      setIsLoading(false);
    }
  }, [hasPreview, isPlaying, getPreviewUrl]);

  if (!hasPreview) {
    return null;
  }

  const isSmall = size === 'sm';

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handlePlay}
      disabled={isLoading || error}
      className={cn(
        'shrink-0 rounded-full',
        isSmall ? 'h-7 w-7' : 'h-8 w-8',
        'hover:bg-primary-orange/20 hover:text-primary-orange',
        error && 'opacity-50 cursor-not-allowed',
        className
      )}
      title={error ? 'Preview unavailable' : isPlaying ? 'Stop' : 'Play preview'}
    >
      {isLoading ? (
        <Loader2 className={cn('animate-spin', isSmall ? 'h-3 w-3' : 'h-4 w-4')} />
      ) : isPlaying ? (
        <Pause className={isSmall ? 'h-3 w-3' : 'h-4 w-4'} />
      ) : (
        <Play className={isSmall ? 'h-3 w-3' : 'h-4 w-4'} />
      )}
    </Button>
  );
}
