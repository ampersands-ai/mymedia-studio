/**
 * Type definitions for workflow execution display components
 * Eliminates 'any' types in execution progress, results, and preview components
 */

/**
 * Workflow execution progress state
 */
export interface WorkflowExecutionProgress {
  currentStep: number;
  totalSteps: number;
}

/**
 * Workflow execution result
 */
export interface WorkflowExecutionResult {
  url: string;
  credits: number;
}

/**
 * Generation timing information
 */
export interface GenerationTiming {
  startTime: number;
  isComplete: boolean;
  completedAt?: number;
  estimatedTimeSeconds?: number | null;
}

/**
 * Content types supported by generation preview
 */
export type ContentType = 'image' | 'video' | 'audio';

/**
 * Preview display props
 */
export interface PreviewDisplayProps {
  storagePath: string | null;
  contentType: ContentType;
  className?: string;
}

/**
 * Logger metadata for preview operations
 */
export interface PreviewLoggerMetadata {
  component: string;
  file?: string;
  [key: string]: unknown;
  storagePath?: string;
  operation?: 'download' | 'share' | 'playback' | 'thumbnail';
  error?: string;
}

/**
 * Audio player state
 */
export interface AudioPlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  error: boolean;
}

/**
 * Video player state
 */
export interface VideoPlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  muted: boolean;
  error: boolean;
  thumbnailGenerated: boolean;
}

/**
 * Image display state
 */
export interface ImageDisplayState {
  loaded: boolean;
  error: boolean;
  naturalWidth?: number;
  naturalHeight?: number;
}

/**
 * Download options
 */
export interface DownloadOptions {
  filename: string;
  contentType: ContentType;
  storagePath: string;
}

/**
 * Share options
 */
export interface ShareOptions {
  url: string;
  title?: string;
  text?: string;
}

/**
 * Type guard for content type
 */
export function isContentType(value: unknown): value is ContentType {
  return (
    typeof value === 'string' &&
    (value === 'image' || value === 'video' || value === 'audio')
  );
}

/**
 * Type guard for workflow execution progress
 */
export function isWorkflowExecutionProgress(
  value: unknown
): value is WorkflowExecutionProgress {
  if (!value || typeof value !== 'object') return false;
  
  const progress = value as Record<string, unknown>;
  return (
    typeof progress.currentStep === 'number' &&
    typeof progress.totalSteps === 'number' &&
    progress.currentStep >= 0 &&
    progress.totalSteps > 0
  );
}

/**
 * Type guard for workflow execution result
 */
export function isWorkflowExecutionResult(
  value: unknown
): value is WorkflowExecutionResult {
  if (!value || typeof value !== 'object') return false;
  
  const result = value as Record<string, unknown>;
  return (
    typeof result.url === 'string' &&
    typeof result.credits === 'number'
  );
}

/**
 * Creates logger metadata with type safety
 */
export function createPreviewLoggerMetadata(
  metadata: Partial<PreviewLoggerMetadata>
): PreviewLoggerMetadata {
  return {
    component: metadata.component || 'GenerationPreview',
    ...metadata,
  };
}

/**
 * Calculate progress percentage
 */
export function calculateProgressPercentage(
  progress: WorkflowExecutionProgress
): number {
  return Math.round((progress.currentStep / progress.totalSteps) * 100);
}

/**
 * Format elapsed time in seconds to human-readable string
 */
export function formatElapsedTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
}

/**
 * Get file extension from storage path
 */
export function getFileExtension(storagePath: string): string | null {
  const match = storagePath.toLowerCase().match(/\.([a-z0-9]+)$/);
  return match ? match[1] : null;
}

/**
 * Generate filename for download based on content type and timestamp
 */
export function generateDownloadFilename(
  contentType: ContentType,
  storagePath?: string
): string {
  const timestamp = Date.now();
  const ext = storagePath ? getFileExtension(storagePath) : null;
  
  switch (contentType) {
    case 'video':
      return `video-${timestamp}.${ext || 'mp4'}`;
    case 'audio':
      return `audio-${timestamp}.${ext || 'mp3'}`;
    case 'image':
      return `image-${timestamp}.${ext || 'png'}`;
    default:
      return `file-${timestamp}`;
  }
}

/**
 * Check if a URL is a full HTTP(S) URL
 */
export function isFullHttpUrl(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://');
}

/**
 * Get MIME type from file extension
 */
export function getMimeTypeFromExtension(extension: string): string {
  const mimeTypes: Record<string, string> = {
    // Video
    mp4: 'video/mp4',
    webm: 'video/webm',
    mov: 'video/quicktime',
    avi: 'video/x-msvideo',
    
    // Audio
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    ogg: 'audio/ogg',
    m4a: 'audio/mp4',
    
    // Image
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
  };
  
  return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
}
