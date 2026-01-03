// Shared utility functions for tracking-based visualizations

import { TrackingParticle, AttractorState } from './types';

/**
 * Initialize a grid of tracking particles
 */
export function initTrackingGrid(
  cols: number, 
  rows: number,
  options: {
    springinessRange?: [number, number];
    scaleRange?: [number, number];
    jitter?: number;
  } = {}
): TrackingParticle[] {
  const {
    springinessRange = [0.06, 0.12],
    scaleRange = [0.8, 1.2],
    jitter = 0
  } = options;

  const particles: TrackingParticle[] = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const baseX = (col + 0.5) / cols;
      const baseY = (row + 0.5) / rows;
      
      // Add optional jitter
      const x = baseX + (Math.random() - 0.5) * jitter;
      const y = baseY + (Math.random() - 0.5) * jitter;

      particles.push({
        x: Math.max(0, Math.min(1, x)),
        y: Math.max(0, Math.min(1, y)),
        angle: 0,
        targetAngle: 0,
        springiness: springinessRange[0] + Math.random() * (springinessRange[1] - springinessRange[0]),
        scale: scaleRange[0] + Math.random() * (scaleRange[1] - scaleRange[0]),
        phase: Math.random() * Math.PI * 2,
        intensity: 0.5 + Math.random() * 0.5,
      });
    }
  }

  return particles;
}

/**
 * Initialize a radial grid of tracking particles
 */
export function initRadialGrid(
  rings: number,
  particlesPerRing: number,
  options: {
    springinessRange?: [number, number];
    scaleRange?: [number, number];
    minRadius?: number;
    maxRadius?: number;
  } = {}
): TrackingParticle[] {
  const {
    springinessRange = [0.06, 0.12],
    scaleRange = [0.8, 1.2],
    minRadius = 0.1,
    maxRadius = 0.45
  } = options;

  const particles: TrackingParticle[] = [];

  for (let ring = 0; ring < rings; ring++) {
    const radius = minRadius + (ring / (rings - 1)) * (maxRadius - minRadius);
    const count = Math.floor(particlesPerRing * (0.5 + ring / rings * 0.5));
    
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const x = 0.5 + Math.cos(angle) * radius;
      const y = 0.5 + Math.sin(angle) * radius;

      particles.push({
        x,
        y,
        angle: 0,
        targetAngle: 0,
        springiness: springinessRange[0] + Math.random() * (springinessRange[1] - springinessRange[0]),
        scale: scaleRange[0] + Math.random() * (scaleRange[1] - scaleRange[0]),
        phase: angle,
        intensity: 0.5 + Math.random() * 0.5,
      });
    }
  }

  return particles;
}

/**
 * Calculate attractor position based on pattern
 */
export function updateAttractor(
  current: AttractorState,
  deltaTime: number,
  speed: number
): AttractorState {
  const t = current.time + deltaTime * speed;
  let x = 0.5;
  let y = 0.5;

  switch (current.pattern) {
    case 'figure8':
      // Smooth figure-8 pattern
      x = 0.5 + Math.sin(t * 0.5) * 0.35;
      y = 0.5 + Math.sin(t) * Math.cos(t * 0.5) * 0.25;
      break;

    case 'wandering':
      // Multi-sine organic wandering (solar panel style)
      x = 0.5 + 
        Math.sin(t * 0.7) * 0.35 + 
        Math.sin(t * 1.3 + 1.5) * 0.12 + 
        Math.cos(t * 0.4 + 0.8) * 0.08;
      y = 0.5 + 
        Math.cos(t * 0.5) * 0.35 + 
        Math.sin(t * 0.9 + 2.1) * 0.12 + 
        Math.cos(t * 1.1 + 0.5) * 0.08;
      break;

    case 'skyArc':
      // Horizontal sweep across top of screen
      x = 0.5 + Math.sin(t * 0.3) * 0.45;
      y = 0.15 + Math.sin(t * 0.6) * 0.1;
      break;

    case 'groundSweep':
      // Horizontal sweep across bottom area
      x = 0.5 + Math.sin(t * 0.4) * 0.4;
      y = 0.7 + Math.sin(t * 0.2) * 0.15;
      break;

    case 'orbital':
      // Circular orbit around center
      x = 0.5 + Math.cos(t * 0.4) * 0.35;
      y = 0.5 + Math.sin(t * 0.4) * 0.35;
      break;

    case 'randomWalk':
      // Gentle random-ish movement using prime numbers for organic feel
      x = 0.5 + Math.sin(t * 0.31) * 0.25 + Math.sin(t * 0.71) * 0.15;
      y = 0.5 + Math.cos(t * 0.43) * 0.25 + Math.cos(t * 0.67) * 0.15;
      break;

    case 'bounce':
      // Bouncing ball pattern
      x = 0.5 + Math.sin(t * 0.5) * 0.4;
      y = 0.5 + Math.abs(Math.sin(t * 0.8)) * 0.35 - 0.175;
      break;
  }

  // Clamp to safe bounds
  x = Math.max(0.05, Math.min(0.95, x));
  y = Math.max(0.05, Math.min(0.95, y));

  return { x, y, time: t, pattern: current.pattern };
}

/**
 * Apply springy rotation toward target angle
 */
export function applySpringRotation(
  particle: TrackingParticle, 
  targetAngle: number
): void {
  const delayedTarget = targetAngle;
  
  // Calculate shortest rotation direction
  let angleDiff = delayedTarget - particle.angle;
  while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
  while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
  
  // Apply spring physics
  particle.angle += angleDiff * particle.springiness;
}

/**
 * Calculate angle from particle to target
 */
export function angleToTarget(
  particleX: number,
  particleY: number,
  targetX: number,
  targetY: number
): number {
  return Math.atan2(targetY - particleY, targetX - particleX);
}

/**
 * Calculate distance from particle to target (normalized 0-1)
 */
export function distanceToTarget(
  particleX: number,
  particleY: number,
  targetX: number,
  targetY: number
): number {
  const dx = targetX - particleX;
  const dy = targetY - particleY;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Get grid dimensions based on instance count
 */
export function getGridDimensions(instanceCount: number): { cols: number; rows: number } {
  const aspectRatio = 16 / 9;
  const total = Math.min(instanceCount, 400); // Cap for performance
  const rows = Math.round(Math.sqrt(total / aspectRatio));
  const cols = Math.round(rows * aspectRatio);
  return { cols: Math.max(4, cols), rows: Math.max(3, rows) };
}

/**
 * Hex color to RGB
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 128, g: 128, b: 128 };
}

/**
 * Lerp between two values
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Clamp value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
