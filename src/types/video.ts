// Type definitions for Faceless Video Creator
// Completely isolated from existing generation types

export type MediaType = 'image' | 'video' | 'animated';

export interface CaptionStyle {
  position: 'top' | 'center' | 'bottom';
  animation: 'fade' | 'zoom' | 'slide' | 'bounce';
  fontSize: number;
  fontWeight: 'normal' | 'bold' | 'black';
  fontFamily: string;
  fontUrl?: string;
  textColor: string;
  backgroundColor: string;
  backgroundOpacity?: number;
  backgroundPadding?: number;
  backgroundBorderRadius?: number;
  lineHeight?: number;
  offsetY?: number;
  horizontalAlignment?: 'left' | 'center' | 'right';
  verticalAlignment?: 'top' | 'center' | 'bottom';
  strokeColor?: string;
  strokeWidth?: number;
  shadowColor?: string;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  shadowBlur?: number;
}

export interface VideoJobInput {
  topic: string;
  duration: number;
  style?: 'modern' | 'tech' | 'educational' | 'dramatic';
  voice_id?: string;
  voice_name?: string;
  aspect_ratio?: '16:9' | '9:16' | '4:5' | '1:1';
  background_video_url?: string;
  background_video_thumbnail?: string;
  background_media_type?: 'video' | 'image';
  caption_style?: CaptionStyle;
}

export interface VideoJob {
  id: string;
  user_id: string;
  status: 'pending' | 'generating_script' | 'awaiting_script_approval' | 'generating_voice' | 'awaiting_voice_approval' | 'fetching_video' | 'assembling' | 'completed' | 'failed';
  topic: string;
  duration: number;
  style: string;
  voice_id: string;
  voice_name?: string;
  script?: string;
  voiceover_url?: string;
  background_video_url?: string;
  final_video_url?: string;
  shotstack_render_id?: string;
  renderer: string;
  cost_tokens: number;
  error_message?: string;
  error_details?: Record<string, unknown>;
  created_at: string;
  completed_at?: string;
  updated_at: string;
  aspect_ratio?: string;
  caption_style?: CaptionStyle | Record<string, unknown>; // Allow Json type from DB
  custom_background_video?: string;
  background_video_thumbnail?: string;
  ai_caption?: string;
  ai_hashtags?: string[];
  caption_generated_at?: string;
  actual_audio_duration?: number; // Actual voiceover duration in seconds
}

export interface VideoAssets {
  script: string;
  voiceoverUrl: string;
  backgroundVideoUrl: string;
}

export interface StoryboardInput {
  topic: string;
  duration: number;
  style: string;
  tone: string;
  voiceID: string;
  voiceName: string;
  mediaType?: MediaType;
  backgroundMusicUrl?: string;
  backgroundMusicVolume?: number;
  customWidth?: number;
  customHeight?: number;
  subtitleLanguage?: string;
  subtitleModel?: string;
  subtitleStyle?: string;
  subtitleFontFamily?: string;
  subtitlePosition?: string;
  subtitleFontSize?: number;
  subtitleAllCaps?: boolean;
  subtitleBoxColor?: string;
  subtitleLineColor?: string;
  subtitleWordColor?: string;
  subtitleOutlineColor?: string;
  subtitleOutlineWidth?: number;
  subtitleShadowColor?: string;
  subtitleShadowOffset?: number;
  subtitleMaxWordsPerLine?: number;
}
