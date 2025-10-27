import { useState, useRef, useEffect } from 'react';
import { useInView } from 'react-intersection-observer';

interface OptimizedVideoProps {
  src: string;
  poster?: string;
  hoverFrames?: string[];
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  controls?: boolean;
  className?: string;
  onHoverPlay?: boolean; // Play video on hover
}

export function OptimizedVideo({
  src,
  poster,
  hoverFrames = [],
  autoPlay = false,
  loop = true,
  muted = true,
  controls = false,
  className = '',
  onHoverPlay = false
}: OptimizedVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  
  const { ref, inView } = useInView({
    threshold: 0.25,
    triggerOnce: false
  });

  // Load video when in view
  useEffect(() => {
    if (inView && videoRef.current && !videoRef.current.src) {
      videoRef.current.src = src;
      videoRef.current.load();
    }
  }, [inView, src]);

  // Auto-play when in view
  useEffect(() => {
    if (!videoRef.current || !autoPlay) return;

    if (inView && isLoaded) {
      videoRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(err => {
          console.warn('Autoplay blocked:', err);
        });
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  }, [inView, autoPlay, isLoaded]);

  // Hover frame preview animation
  useEffect(() => {
    if (!isHovering || hoverFrames.length === 0) {
      setCurrentFrame(0);
      return;
    }

    const interval = setInterval(() => {
      setCurrentFrame(prev => (prev + 1) % hoverFrames.length);
    }, 150);

    return () => clearInterval(interval);
  }, [isHovering, hoverFrames]);

  // Hover to play functionality
  useEffect(() => {
    if (!onHoverPlay || !videoRef.current || !isLoaded) return;

    if (isHovering) {
      videoRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(err => console.warn('Hover play blocked:', err));
    } else {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  }, [isHovering, onHoverPlay, isLoaded]);

  const handlePlayPause = () => {
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(err => console.error('Play failed:', err));
    }
  };

  return (
    <div 
      ref={ref}
      className={`relative ${className}`}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Hover frame preview */}
      {isHovering && hoverFrames.length > 0 && (
        <img
          src={hoverFrames[currentFrame]}
          alt="Video preview"
          loading="lazy"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover z-10 pointer-events-none"
        />
      )}

      {/* Loading skeleton */}
      {!isLoaded && !loadError && (
        <div className="absolute inset-0 skeleton">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <svg width="64" height="64" viewBox="0 0 64 64">
              <circle cx="32" cy="32" r="30" fill="rgba(255,255,255,0.9)" />
              <path d="M26 20l20 12-20 12z" fill="hsl(var(--primary))" />
            </svg>
          </div>
        </div>
      )}

      {/* Video element */}
      <video
        ref={videoRef}
        poster={poster}
        loop={loop}
        muted={muted}
        playsInline
        preload="metadata"
        controls={controls}
        onLoadedData={() => setIsLoaded(true)}
        onError={(e) => {
          console.error('Video load error:', e);
          setLoadError(true);
        }}
        className={`w-full h-full object-cover ${isLoaded ? 'block' : 'hidden'}`}
      >
        Your browser doesn't support video playback.
      </video>

      {/* Error fallback */}
      {loadError && poster && (
        <div className="relative">
          <img 
            src={poster}
            alt="Video thumbnail"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <p className="text-white text-sm">Video unavailable</p>
          </div>
        </div>
      )}

      {/* Play/pause button */}
      {!controls && !loadError && isLoaded && (
        <button
          onClick={handlePlayPause}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 transition-opacity"
          style={{ opacity: isPlaying ? 0 : 1 }}
        >
          <svg width="64" height="64" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r="30" fill="rgba(255,255,255,0.9)" />
            <path d="M26 20l20 12-20 12z" fill="hsl(var(--primary))" />
          </svg>
        </button>
      )}
    </div>
  );
}
