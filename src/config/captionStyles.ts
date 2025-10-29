import { CaptionStyle } from '@/types/video';

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

export const aspectRatioConfig = {
  '16:9': { width: 1920, height: 1080, label: 'Landscape (YouTube)' },
  '9:16': { width: 1080, height: 1920, label: 'Vertical (TikTok, Reels)' },
  '4:5': { width: 1080, height: 1350, label: 'Portrait (Instagram)' },
  '1:1': { width: 1080, height: 1080, label: 'Square (Feed)' }
};
