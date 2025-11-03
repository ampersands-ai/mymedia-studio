export interface SubtitleSettings {
  // === json2video Core Parameters ===
  style: 'classic' | 'classic-progressive' | 'classic-one-word' | 'boxed-line' | 'boxed-word';
  
  // Colors for different word states (json2video specific)
  lineColor: string;      // Non-speaking words
  wordColor: string;      // Currently speaking word (highlight)
  boxColor: string;       // Background box color (for boxed styles)
  
  // Text formatting
  allCaps: boolean;
  maxWordsPerLine: number;
  
  // Advanced transcription
  keywords: string[];
  replace: Record<string, string>;
  fontUrl: string;
  
  // Custom positioning (alternative to position presets)
  x: number;
  y: number;
  
  // Shadow (json2video uses single offset value)
  shadowOffset: number;
  
  // === Text Styling ===
  fontFamily: string;
  fontSize: number;
  fontColor: string;
  fontWeight: string;
  fontStyle: 'normal' | 'italic';
  textAlign: 'left' | 'center' | 'right';
  textTransform: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  lineHeight: number;
  letterSpacing: number;
  
  // === Background ===
  backgroundColor: string;
  backgroundOpacity: number;
  backgroundPadding: number;
  backgroundRadius: number;
  
  // === Outline ===
  outlineColor: string;
  outlineWidth: number;
  
  // === Shadow (for modern preview) ===
  shadowColor: string;
  shadowBlur: number;
  shadowX: number;
  shadowY: number;
  
  // === Positioning ===
  position: string;
  offsetX: number;
  offsetY: number;
  maxWidth: number;
  
  // === Animation ===
  animation: 'none' | 'fade' | 'slide-up' | 'slide-down' | 'zoom' | 'bounce';
  animationDuration: number;
  
  // === Language ===
  subtitlesModel: 'default' | 'whisper' | 'azure' | 'google';
  language: string;
}

export interface SubtitlePreset {
  name: string;
  description?: string;
  settings: Partial<SubtitleSettings>;
}

export interface Json2VideoSubtitleVariables {
  [key: string]: string | number | boolean;
}

export const DEFAULT_SUBTITLE_SETTINGS: SubtitleSettings = {
  // json2video specific
  style: 'boxed-word',
  lineColor: '#FFFFFF',
  wordColor: '#FFFF00',
  boxColor: '#000000',
  allCaps: false,
  maxWordsPerLine: 4,
  shadowOffset: 0,
  keywords: [],
  replace: {},
  fontUrl: '',
  x: 0,
  y: 0,
  
  // Text styling
  fontFamily: 'Oswald Bold',
  fontSize: 40,
  fontColor: '#FFFFFF',
  fontWeight: 'bold',
  fontStyle: 'normal',
  textAlign: 'center',
  textTransform: 'none',
  lineHeight: 1.2,
  letterSpacing: 0,
  
  // Background
  backgroundColor: 'transparent',
  backgroundOpacity: 0.8,
  backgroundPadding: 20,
  backgroundRadius: 10,
  
  // Outline
  outlineColor: '#000000',
  outlineWidth: 8,
  
  // Shadow (modern preview)
  shadowColor: '#000000',
  shadowBlur: 10,
  shadowX: 2,
  shadowY: 2,
  
  // Positioning
  position: 'mid-bottom-center',
  offsetX: 0,
  offsetY: 0,
  maxWidth: 800,
  
  // Animation
  animation: 'fade',
  animationDuration: 0.3,
  
  // Language
  subtitlesModel: 'default',
  language: 'auto',
};
