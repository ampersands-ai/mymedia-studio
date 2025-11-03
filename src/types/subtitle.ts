export interface SubtitleSettings {
  // Text Styling (9 parameters)
  fontFamily: string;
  fontSize: number;
  fontColor: string;
  fontWeight: string;
  fontStyle: 'normal' | 'italic';
  textAlign: 'left' | 'center' | 'right';
  textTransform: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  lineHeight: number;
  letterSpacing: number;
  
  // Background (4 parameters)
  backgroundColor: string;
  backgroundOpacity: number;
  backgroundPadding: number;
  backgroundRadius: number;
  
  // Outline (2 parameters)
  outlineColor: string;
  outlineWidth: number;
  
  // Shadow (4 parameters)
  shadowColor: string;
  shadowBlur: number;
  shadowX: number;
  shadowY: number;
  
  // Positioning (4 parameters)
  position: string;
  offsetX: number;
  offsetY: number;
  maxWidth: number;
  
  // Animation (2 parameters)
  animation: 'none' | 'fade' | 'slide-up' | 'slide-down' | 'zoom' | 'bounce';
  animationDuration: number;
  
  // Language (2 parameters)
  subtitlesModel: 'default' | 'whisper' | 'azure' | 'google';
  language: string;
  
  // Legacy/Existing (for backward compatibility)
  style?: string;
  allCaps?: boolean;
  boxColor?: string;
  lineColor?: string;
  wordColor?: string;
  maxWordsPerLine?: number;
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
  fontFamily: 'Oswald Bold',
  fontSize: 140,
  fontColor: '#FFFFFF',
  fontWeight: 'bold',
  fontStyle: 'normal',
  textAlign: 'center',
  textTransform: 'none',
  lineHeight: 1.2,
  letterSpacing: 0,
  
  backgroundColor: 'transparent',
  backgroundOpacity: 0.8,
  backgroundPadding: 20,
  backgroundRadius: 10,
  
  outlineColor: '#000000',
  outlineWidth: 8,
  
  shadowColor: '#000000',
  shadowBlur: 10,
  shadowX: 2,
  shadowY: 2,
  
  position: 'mid-bottom-center',
  offsetX: 0,
  offsetY: 0,
  maxWidth: 800,
  
  animation: 'fade',
  animationDuration: 0.3,
  
  subtitlesModel: 'default',
  language: 'auto',
  
  style: 'boxed-word',
  allCaps: false,
  maxWordsPerLine: 4,
};
