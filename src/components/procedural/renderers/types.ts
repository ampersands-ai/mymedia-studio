// Shared types for tracking-based visualizations

export interface TrackingParticle {
  x: number;           // normalized grid position (0-1)
  y: number;           // normalized grid position (0-1)
  angle: number;       // current rotation angle
  targetAngle: number; // target rotation angle
  springiness: number; // spring constant (0.05-0.15)
  scale: number;       // size multiplier
  phase: number;       // animation phase offset
  // Optional per-arrangement properties
  intensity?: number;
  velocityAngle?: number;
  pupilX?: number;     // for eyes
  pupilY?: number;     // for eyes
  targetPupilX?: number;
  targetPupilY?: number;
  pupilDilation?: number;
  beamIntensity?: number;  // for spotlights/lasers
  ledOn?: boolean;     // for cameras
  elevation?: number;  // for satellites/radar
  targetElevation?: number;
  spinAngle?: number;  // for radar
  handAngle?: number;  // for clocks
  swayOffset?: number; // for flowers/flames
  swaySpeed?: number;
  pendulumAngle?: number; // for metronomes
  pendulumVelocity?: number;
  bobOffset?: number;  // for periscopes
  height?: number;     // for periscopes/watchtowers
}

export interface AttractorState {
  x: number;
  y: number;
  time: number;
  pattern: AttractorPattern;
}

export type AttractorPattern = 
  | 'figure8'      // Figure-8 pattern (compass style)
  | 'wandering'    // Multi-sine organic wandering (solar panel style)
  | 'skyArc'       // Horizontal sweep across top
  | 'groundSweep'  // Horizontal sweep across bottom
  | 'orbital'      // Circular orbit around center
  | 'randomWalk'   // Gentle random direction changes
  | 'bounce';      // Bouncing within bounds

export interface RenderContext {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
  primaryColor: { r: number; g: number; b: number };
  secondaryColor: { r: number; g: number; b: number };
  backgroundColor: { r: number; g: number; b: number };
  metallic: number;
  cameraSpeed: number;
  time: number;
}

export interface RendererResult {
  particles: TrackingParticle[];
  attractor: AttractorState;
}
