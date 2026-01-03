export interface ShaderParams {
  shape: 'cube' | 'sphere' | 'pyramid';
  instanceCount: number; // 1000-8000
  arrangement: 'radial' | 'spiral' | 'grid' | 'wave' | 'cannon' | 'tunnel' | 'helix' | 'matrix' | 'orbits' | 'vortex' | 'constellation' | 'kaleidoscope' | 'stream' | 'explosion' | 'sunflowers' | 'solarpanel' | 'windmill' | 'surfers' | 'flags' | 'sailboats' | 'forest' | 'fishschool' | 'murmuration' | 'pendulums' | 'dominoes' | 'compass' | 
    // Tracking-based arrangements
    'eyes' | 'spotlights' | 'cameras' | 'satellites' | 'arrows' | 'sunfloweremoji' | 'turrets' | 'mirrors' | 'periscopes' | 'radar' | 'clocks' | 'lasers' | 'flowers' | 'speakers' | 'watchtowers' | 'metronomes' | 'windvanes' | 'searchlights' | 'telescopes' | 'flames';
  colorPrimary: string; // hex color
  colorSecondary: string; // hex color
  metallic: number; // 0-1
  cameraSpeed: number; // 0.1-1
  backgroundColor: string; // hex color
  panelSize?: number; // 0.5-3 multiplier for solar panel size
}

export interface BackgroundPreset {
  id: string;
  name: string;
  category: 'Abstract' | 'Tech' | 'Energetic' | 'Minimal' | 'Mesmerizing' | 'Sunflowers' | 'Solarpanel' | 'Windfield' | 'Ocean' | 'Flags' | 'Nautical' | 'Nature' | 'Wildlife' | 'Physics' | 'Magnetic' | 
    // New tracking categories
    'Surveillance' | 'Theatrical' | 'Industrial' | 'Cosmic';
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
  panelSize: 1.0,
};
