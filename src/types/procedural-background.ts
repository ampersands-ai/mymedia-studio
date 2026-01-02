export interface ShaderParams {
  shape: 'cube' | 'sphere' | 'pyramid';
  instanceCount: number; // 1000-8000
  arrangement: 'radial' | 'spiral' | 'grid' | 'wave' | 'cannon';
  colorPrimary: string; // hex color
  colorSecondary: string; // hex color
  metallic: number; // 0-1
  cameraSpeed: number; // 0.1-1
  backgroundColor: string; // hex color
}

export interface BackgroundPreset {
  id: string;
  name: string;
  category: 'Abstract' | 'Tech' | 'Energetic' | 'Minimal';
  thumbnail: string;
  params: ShaderParams;
}

export type RecordingState = 'idle' | 'recording' | 'converting' | 'ready';

export const DEFAULT_SHADER_PARAMS: ShaderParams = {
  shape: 'cube',
  instanceCount: 3000,
  arrangement: 'radial',
  colorPrimary: '#6B8DD6',
  colorSecondary: '#C9956B',
  metallic: 0.8,
  cameraSpeed: 0.3,
  backgroundColor: '#0a0a0a',
};
