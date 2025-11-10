import { createImage } from './crop-canvas';

export interface TextLayer {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  fontFamily: string;
  fontWeight: string;
  fontStyle: string;
  color: string;
  opacity: number;
  strokeWidth: number;
  strokeColor: string;
  backgroundColor: string | null;
  padding: number;
  rotation: number;
  shadowBlur: number;
  shadowColor: string;
  shadowOffsetX: number;
  shadowOffsetY: number;
}

export const defaultTextLayer: Omit<TextLayer, 'id'> = {
  text: 'Add text here',
  x: 0.5,
  y: 0.5,
  fontSize: 48,
  fontFamily: 'Arial',
  fontWeight: 'bold',
  fontStyle: 'normal',
  color: '#ffffff',
  opacity: 1,
  strokeWidth: 2,
  strokeColor: '#000000',
  backgroundColor: null,
  padding: 10,
  rotation: 0,
  shadowBlur: 0,
  shadowColor: '#000000',
  shadowOffsetX: 0,
  shadowOffsetY: 0,
};

export const watermarkTemplates: Array<Omit<TextLayer, 'id'>> = [
  {
    text: '@username',
    x: 0.85,
    y: 0.95,
    fontSize: 24,
    fontFamily: 'Arial',
    fontWeight: 'bold',
    fontStyle: 'normal',
    color: '#ffffff',
    opacity: 0.7,
    strokeWidth: 2,
    strokeColor: '#000000',
    backgroundColor: null,
    padding: 0,
    rotation: 0,
    shadowBlur: 0,
    shadowColor: '#000000',
    shadowOffsetX: 0,
    shadowOffsetY: 0,
  },
  {
    text: '© 2024 All Rights Reserved',
    x: 0.5,
    y: 0.95,
    fontSize: 16,
    fontFamily: 'Arial',
    fontWeight: 'normal',
    fontStyle: 'normal',
    color: '#ffffff',
    opacity: 0.5,
    strokeWidth: 1,
    strokeColor: '#000000',
    backgroundColor: null,
    padding: 0,
    rotation: 0,
    shadowBlur: 0,
    shadowColor: '#000000',
    shadowOffsetX: 0,
    shadowOffsetY: 0,
  },
  {
    text: 'Made with AI',
    x: 0.9,
    y: 0.1,
    fontSize: 20,
    fontFamily: 'Arial',
    fontWeight: 'bold',
    fontStyle: 'normal',
    color: '#ffffff',
    opacity: 1,
    strokeWidth: 0,
    strokeColor: '#000000',
    backgroundColor: '#000000',
    padding: 8,
    rotation: 0,
    shadowBlur: 0,
    shadowColor: '#000000',
    shadowOffsetX: 0,
    shadowOffsetY: 0,
  },
];

// Preset text templates organized by category
export const presetTemplates = {
  motivational: [
    {
      text: 'BELIEVE IN YOURSELF',
      x: 0.5,
      y: 0.5,
      fontSize: 56,
      fontFamily: 'Impact',
      fontWeight: 'bold',
      fontStyle: 'normal',
      color: '#ffffff',
      opacity: 1,
      strokeWidth: 3,
      strokeColor: '#000000',
      backgroundColor: null,
      padding: 0,
      rotation: 0,
      shadowBlur: 15,
      shadowColor: '#000000',
      shadowOffsetX: 3,
      shadowOffsetY: 3,
    },
    {
      text: 'Dream Big, Work Hard',
      x: 0.5,
      y: 0.5,
      fontSize: 48,
      fontFamily: 'Georgia',
      fontWeight: 'bold',
      fontStyle: 'italic',
      color: '#FFD700',
      opacity: 1,
      strokeWidth: 2,
      strokeColor: '#000000',
      backgroundColor: null,
      padding: 0,
      rotation: -5,
      shadowBlur: 10,
      shadowColor: '#000000',
      shadowOffsetX: 2,
      shadowOffsetY: 2,
    },
    {
      text: 'Never Give Up',
      x: 0.5,
      y: 0.5,
      fontSize: 52,
      fontFamily: 'Arial',
      fontWeight: 'bold',
      fontStyle: 'normal',
      color: '#FF6B6B',
      opacity: 1,
      strokeWidth: 4,
      strokeColor: '#ffffff',
      backgroundColor: null,
      padding: 0,
      rotation: 0,
      shadowBlur: 20,
      shadowColor: '#000000',
      shadowOffsetX: 0,
      shadowOffsetY: 0,
    },
  ],
  social: [
    {
      text: 'Swipe Up for More',
      x: 0.5,
      y: 0.15,
      fontSize: 32,
      fontFamily: 'Helvetica',
      fontWeight: 'bold',
      fontStyle: 'normal',
      color: '#ffffff',
      opacity: 1,
      strokeWidth: 0,
      strokeColor: '#000000',
      backgroundColor: '#FF1493',
      padding: 12,
      rotation: 0,
      shadowBlur: 8,
      shadowColor: '#000000',
      shadowOffsetX: 0,
      shadowOffsetY: 4,
    },
    {
      text: 'Link in Bio 👆',
      x: 0.5,
      y: 0.9,
      fontSize: 28,
      fontFamily: 'Arial',
      fontWeight: 'bold',
      fontStyle: 'normal',
      color: '#000000',
      opacity: 1,
      strokeWidth: 0,
      strokeColor: '#000000',
      backgroundColor: '#FFD700',
      padding: 10,
      rotation: 0,
      shadowBlur: 5,
      shadowColor: '#00000080',
      shadowOffsetX: 0,
      shadowOffsetY: 2,
    },
    {
      text: 'Tag Your Friends',
      x: 0.5,
      y: 0.85,
      fontSize: 24,
      fontFamily: 'Verdana',
      fontWeight: 'normal',
      fontStyle: 'normal',
      color: '#ffffff',
      opacity: 0.9,
      strokeWidth: 2,
      strokeColor: '#000000',
      backgroundColor: null,
      padding: 0,
      rotation: 0,
      shadowBlur: 6,
      shadowColor: '#000000',
      shadowOffsetX: 1,
      shadowOffsetY: 1,
    },
  ],
  promotional: [
    {
      text: 'LIMITED OFFER',
      x: 0.5,
      y: 0.2,
      fontSize: 48,
      fontFamily: 'Impact',
      fontWeight: 'bold',
      fontStyle: 'normal',
      color: '#ffffff',
      opacity: 1,
      strokeWidth: 0,
      strokeColor: '#000000',
      backgroundColor: '#FF0000',
      padding: 15,
      rotation: -3,
      shadowBlur: 12,
      shadowColor: '#000000',
      shadowOffsetX: 4,
      shadowOffsetY: 4,
    },
    {
      text: '50% OFF TODAY',
      x: 0.5,
      y: 0.5,
      fontSize: 64,
      fontFamily: 'Arial',
      fontWeight: 'bold',
      fontStyle: 'normal',
      color: '#FFD700',
      opacity: 1,
      strokeWidth: 4,
      strokeColor: '#000000',
      backgroundColor: null,
      padding: 0,
      rotation: 5,
      shadowBlur: 15,
      shadowColor: '#FF0000',
      shadowOffsetX: 0,
      shadowOffsetY: 0,
    },
    {
      text: 'NEW ARRIVAL',
      x: 0.15,
      y: 0.15,
      fontSize: 28,
      fontFamily: 'Helvetica',
      fontWeight: 'bold',
      fontStyle: 'normal',
      color: '#000000',
      opacity: 1,
      strokeWidth: 0,
      strokeColor: '#000000',
      backgroundColor: '#00FF00',
      padding: 10,
      rotation: -45,
      shadowBlur: 8,
      shadowColor: '#000000',
      shadowOffsetX: 2,
      shadowOffsetY: 2,
    },
  ],
};

export async function applyTextOverlay(
  imageSrc: string,
  textLayers: TextLayer[]
): Promise<{ blob: Blob; url: string }> {
  const image = await createImage(imageSrc);
  
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) throw new Error('Could not get canvas context');
  
  // Draw base image
  ctx.drawImage(image, 0, 0);
  
  // Draw each text layer
  textLayers.forEach(layer => {
    drawTextLayer(ctx, layer, canvas.width, canvas.height);
  });
  
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

function drawTextLayer(
  ctx: CanvasRenderingContext2D,
  layer: TextLayer,
  canvasWidth: number,
  canvasHeight: number
) {
  ctx.save();
  
  const x = layer.x * canvasWidth;
  const y = layer.y * canvasHeight;
  
  // Apply rotation
  if (layer.rotation !== 0) {
    ctx.translate(x, y);
    ctx.rotate((layer.rotation * Math.PI) / 180);
    ctx.translate(-x, -y);
  }
  
  ctx.font = `${layer.fontStyle} ${layer.fontWeight} ${layer.fontSize}px ${layer.fontFamily}`;
  ctx.globalAlpha = layer.opacity;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Apply shadow
  if (layer.shadowBlur > 0) {
    ctx.shadowBlur = layer.shadowBlur;
    ctx.shadowColor = layer.shadowColor;
    ctx.shadowOffsetX = layer.shadowOffsetX;
    ctx.shadowOffsetY = layer.shadowOffsetY;
  }
  
  if (layer.backgroundColor) {
    const metrics = ctx.measureText(layer.text);
    const bgWidth = metrics.width + layer.padding * 2;
    const bgHeight = layer.fontSize + layer.padding * 2;
    ctx.fillStyle = layer.backgroundColor;
    ctx.fillRect(x - bgWidth / 2, y - bgHeight / 2, bgWidth, bgHeight);
  }
  
  // Reset shadow for stroke and fill to avoid double shadow
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  
  if (layer.strokeWidth > 0) {
    ctx.strokeStyle = layer.strokeColor;
    ctx.lineWidth = layer.strokeWidth;
    ctx.strokeText(layer.text, x, y);
  }
  
  // Reapply shadow for fill text
  if (layer.shadowBlur > 0) {
    ctx.shadowBlur = layer.shadowBlur;
    ctx.shadowColor = layer.shadowColor;
    ctx.shadowOffsetX = layer.shadowOffsetX;
    ctx.shadowOffsetY = layer.shadowOffsetY;
  }
  
  ctx.fillStyle = layer.color;
  ctx.fillText(layer.text, x, y);
  
  ctx.restore();
}
