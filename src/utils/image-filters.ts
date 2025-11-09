import { createImage } from './crop-canvas';

export interface FilterSettings {
  brightness: number;
  contrast: number;
  saturation: number;
  blur: number;
  grayscale: number;
  sepia: number;
}

export const defaultFilters: FilterSettings = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  blur: 0,
  grayscale: 0,
  sepia: 0,
};

export const filterPresets: Record<string, FilterSettings> = {
  bw: { brightness: 100, contrast: 110, saturation: 0, blur: 0, grayscale: 100, sepia: 0 },
  sepia: { brightness: 110, contrast: 90, saturation: 100, blur: 0, grayscale: 0, sepia: 100 },
  vintage: { brightness: 95, contrast: 90, saturation: 80, blur: 0, grayscale: 0, sepia: 30 },
  vibrant: { brightness: 105, contrast: 110, saturation: 130, blur: 0, grayscale: 0, sepia: 0 },
};

export async function applyFiltersToImage(
  imageSrc: string,
  filters: FilterSettings
): Promise<{ blob: Blob; url: string }> {
  const image = await createImage(imageSrc);
  
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) throw new Error('Could not get canvas context');
  
  // Apply filters using CSS filter syntax
  ctx.filter = `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturation}%) blur(${filters.blur}px) grayscale(${filters.grayscale}%) sepia(${filters.sepia}%)`;
  
  ctx.drawImage(image, 0, 0);
  
  // Export as blob
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
