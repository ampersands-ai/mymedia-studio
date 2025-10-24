// Type definitions for Faceless Video Creator
// Completely isolated from existing generation types

export interface VideoJobInput {
  topic: string;
  duration: number;
  style?: 'modern' | 'tech' | 'educational' | 'dramatic';
  voice_id?: string;
  voice_name?: string;
}

export interface VideoJob {
  id: string;
  user_id: string;
  status: 'pending' | 'generating_script' | 'generating_voice' | 'awaiting_approval' | 'fetching_video' | 'assembling' | 'completed' | 'failed';
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
}

export interface VideoAssets {
  script: string;
  voiceoverUrl: string;
  backgroundVideoUrl: string;
}
