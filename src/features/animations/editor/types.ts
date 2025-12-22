// Animation Editor Types - ARTIFIO Specification

export type ElementType = 'emoji' | 'text' | 'shape' | 'counter' | 'image';

export type ShapeType = 'circle' | 'rectangle' | 'triangle' | 'arrow' | 'line' | 'star';

export type EnterAnimation = 
  | 'fadeIn' 
  | 'slideInLeft' 
  | 'slideInRight' 
  | 'slideInUp' 
  | 'slideInDown'
  | 'zoomIn' 
  | 'bounceIn' 
  | 'flipIn' 
  | 'rotateIn'
  | 'none';

export type EmphasisAnimation = 
  | 'pulse' 
  | 'shake' 
  | 'bounce' 
  | 'swing' 
  | 'tada'
  | 'heartbeat' 
  | 'rubberBand' 
  | 'flash'
  | 'none';

export type ExitAnimation = 
  | 'fadeOut' 
  | 'slideOutLeft' 
  | 'slideOutRight' 
  | 'slideOutUp' 
  | 'slideOutDown'
  | 'zoomOut' 
  | 'bounceOut' 
  | 'flipOut' 
  | 'rotateOut'
  | 'none';

export type CaptionStyle = 
  | 'karaoke' 
  | 'bounce' 
  | 'wave' 
  | 'highlight' 
  | 'static'
  | 'typewriter';

export type CaptionPosition = 'top' | 'center' | 'bottom';

export type BackgroundType = 
  | 'solid' 
  | 'gradient' 
  | 'particles' 
  | 'waves' 
  | 'grid' 
  | 'starfield'
  | 'image';

export interface ElementInstruction {
  id: string;
  type: ElementType;
  content: string;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  width?: number; // percentage
  height?: number; // percentage
  rotation?: number; // degrees
  opacity?: number; // 0-1
  scale?: number; // 1 = 100%
  enterAt: number; // seconds
  exitAt: number; // seconds
  enterAnimation: EnterAnimation;
  emphasisAnimation: EmphasisAnimation;
  exitAnimation: ExitAnimation;
  enterDuration?: number; // seconds
  emphasisDuration?: number; // seconds
  exitDuration?: number; // seconds
  style: ElementStyle;
  zIndex?: number;
}

export interface ElementStyle {
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: 'normal' | 'bold' | 'bolder' | 'lighter' | number;
  color?: string;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  shadowColor?: string;
  shadowBlur?: number;
  textAlign?: 'left' | 'center' | 'right';
  shapeType?: ShapeType;
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
}

export interface CaptionWord {
  id: string;
  word: string;
  start: number; // seconds
  end: number; // seconds
}

export interface CaptionInstruction {
  words: CaptionWord[];
  style: CaptionStyle;
  position: CaptionPosition;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  highlightColor?: string;
  backgroundColor?: string;
  visible: boolean;
}

export interface BackgroundInstruction {
  type: BackgroundType;
  color1?: string;
  color2?: string;
  gradientAngle?: number;
  imageUrl?: string;
  animationSpeed?: number;
  particleCount?: number;
}

export interface SceneInstruction {
  id: string;
  name: string;
  duration: number; // seconds
  elements: ElementInstruction[];
  background: BackgroundInstruction;
  caption?: CaptionInstruction;
}

export interface VideoInstructions {
  id?: string;
  name: string;
  scenes: SceneInstruction[];
  audioUrl?: string;
  audioDuration?: number;
  width: number;
  height: number;
  fps: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface EditorState {
  project: VideoInstructions;
  selectedSceneId: string | null;
  selectedElementId: string | null;
  currentTime: number;
  isPlaying: boolean;
  mode: 'edit' | 'preview';
  zoom: number;
  showGrid: boolean;
  snapToGrid: boolean;
  gridSize: number;
}

export interface HistoryState {
  past: VideoInstructions[];
  present: VideoInstructions;
  future: VideoInstructions[];
}

// Default values
export const DEFAULT_ELEMENT_STYLE: ElementStyle = {
  fontSize: 24,
  fontFamily: 'Inter',
  fontWeight: 'normal',
  color: '#ffffff',
  textAlign: 'center',
};

export const DEFAULT_BACKGROUND: BackgroundInstruction = {
  type: 'solid',
  color1: '#1a1a2e',
};

export const DEFAULT_CAPTION: CaptionInstruction = {
  words: [],
  style: 'karaoke',
  position: 'bottom',
  fontSize: 32,
  fontFamily: 'Inter',
  color: '#ffffff',
  highlightColor: '#FFD700',
  visible: true,
};

export const createDefaultElement = (type: ElementType, id: string): ElementInstruction => ({
  id,
  type,
  content: type === 'emoji' ? '🎬' : type === 'text' ? 'Text' : '',
  x: 50,
  y: 50,
  rotation: 0,
  opacity: 1,
  scale: 1,
  enterAt: 0,
  exitAt: 5,
  enterAnimation: 'fadeIn',
  emphasisAnimation: 'none',
  exitAnimation: 'fadeOut',
  enterDuration: 0.5,
  emphasisDuration: 1,
  exitDuration: 0.5,
  style: { ...DEFAULT_ELEMENT_STYLE },
  zIndex: 1,
});

export const createDefaultScene = (id: string, name: string): SceneInstruction => ({
  id,
  name,
  duration: 5,
  elements: [],
  background: { ...DEFAULT_BACKGROUND },
});
