export interface AnimationJob {
  id: string;
  user_id: string;
  script: string;
  audio_url?: string;
  duration: number;
  style: "stick-figure" | "illustrated" | "minimal" | "icon-based";
  caption_style: string;
  background_type: string;
  background_url?: string;
  overlay_type: string;
  color_scheme: {
    primary: string;
    secondary: string;
    background: string;
    accent: string;
  };
  status: AnimationStatus;
  scenes?: Scene[];
  video_config?: Record<string, unknown>;
  video_url?: string;
  webhook_url?: string;
  callback_email?: string;
  error_message?: string;
  render_progress?: number;
  llm_cost?: number;
  render_cost?: number;
  retry_count?: number;
  created_at: string;
  updated_at?: string;
  render_started_at?: string;
  completed_at?: string;
}

export type AnimationStatus =
  | "queued"
  | "analyzing"
  | "building_config"
  | "pending_render"
  | "rendering"
  | "completed"
  | "failed";

export interface Scene {
  id: number;
  name: string;
  startTime: number;
  endTime: number;
  title?: string;
  content?: string;
  icon?: string;
  visualConcepts?: string[];
  emotion?: string;
}

export interface CreateAnimationRequest {
  script: string;
  audioUrl?: string;
  timestamps?: Array<{ word: string; start: number; end: number }>;
  duration: number;
  style?: "stick-figure" | "illustrated" | "minimal" | "icon-based";
  captionStyle?: string;
  backgroundType?: "video" | "image" | "animated" | "gradient";
  backgroundUrl?: string;
  backgroundStyle?: string;
  overlayType?: "none" | "explainer" | "icons" | "data-viz";
  colorScheme?: {
    primary: string;
    secondary: string;
    background: string;
    accent: string;
  };
  webhookUrl?: string;
  callbackEmail?: string;
}

export interface AnimationJobResponse {
  jobId: string;
  status: AnimationStatus;
  scenes?: Scene[];
  config?: Record<string, unknown>;
  estimatedCost?: number;
  videoUrl?: string;
  message?: string;
  error?: string;
}
