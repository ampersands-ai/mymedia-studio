// Type definitions for Faceless Video Creator
// Completely isolated from existing generation types

export interface CaptionStyle {
  position: 'top' | 'center' | 'bottom';
  animation: 'fade' | 'zoom' | 'slide' | 'bounce';
  fontSize: number;
  fontWeight: 'normal' | 'bold' | 'black';
  fontFamily: string;
  textColor: string;
  backgroundColor: string;
  strokeColor?: string;
  strokeWidth?: number;
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
  error_details?: any;
  created_at: string;
  completed_at?: string;
  updated_at: string;
  aspect_ratio?: string;
  caption_style?: CaptionStyle | any; // Allow Json type from DB
  custom_background_video?: string;
  background_video_thumbnail?: string;
  ai_caption?: string;
  ai_hashtags?: string[];
  caption_generated_at?: string;
}

export interface VideoAssets {
  script: string;
  voiceoverUrl: string;
  backgroundVideoUrl: string;
}
