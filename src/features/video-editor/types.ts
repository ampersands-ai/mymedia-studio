// Video Editor Types - Completely isolated from existing video generation types

export type MediaType = 'video' | 'image' | 'audio';

export interface MediaAsset {
  id: string;
  type: MediaType;
  name: string;
  url: string;
  thumbnailUrl?: string;
  duration?: number; // in seconds, for video/audio
  width?: number;
  height?: number;
  size: number; // bytes
  mimeType: string;
  storagePath?: string; // for cleanup reference
  uploadedAt: string;
}

export interface Clip {
  id: string;
  assetId: string;
  asset?: MediaAsset;
  duration: number; // in seconds
  trimStart: number; // trim from start in seconds
  transitionIn?: TransitionType;
  transitionOut?: TransitionType;
  transitionDuration: number; // in seconds
  volume: number; // 0-1
  fit: 'cover' | 'contain' | 'crop' | 'none';
  position: { x: number; y: number }; // 0-1 relative position
  scale: number; // 1 = 100%
}

export type TransitionType = 
  | 'none'
  | 'fade'
  | 'fadeToBlack'
  | 'fadeToWhite'
  | 'slideLeft'
  | 'slideRight'
  | 'slideUp'
  | 'slideDown'
  | 'zoom'
  | 'wipeLeft'
  | 'wipeRight';

export interface AudioTrack {
  id: string;
  assetId: string;
  asset?: MediaAsset;
  volume: number; // 0-1
  fadeIn: boolean;
  fadeOut: boolean;
  fadeInDuration: number; // seconds
  fadeOutDuration: number; // seconds
  trimStart: number; // seconds
  trimEnd?: number; // seconds, undefined = until end
  loop: boolean;
}

export type SubtitleMode = 'none' | 'auto' | 'upload';

export interface SubtitleConfig {
  mode: SubtitleMode;
  fontSize: number; // 12-72
  fontColor: string; // hex
  backgroundColor: string; // hex
  showBackground: boolean;
  position: 'top' | 'center' | 'bottom';
  srtFile?: File;
  srtContent?: string;
}

export type AspectRatio = '16:9' | '9:16' | '1:1' | '4:5' | '21:9';

export interface OutputSettings {
  aspectRatio: AspectRatio;
  format: 'mp4'; // Only MP4 for MVP
  backgroundColor: string; // hex
  fps: 25 | 30 | 60;
  quality: 'sd' | 'hd' | '4k';
}

export type RenderStatus = 
  | 'idle'
  | 'uploading'
  | 'queued'
  | 'fetching'
  | 'rendering'
  | 'saving'
  | 'done'
  | 'failed';

export interface VideoEditorJob {
  id: string;
  user_id: string;
  status: RenderStatus;
  clips: Clip[];
  audio_track: AudioTrack | null;
  subtitle_config: SubtitleConfig | null;
  output_settings: OutputSettings;
  shotstack_render_id: string | null;
  final_video_url: string | null;
  total_duration: number;
  cost_credits: number;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

// Store state interface
export interface VideoEditorState {
  // Media assets
  assets: MediaAsset[];
  
  // Clip sequence
  clips: Clip[];
  
  // Background audio
  audioTrack: AudioTrack | null;
  
  // Subtitles
  subtitleConfig: SubtitleConfig;
  
  // Output settings
  outputSettings: OutputSettings;
  
  // Render state
  currentJobId: string | null;
  renderStatus: RenderStatus;
  renderProgress: number; // 0-100
  finalVideoUrl: string | null;
  errorMessage: string | null;
  
  // UI state
  selectedClipId: string | null;
  isUploading: boolean;
  uploadProgress: number;
}

// Shotstack payload types for building render requests
export interface ShotstackClip {
  asset: {
    type: 'video' | 'image' | 'audio';
    src: string;
    volume?: number;
    trim?: number;
    crop?: {
      top: number;
      bottom: number;
      left: number;
      right: number;
    };
  };
  start: number;
  length: number;
  transition?: {
    in?: string;
    out?: string;
  };
  fit?: 'cover' | 'contain' | 'crop' | 'none';
  position?: 'center' | 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';
  scale?: number;
}

export interface ShotstackTrack {
  clips: ShotstackClip[];
}

export interface ShotstackTimeline {
  tracks: ShotstackTrack[];
  background?: string;
  soundtrack?: {
    src: string;
    effect?: 'fadeIn' | 'fadeOut' | 'fadeInFadeOut';
    volume?: number;
  };
}

export interface ShotstackPayload {
  timeline: ShotstackTimeline;
  output: {
    format: 'mp4';
    resolution: 'sd' | 'hd' | '4k';
    aspectRatio: string;
    fps: number;
    size?: {
      width: number;
      height: number;
    };
  };
}

// Credit calculation constants
export const CREDITS_PER_SECOND = 0.5;
export const MAX_FILE_SIZE_MB = 500;
export const MAX_FILES = 10;
export const MAX_VIDEO_DURATION_MINUTES = 10;

// Aspect ratio dimensions
export const ASPECT_RATIO_DIMENSIONS: Record<AspectRatio, { width: number; height: number }> = {
  '16:9': { width: 1920, height: 1080 },
  '9:16': { width: 1080, height: 1920 },
  '1:1': { width: 1080, height: 1080 },
  '4:5': { width: 1080, height: 1350 },
  '21:9': { width: 2560, height: 1080 },
};
