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
  
  // === Outline ===
  outlineColor: string;
  outlineWidth: number;
  
  // === Positioning ===
  position: string;
  
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
  
  // Outline
  outlineColor: '#000000',
  outlineWidth: 8,
  
  // Positioning
  position: 'mid-bottom-center',
  
  // Language
  subtitlesModel: 'default',
  language: 'auto',
};
