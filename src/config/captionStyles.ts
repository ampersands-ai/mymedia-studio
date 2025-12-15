import { CaptionStyle } from '@/types/video';

export interface CaptionFont {
  name: string;
  family: string;
  url: string | null;
}

export const CAPTION_FONTS: CaptionFont[] = [
  { name: 'Space Grotesk Bold', family: 'Space Grotesk Bold', url: 'https://github.com/floriankarsten/space-grotesk/raw/master/fonts/SpaceGrotesk-Bold.ttf' },
  { name: 'Montserrat Bold', family: 'Montserrat Bold', url: 'https://github.com/google/fonts/raw/main/ofl/montserrat/Montserrat%5Bwght%5D.ttf' },
  { name: 'Permanent Marker', family: 'Permanent Marker', url: 'https://github.com/google/fonts/raw/main/apache/permanentmarker/PermanentMarker-Regular.ttf' },
  { name: 'Open Sans Bold', family: 'Open Sans Bold', url: 'https://github.com/google/fonts/raw/main/ofl/opensans/OpenSans%5Bwdth%2Cwght%5D.ttf' },
  { name: 'Clear Sans', family: 'Clear Sans', url: null },
  { name: 'Didact Gothic', family: 'Didact Gothic', url: null },
];

export const captionPresets: Record<string, CaptionStyle> = {
  modern: {
    position: 'bottom',
    animation: 'fade',
    fontSize: 55,
    fontWeight: 'black',
    fontFamily: 'Space Grotesk Bold',
    fontUrl: 'https://github.com/floriankarsten/space-grotesk/raw/master/fonts/SpaceGrotesk-Bold.ttf',
    textColor: '#000000',
    backgroundColor: '#FF9947',
    backgroundOpacity: 0.95,
    backgroundPadding: 15,
    backgroundBorderRadius: 8,
    lineHeight: 1.3,
    offsetY: 0.15,
    horizontalAlignment: 'center',
    verticalAlignment: 'center'
  },
  minimal: {
    position: 'bottom',
    animation: 'fade',
    fontSize: 42,
    fontWeight: 'bold',
    fontFamily: 'Clear Sans',
    textColor: '#FFFFFF',
    backgroundColor: '#000000',
    backgroundOpacity: 0.85,
    backgroundPadding: 12,
    backgroundBorderRadius: 6,
    lineHeight: 1.2,
    offsetY: 0.1,
    horizontalAlignment: 'center',
    verticalAlignment: 'center'
  },
  bold: {
    position: 'center',
    animation: 'bounce',
    fontSize: 56,
    fontWeight: 'black',
    fontFamily: 'Permanent Marker',
    textColor: '#FFD700',
    backgroundColor: '#000000',
    backgroundOpacity: 0,
    lineHeight: 1.4,
    offsetY: 0,
    horizontalAlignment: 'center',
    verticalAlignment: 'center',
    strokeColor: '#000000',
    strokeWidth: 4
  },
  elegant: {
    position: 'bottom',
    animation: 'slide',
    fontSize: 44,
    fontWeight: 'normal',
    fontFamily: 'Didact Gothic',
    textColor: '#FFFFFF',
    backgroundColor: '#1E1E3C',
    backgroundOpacity: 0.85,
    backgroundPadding: 10,
    backgroundBorderRadius: 4,
    lineHeight: 1.3,
    offsetY: 0.08,
    horizontalAlignment: 'center',
    verticalAlignment: 'center'
  }
};

export const textEffectPresets: Record<string, Partial<CaptionStyle>> = {
  none: {
    strokeWidth: 0,
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0
  },
  neonGlow: {
    strokeWidth: 0,
    shadowBlur: 15,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    shadowColor: '#00ff88',
    textColor: '#ffffff'
  },
  classicShadow: {
    strokeWidth: 0,
    shadowBlur: 4,
    shadowOffsetX: 3,
    shadowOffsetY: 3,
    shadowColor: '#000000'
  },
  boldOutline: {
    strokeWidth: 4,
    strokeColor: '#000000',
    shadowBlur: 0,
    textColor: '#ffffff'
  },
  dramaticGlow: {
    strokeWidth: 2,
    strokeColor: '#000000',
    shadowBlur: 20,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    shadowColor: '#ff0055',
    textColor: '#ffffff'
  },
  softShadow: {
    strokeWidth: 0,
    shadowBlur: 8,
    shadowOffsetX: 2,
    shadowOffsetY: 2,
    shadowColor: '#00000088'
  },
  retroGlow: {
    strokeWidth: 3,
    strokeColor: '#ff00ff',
    shadowBlur: 15,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    shadowColor: '#00ffff',
    textColor: '#ffffff'
  },
  goldLuxury: {
    strokeWidth: 2,
    strokeColor: '#8b4513',
    shadowBlur: 10,
    shadowOffsetX: 2,
    shadowOffsetY: 2,
    shadowColor: '#ffd700',
    textColor: '#ffd700'
  },
  iceEffect: {
    strokeWidth: 2,
    strokeColor: '#4169e1',
    shadowBlur: 12,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    shadowColor: '#00bfff',
    textColor: '#e0ffff'
  },
  fireGlow: {
    strokeWidth: 1,
    strokeColor: '#8b0000',
    shadowBlur: 18,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    shadowColor: '#ff4500',
    textColor: '#ff6347'
  }
};

export const aspectRatioConfig = {
  '16:9': { width: 1920, height: 1080, label: 'Landscape (YouTube)' },
  '9:16': { width: 1080, height: 1920, label: 'Vertical (TikTok, Reels)' },
  '4:5': { width: 1080, height: 1350, label: 'Portrait (Instagram)' },
  '1:1': { width: 1080, height: 1080, label: 'Square (Feed)' }
};
