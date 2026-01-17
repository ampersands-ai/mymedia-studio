import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import type { AudioTrack, PlayerState, RepeatMode } from '../types/audio-studio.types';

interface AudioPlayerContextType extends PlayerState {
  // Playback controls
  play: (track?: AudioTrack) => void;
  pause: () => void;
  toggle: () => void;
  next: () => void;
  previous: () => void;
  seek: (time: number) => void;
  
  // Volume controls
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  
  // Mode controls
  setRepeatMode: (mode: RepeatMode) => void;
  toggleShuffle: () => void;
  toggleFullScreen: () => void;
  
  // Queue management
  queue: AudioTrack[];
  addToQueue: (tracks: AudioTrack[]) => void;
  removeFromQueue: (id: string) => void;
  clearQueue: () => void;
  playFromQueue: (index: number) => void;
}

const defaultState: PlayerState = {
  currentTrack: null,
  isPlaying: false,
  progress: 0,
  duration: 0,
  volume: 0.8,
  isMuted: false,
  repeatMode: 'off',
  isShuffled: false,
  isFullScreen: false,
};

const AudioPlayerContext = createContext<AudioPlayerContextType | null>(null);

export function AudioPlayerProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PlayerState>(defaultState);
  const [queue, setQueue] = useState<AudioTrack[]>([]);
  const [queueIndex, setQueueIndex] = useState(-1);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize audio element
  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.volume = state.volume;
    
    const audio = audioRef.current;
    
    audio.addEventListener('ended', handleTrackEnd);
    audio.addEventListener('loadedmetadata', () => {
      setState(prev => ({ ...prev, duration: audio.duration }));
    });
    audio.addEventListener('error', () => {
      console.error('Audio playback error');
      setState(prev => ({ ...prev, isPlaying: false }));
    });
    
    return () => {
      audio.removeEventListener('ended', handleTrackEnd);
      audio.pause();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Update progress
  useEffect(() => {
    if (state.isPlaying && audioRef.current) {
      intervalRef.current = setInterval(() => {
        if (audioRef.current) {
          setState(prev => ({ ...prev, progress: audioRef.current!.currentTime }));
        }
      }, 100);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [state.isPlaying]);

  const handleTrackEnd = useCallback(() => {
    if (state.repeatMode === 'one') {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      }
    } else if (queueIndex < queue.length - 1 || state.repeatMode === 'all') {
      const nextIndex = state.repeatMode === 'all' && queueIndex >= queue.length - 1 
        ? 0 
        : queueIndex + 1;
      if (queue[nextIndex]) {
        playTrack(queue[nextIndex], nextIndex);
      }
    } else {
      setState(prev => ({ ...prev, isPlaying: false, progress: 0 }));
    }
  }, [state.repeatMode, queueIndex, queue]);

  const playTrack = useCallback((track: AudioTrack, index?: number) => {
    if (!audioRef.current) return;
    
    if (track.audioUrl) {
      audioRef.current.src = track.audioUrl;
      audioRef.current.play().catch(console.error);
    }
    
    setState(prev => ({
      ...prev,
      currentTrack: track,
      isPlaying: !!track.audioUrl,
      progress: 0,
      duration: track.duration,
    }));
    
    if (typeof index === 'number') {
      setQueueIndex(index);
    }
  }, []);

  const play = useCallback((track?: AudioTrack) => {
    if (track) {
      // Add to queue if not already there
      const existingIndex = queue.findIndex(t => t.id === track.id);
      if (existingIndex === -1) {
        setQueue(prev => [...prev, track]);
        playTrack(track, queue.length);
      } else {
        playTrack(track, existingIndex);
      }
    } else if (audioRef.current && state.currentTrack) {
      audioRef.current.play().catch(console.error);
      setState(prev => ({ ...prev, isPlaying: true }));
    }
  }, [queue, state.currentTrack, playTrack]);

  const pause = useCallback(() => {
    audioRef.current?.pause();
    setState(prev => ({ ...prev, isPlaying: false }));
  }, []);

  const toggle = useCallback(() => {
    if (state.isPlaying) {
      pause();
    } else {
      play();
    }
  }, [state.isPlaying, play, pause]);

  const next = useCallback(() => {
    if (queue.length === 0) return;
    
    let nextIndex: number;
    if (state.isShuffled) {
      nextIndex = Math.floor(Math.random() * queue.length);
    } else {
      nextIndex = queueIndex + 1;
      if (nextIndex >= queue.length) {
        nextIndex = state.repeatMode === 'all' ? 0 : queue.length - 1;
      }
    }
    
    if (queue[nextIndex]) {
      playTrack(queue[nextIndex], nextIndex);
    }
  }, [queue, queueIndex, state.isShuffled, state.repeatMode, playTrack]);

  const previous = useCallback(() => {
    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      return;
    }
    
    if (queue.length === 0) return;
    
    let prevIndex = queueIndex - 1;
    if (prevIndex < 0) {
      prevIndex = state.repeatMode === 'all' ? queue.length - 1 : 0;
    }
    
    if (queue[prevIndex]) {
      playTrack(queue[prevIndex], prevIndex);
    }
  }, [queue, queueIndex, state.repeatMode, playTrack]);

  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setState(prev => ({ ...prev, progress: time }));
    }
  }, []);

  const setVolume = useCallback((volume: number) => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
    setState(prev => ({ ...prev, volume, isMuted: volume === 0 }));
  }, []);

  const toggleMute = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.muted = !state.isMuted;
    }
    setState(prev => ({ ...prev, isMuted: !prev.isMuted }));
  }, [state.isMuted]);

  const setRepeatMode = useCallback((mode: RepeatMode) => {
    setState(prev => ({ ...prev, repeatMode: mode }));
  }, []);

  const toggleShuffle = useCallback(() => {
    setState(prev => ({ ...prev, isShuffled: !prev.isShuffled }));
  }, []);

  const toggleFullScreen = useCallback(() => {
    setState(prev => ({ ...prev, isFullScreen: !prev.isFullScreen }));
  }, []);

  const addToQueue = useCallback((tracks: AudioTrack[]) => {
    setQueue(prev => [...prev, ...tracks]);
  }, []);

  const removeFromQueue = useCallback((id: string) => {
    setQueue(prev => prev.filter(t => t.id !== id));
  }, []);

  const clearQueue = useCallback(() => {
    setQueue([]);
    setQueueIndex(-1);
  }, []);

  const playFromQueue = useCallback((index: number) => {
    if (queue[index]) {
      playTrack(queue[index], index);
    }
  }, [queue, playTrack]);

  const value: AudioPlayerContextType = {
    ...state,
    queue,
    play,
    pause,
    toggle,
    next,
    previous,
    seek,
    setVolume,
    toggleMute,
    setRepeatMode,
    toggleShuffle,
    toggleFullScreen,
    addToQueue,
    removeFromQueue,
    clearQueue,
    playFromQueue,
  };

  return (
    <AudioPlayerContext.Provider value={value}>
      {children}
    </AudioPlayerContext.Provider>
  );
}

export function useAudioPlayer() {
  const context = useContext(AudioPlayerContext);
  if (!context) {
    throw new Error('useAudioPlayer must be used within AudioPlayerProvider');
  }
  return context;
}
