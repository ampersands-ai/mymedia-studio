// Mock data for Music Studio Phase 1

import type { AudioTrack, FeaturedPlaylist, TrendingTrack, GenreOption, MoodOption } from '../types/audio-studio.types';

export const GENRES: GenreOption[] = [
  { value: 'pop', label: 'Pop', icon: '🎤' },
  { value: 'rock', label: 'Rock', icon: '🎸' },
  { value: 'hip-hop', label: 'Hip-Hop', icon: '🎧' },
  { value: 'r&b', label: 'R&B', icon: '💜' },
  { value: 'country', label: 'Country', icon: '🤠' },
  { value: 'electronic', label: 'Electronic', icon: '🎹' },
  { value: 'jazz', label: 'Jazz', icon: '🎷' },
  { value: 'classical', label: 'Classical', icon: '🎻' },
  { value: 'lo-fi', label: 'Lo-Fi', icon: '🌙' },
  { value: 'ambient', label: 'Ambient', icon: '🌊' },
  { value: 'metal', label: 'Metal', icon: '🤘' },
  { value: 'reggae', label: 'Reggae', icon: '🌴' },
  { value: 'latin', label: 'Latin', icon: '💃' },
  { value: 'k-pop', label: 'K-Pop', icon: '⭐' },
  { value: 'indie', label: 'Indie', icon: '🎵' },
];

export const MOODS: MoodOption[] = [
  { value: 'happy', label: 'Happy', color: 'hsl(43 94% 56%)' },
  { value: 'sad', label: 'Sad', color: 'hsl(220 70% 50%)' },
  { value: 'energetic', label: 'Energetic', color: 'hsl(28 100% 62%)' },
  { value: 'chill', label: 'Chill', color: 'hsl(180 60% 50%)' },
  { value: 'dark', label: 'Dark', color: 'hsl(270 50% 30%)' },
  { value: 'romantic', label: 'Romantic', color: 'hsl(329 93% 70%)' },
  { value: 'epic', label: 'Epic', color: 'hsl(266 100% 68%)' },
  { value: 'mysterious', label: 'Mysterious', color: 'hsl(280 60% 40%)' },
];

export const DURATIONS = [
  { value: 30, label: '30s' },
  { value: 60, label: '1 min' },
  { value: 120, label: '2 min' },
  { value: 240, label: '4 min' },
] as const;

export const SFX_CATEGORIES = [
  { value: 'nature', label: 'Nature', icon: '🌿' },
  { value: 'urban', label: 'Urban', icon: '🏙️' },
  { value: 'sci-fi', label: 'Sci-Fi', icon: '🚀' },
  { value: 'horror', label: 'Horror', icon: '👻' },
  { value: 'comedy', label: 'Comedy', icon: '😄' },
  { value: 'action', label: 'Action', icon: '💥' },
  { value: 'ambient', label: 'Ambient', icon: '🎐' },
];

export const MOCK_TRACKS: AudioTrack[] = [
  {
    id: '1',
    title: 'Summer Vibes',
    artist: 'AI Studio',
    duration: 180,
    audioUrl: '',
    type: 'song',
    genre: 'pop',
    mood: 'happy',
    createdAt: new Date().toISOString(),
    isLiked: true,
  },
  {
    id: '2',
    title: 'Midnight Dreams',
    artist: 'AI Studio',
    duration: 240,
    audioUrl: '',
    type: 'song',
    genre: 'lo-fi',
    mood: 'chill',
    createdAt: new Date().toISOString(),
    isLiked: false,
  },
  {
    id: '3',
    title: 'Epic Adventure',
    artist: 'AI Studio',
    duration: 300,
    audioUrl: '',
    type: 'song',
    genre: 'electronic',
    mood: 'epic',
    createdAt: new Date().toISOString(),
    isLiked: true,
  },
];

export const MOCK_TRENDING: TrendingTrack[] = [
  { ...MOCK_TRACKS[0], playCount: 15420, rank: 1 },
  { ...MOCK_TRACKS[1], playCount: 12300, rank: 2 },
  { ...MOCK_TRACKS[2], playCount: 9800, rank: 3 },
];

export const MOCK_PLAYLISTS: FeaturedPlaylist[] = [
  {
    id: 'p1',
    name: 'Chill Vibes',
    description: 'Relaxing beats for any mood',
    trackCount: 25,
    coverUrls: [],
  },
  {
    id: 'p2',
    name: 'Workout Energy',
    description: 'High-energy tracks to power your workout',
    trackCount: 30,
    coverUrls: [],
  },
  {
    id: 'p3',
    name: 'Study Focus',
    description: 'Concentration-boosting ambient tracks',
    trackCount: 40,
    coverUrls: [],
  },
  {
    id: 'p4',
    name: 'Party Hits',
    description: 'Get the party started',
    trackCount: 35,
    coverUrls: [],
  },
];

export const QUICK_ACTIONS = [
  {
    id: 'song',
    title: 'Create Song',
    description: 'AI-powered music generation',
    icon: 'Music',
    color: 'primary-orange',
    tab: 'song' as const,
  },
  {
    id: 'voice',
    title: 'Voice Changer',
    description: 'Transform any voice',
    icon: 'Mic',
    color: 'accent-purple',
    tab: 'voice' as const,
  },
  {
    id: 'tts',
    title: 'Text to Speech',
    description: 'Natural TTS voices',
    icon: 'Volume2',
    color: 'accent-pink',
    tab: 'tts' as const,
  },
  {
    id: 'sfx',
    title: 'Sound Effects',
    description: 'Generate SFX',
    icon: 'Zap',
    color: 'primary-yellow',
    tab: 'sfx' as const,
  },
];
