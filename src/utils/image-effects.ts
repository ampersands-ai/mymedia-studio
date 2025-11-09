import { createImage } from './crop-canvas';

export interface ImageEffects {
  dropShadow: boolean;
  dropShadowBlur: number;
  dropShadowOffsetX: number;
  dropShadowOffsetY: number;
  dropShadowColor: string;
  glow: boolean;
  glowIntensity: number;
  glowColor: string;
  vignette: boolean;
  vignetteIntensity: number;
  border: boolean;
  borderWidth: number;
  borderColor: string;
  borderStyle: 'solid' | 'dashed' | 'dotted';
}

export const defaultEffects: ImageEffects = {
  dropShadow: false,
  dropShadowBlur: 20,
  dropShadowOffsetX: 10,
  dropShadowOffsetY: 10,
  dropShadowColor: '#000000',
  glow: false,
  glowIntensity: 20,
  glowColor: '#ffffff',
  vignette: false,
  vignetteIntensity: 0.5,
  border: false,
  borderWidth: 10,
  borderColor: '#ffffff',
  borderStyle: 'solid',
};

export async function applyEffectsToImage(
  imageSrc: string,
  effects: ImageEffects
): Promise<{ blob: Blob; url: string }> {
  const image = await createImage(imageSrc);
  
  // Calculate canvas size with padding for effects
  const padding = Math.max(
    effects.dropShadow ? effects.dropShadowBlur + Math.abs(effects.dropShadowOffsetX) : 0,
    effects.glow ? effects.glowIntensity * 2 : 0,
    effects.border ? effects.borderWidth : 0
  ) * 2;
  
  const canvas = document.createElement('canvas');
  canvas.width = image.width + padding * 2;
  canvas.height = image.height + padding * 2;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) throw new Error('Could not get canvas context');

  // Clear canvas with transparent background
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Apply drop shadow
  if (effects.dropShadow) {
    ctx.shadowColor = effects.dropShadowColor;
    ctx.shadowBlur = effects.dropShadowBlur;
    ctx.shadowOffsetX = effects.dropShadowOffsetX;
    ctx.shadowOffsetY = effects.dropShadowOffsetY;
  }

  // Apply glow effect (multiple shadow passes)
  if (effects.glow) {
    ctx.shadowColor = effects.glowColor;
    ctx.shadowBlur = effects.glowIntensity;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    
    // Draw multiple times for stronger glow
    for (let i = 0; i < 3; i++) {
      ctx.drawImage(image, padding, padding);
    }
  }

  // Draw main image
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.drawImage(image, padding, padding);

  // Apply vignette
  if (effects.vignette) {
    const gradient = ctx.createRadialGradient(
      canvas.width / 2,
      canvas.height / 2,
      0,
      canvas.width / 2,
      canvas.height / 2,
      Math.max(canvas.width, canvas.height) / 2
    );
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(0.7, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, `rgba(0,0,0,${effects.vignetteIntensity})`);
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // Apply border
  if (effects.border) {
    ctx.strokeStyle = effects.borderColor;
    ctx.lineWidth = effects.borderWidth;
    
    if (effects.borderStyle === 'dashed') {
      ctx.setLineDash([15, 10]);
    } else if (effects.borderStyle === 'dotted') {
      ctx.setLineDash([5, 5]);
    }
    
    ctx.strokeRect(
      padding - effects.borderWidth / 2,
      padding - effects.borderWidth / 2,
      image.width + effects.borderWidth,
      image.height + effects.borderWidth
    );
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Canvas is empty'));
        return;
      }
      const url = URL.createObjectURL(blob);
      resolve({ blob, url });
    }, 'image/png');
  });
}

export const effectPresets: Record<string, ImageEffects> = {
  'drop-shadow': {
    ...defaultEffects,
    dropShadow: true,
    dropShadowBlur: 25,
    dropShadowOffsetX: 15,
    dropShadowOffsetY: 15,
    dropShadowColor: 'rgba(0, 0, 0, 0.5)',
  },
  'soft-glow': {
    ...defaultEffects,
    glow: true,
    glowIntensity: 15,
    glowColor: '#ffffff',
  },
  'dark-vignette': {
    ...defaultEffects,
    vignette: true,
    vignetteIntensity: 0.7,
  },
  'white-border': {
    ...defaultEffects,
    border: true,
    borderWidth: 20,
    borderColor: '#ffffff',
    borderStyle: 'solid' as const,
  },
  'polaroid': {
    ...defaultEffects,
    border: true,
    borderWidth: 30,
    borderColor: '#ffffff',
    borderStyle: 'solid' as const,
    dropShadow: true,
    dropShadowBlur: 20,
    dropShadowOffsetX: 5,
    dropShadowOffsetY: 5,
    dropShadowColor: 'rgba(0, 0, 0, 0.3)',
  },
};
