import { CaptionStyle } from '@/types/video';

export const captionPresets: Record<string, CaptionStyle> = {
  modern: {
    position: 'center',
    animation: 'zoom',
    fontSize: 48, // Optimized for Shotstack
    fontWeight: 'black',
    fontFamily: 'Montserrat ExtraBold',
    textColor: '#FFFFFF',
    backgroundColor: 'rgba(0,0,0,0.8)',
    strokeColor: '#000000',
    strokeWidth: 3
  },
  minimal: {
    position: 'bottom',
    animation: 'fade',
    fontSize: 42,
    fontWeight: 'bold',
    fontFamily: 'Clear Sans',
    textColor: '#FFFFFF',
    backgroundColor: 'rgba(0,0,0,0.85)'
  },
  bold: {
    position: 'center',
    animation: 'bounce',
    fontSize: 56,
    fontWeight: 'black',
    fontFamily: 'Permanent Marker',
    textColor: '#FFD700',
    backgroundColor: 'rgba(0,0,0,0)',
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
    backgroundColor: 'rgba(30,30,60,0.85)'
  }
};

export const aspectRatioConfig = {
  '16:9': { width: 1920, height: 1080, label: 'Landscape (YouTube)' },
  '9:16': { width: 1080, height: 1920, label: 'Vertical (TikTok, Reels)' },
  '4:5': { width: 1080, height: 1350, label: 'Portrait (Instagram)' },
  '1:1': { width: 1080, height: 1080, label: 'Square (Feed)' }
};
