import { CaptionStyle } from '@/types/video';

export const captionPresets: Record<string, CaptionStyle> = {
  modern: {
    position: 'center',
    animation: 'zoom',
    fontSize: 72,
    fontWeight: 'black',
    fontFamily: 'Montserrat',
    textColor: '#FFFFFF',
    backgroundColor: 'rgba(0,0,0,0)',
    strokeColor: '#000000',
    strokeWidth: 3
  },
  minimal: {
    position: 'bottom',
    animation: 'fade',
    fontSize: 56,
    fontWeight: 'bold',
    fontFamily: 'Inter',
    textColor: '#FFFFFF',
    backgroundColor: 'rgba(0,0,0,0.8)'
  },
  bold: {
    position: 'center',
    animation: 'bounce',
    fontSize: 84,
    fontWeight: 'black',
    fontFamily: 'Impact',
    textColor: '#FFD700',
    backgroundColor: 'rgba(0,0,0,0)',
    strokeColor: '#000000',
    strokeWidth: 4
  },
  elegant: {
    position: 'bottom',
    animation: 'slide',
    fontSize: 64,
    fontWeight: 'normal',
    fontFamily: 'Playfair Display',
    textColor: '#FFFFFF',
    backgroundColor: 'rgba(0,0,0,0.7)'
  }
};

export const aspectRatioConfig = {
  '16:9': { width: 1920, height: 1080, label: 'Landscape (YouTube)' },
  '9:16': { width: 1080, height: 1920, label: 'Vertical (TikTok, Reels)' },
  '4:5': { width: 1080, height: 1350, label: 'Portrait (Instagram)' },
  '1:1': { width: 1080, height: 1080, label: 'Square (Feed)' }
};
