/**
 * Type definitions for media settings components
 * Eliminates 'any' types in audio, subtitle, and animation settings
 */

/**
 * Music/Audio settings for video generation
 */
export interface MusicSettings {
  volume: number;        // 0-1 range
  fadeIn: number;        // seconds
  fadeOut: number;       // seconds
  duration?: number;     // seconds, -2 means auto
}

/**
 * Image animation settings for video generation
 */
export interface ImageAnimationSettings {
  zoom: number;          // 1-5 range
  position: AnimationPosition;
}

/**
 * Valid animation position values
 */
export type AnimationPosition = 
  | 'center-center'
  | 'top-center'
  | 'bottom-center';

/**
 * Update payload for settings sections
 */
export interface MusicSettingsUpdate {
  music_settings: MusicSettings;
  [key: string]: unknown;
}

export interface ImageAnimationSettingsUpdate {
  image_animation_settings: ImageAnimationSettings;
  [key: string]: unknown;
}

/**
 * Settings update handler types
 */
export type MusicSettingsUpdateHandler = (update: MusicSettingsUpdate) => void;
export type ImageAnimationSettingsUpdateHandler = (update: ImageAnimationSettingsUpdate) => void;

/**
 * Type guard for music settings
 */
export function isMusicSettings(value: unknown): value is MusicSettings {
  if (!value || typeof value !== 'object') return false;
  
  const settings = value as Record<string, unknown>;
  return (
    typeof settings.volume === 'number' &&
    typeof settings.fadeIn === 'number' &&
    typeof settings.fadeOut === 'number' &&
    settings.volume >= 0 &&
    settings.volume <= 1
  );
}

/**
 * Type guard for animation position
 */
export function isAnimationPosition(value: unknown): value is AnimationPosition {
  return (
    typeof value === 'string' &&
    (value === 'center-center' || 
     value === 'top-center' || 
     value === 'bottom-center')
  );
}

/**
 * Type guard for image animation settings
 */
export function isImageAnimationSettings(value: unknown): value is ImageAnimationSettings {
  if (!value || typeof value !== 'object') return false;
  
  const settings = value as Record<string, unknown>;
  return (
    typeof settings.zoom === 'number' &&
    settings.zoom >= 1 &&
    settings.zoom <= 5 &&
    isAnimationPosition(settings.position)
  );
}

/**
 * Default music settings
 */
export const DEFAULT_MUSIC_SETTINGS: MusicSettings = {
  volume: 0.05,
  fadeIn: 2,
  fadeOut: 2,
  duration: -2,
};

/**
 * Default image animation settings
 */
export const DEFAULT_IMAGE_ANIMATION_SETTINGS: ImageAnimationSettings = {
  zoom: 2,
  position: 'center-center',
};

/**
 * Safely gets music settings with defaults
 */
export function getMusicSettings(
  settings: Partial<MusicSettings> | null | undefined
): MusicSettings {
  if (!settings) return DEFAULT_MUSIC_SETTINGS;
  
  return {
    volume: settings.volume ?? DEFAULT_MUSIC_SETTINGS.volume,
    fadeIn: settings.fadeIn ?? DEFAULT_MUSIC_SETTINGS.fadeIn,
    fadeOut: settings.fadeOut ?? DEFAULT_MUSIC_SETTINGS.fadeOut,
    duration: settings.duration ?? DEFAULT_MUSIC_SETTINGS.duration,
  };
}

/**
 * Safely gets image animation settings with defaults
 */
export function getImageAnimationSettings(
  settings: Partial<ImageAnimationSettings> | null | undefined
): ImageAnimationSettings {
  if (!settings) return DEFAULT_IMAGE_ANIMATION_SETTINGS;
  
  return {
    zoom: settings.zoom ?? DEFAULT_IMAGE_ANIMATION_SETTINGS.zoom,
    position: isAnimationPosition(settings.position) 
      ? settings.position 
      : DEFAULT_IMAGE_ANIMATION_SETTINGS.position,
  };
}

/**
 * Validates and normalizes music volume (0-1 range)
 */
export function normalizeVolume(volume: number): number {
  return Math.max(0, Math.min(1, volume));
}

/**
 * Validates and normalizes fade duration (0-10 seconds)
 */
export function normalizeFadeDuration(seconds: number): number {
  return Math.max(0, Math.min(10, seconds));
}

/**
 * Validates and normalizes zoom level (1-5 range)
 */
export function normalizeZoom(zoom: number): number {
  return Math.max(1, Math.min(5, zoom));
}

/**
 * Converts volume percentage (0-100) to decimal (0-1)
 */
export function percentageToVolume(percentage: number): number {
  return normalizeVolume(percentage / 100);
}

/**
 * Converts volume decimal (0-1) to percentage (0-100)
 */
export function volumeToPercentage(volume: number): number {
  return Math.round(normalizeVolume(volume) * 100);
}
