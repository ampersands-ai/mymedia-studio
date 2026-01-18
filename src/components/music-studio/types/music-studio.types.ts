// Music Studio TypeScript Definitions

export type MusicStudioView = 
  | 'home' 
  | 'create' 
  | 'library' 
  | 'discover' 
  | 'charts' 
  | 'favorites' 
  | 'settings';

export type CreateTab = 
  | 'song' 
  | 'voice' 
  | 'tts' 
  | 'sfx' 
  | 'stems';

export type Genre = 
  | 'pop' 
  | 'rock' 
  | 'hip-hop' 
  | 'r&b' 
  | 'country' 
  | 'electronic' 
  | 'jazz' 
  | 'classical' 
  | 'lo-fi' 
  | 'ambient' 
  | 'metal' 
  | 'reggae' 
  | 'latin' 
  | 'k-pop' 
  | 'indie';

export type Mood = 
  | 'happy' 
  | 'sad' 
  | 'energetic' 
  | 'chill' 
  | 'dark' 
  | 'romantic' 
  | 'epic' 
  | 'mysterious';

export type LibraryTab = 
  | 'all' 
  | 'songs' 
  | 'voiceovers' 
  | 'sfx' 
  | 'stems' 
  | 'drafts';

export type RepeatMode = 'off' | 'all' | 'one';

export interface AudioTrack {
  id: string;
  title: string;
  artist?: string;
  duration: number;
  artworkUrl?: string;
  audioUrl: string;
  storagePath?: string;
  genre?: Genre;
  mood?: Mood;
  type: 'song' | 'voiceover' | 'sfx' | 'stem';
  createdAt: string;
  isLiked?: boolean;
}

export interface PlayerState {
  currentTrack: AudioTrack | null;
  isPlaying: boolean;
  progress: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  repeatMode: RepeatMode;
  isShuffled: boolean;
  isFullScreen: boolean;
}

export interface SongGenerationParams {
  prompt: string;
  lyrics?: string;
  genre?: Genre;
  mood?: Mood;
  duration: 30 | 60 | 120 | 240;
  instrumental: boolean;
  includeVocals: boolean;
  voiceGender?: 'male' | 'female' | 'duet';
}

export interface TTSParams {
  text: string;
  voiceId: string;
  speed?: number;
  emotion?: 'neutral' | 'happy' | 'sad' | 'excited' | 'serious';
}

export interface SFXParams {
  prompt: string;
  category?: string;
  duration: 1 | 3 | 5 | 10;
}

export interface NavItem {
  id: MusicStudioView;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export interface GenreOption {
  value: Genre;
  label: string;
  icon?: string;
}

export interface MoodOption {
  value: Mood;
  label: string;
  color: string;
}

// Mock data for featured content
export interface FeaturedPlaylist {
  id: string;
  name: string;
  description?: string;
  trackCount: number;
  coverUrls: string[];
}

export interface TrendingTrack extends AudioTrack {
  playCount: number;
  rank: number;
}
