/**
 * Storyboard Types
 * Consolidated type definitions for storyboard functionality
 */

export interface StoryboardLocalState {
  showScenes: boolean;
  showSubtitleCustomizer: boolean;
  showRerenderDialog: boolean;
  renderStatusMessage: string;
  introVoiceOverText: string;
  introImagePrompt: string;
  rerenderCost: number;
  existingVideoUrl: string;
}

export interface RenderCostBreakdown {
  initialEstimate: number;
  actualCost: number;
  costDifference: number;
  charDifference: number;
}

export interface Scene {
  id: string;
  order_number: number;
  voice_over_text: string;
  image_prompt: string;
  image_preview_url?: string;
  video_url?: string;
  is_edited: boolean;
  storyboard_id: string;
  created_at: string;
  updated_at: string;
}

export interface Storyboard {
  id: string;
  user_id: string;
  topic: string;
  duration: number;
  style: string;
  tone: string;
  voice_id: string;
  voice_name: string;
  intro_image_prompt: string;
  intro_voiceover_text: string;
  intro_image_preview_url?: string;
  status: 'draft' | 'rendering' | 'complete' | 'failed';
  video_url?: string;
  video_storage_path?: string;
  render_job_id?: string;
  tokens_cost: number;
  estimated_render_cost: number;
  video_quality?: string;
  aspect_ratio?: string | null;
  subtitle_settings?: Record<string, any>;
  music_settings?: Record<string, any>;
  image_animation_settings?: {
    zoom?: number;
    position?: string;
  };
  created_at: string;
  updated_at: string;
  completed_at?: string;
}
