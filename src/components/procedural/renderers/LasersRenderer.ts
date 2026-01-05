// Lasers Renderer - Grid of laser beams converging on target

import { TrackingParticle, RenderContext, AttractorState, AttractorPattern } from './types';
import { 
  initTrackingGrid, 
  updateAttractor, 
  getGridDimensions 
} from './trackingUtils';

export function initLasersParticles(instanceCount: number): TrackingParticle[] {
  const { cols, rows } = getGridDimensions(Math.min(instanceCount, 200));
  const particles = initTrackingGrid(cols, rows, {
    springinessRange: [0.1, 0.18],
    scaleRange: [0.8, 1.2],
    jitter: 0.02
  });

  particles.forEach(p => {
    p.beamIntensity = 0.5 + Math.random() * 0.5;
  });

  return particles;
}

export function updateLasersAttractor(current: AttractorState, speed: number, pattern: AttractorPattern = 'trueRandom'): AttractorState {
  return updateAttractor({ ...current, pattern }, 0.016, speed * 0.7);
}

export function renderLasers(
  ctx: RenderContext,
  particles: TrackingParticle[],
  attractor: AttractorState
): void {
  const { ctx: c, width, height, primaryColor, backgroundColor, metallic, time } = ctx;

  // Dark background
  c.fillStyle = `rgb(${Math.floor(backgroundColor.r * 0.3)}, ${Math.floor(backgroundColor.g * 0.3)}, ${Math.floor(backgroundColor.b * 0.3)})`;
  c.fillRect(0, 0, width, height);

  const attractorX = attractor.x * width;
  const attractorY = attractor.y * height;

  // Draw laser beams first (behind emitters)
  particles.forEach((particle) => {
    const screenX = particle.x * width;
    const screenY = particle.y * height;
    
    // Pulse effect
    const pulsePhase = time * 3 + particle.phase;
    const pulse = 0.7 + Math.sin(pulsePhase) * 0.3;
    const intensity = (particle.beamIntensity || 0.8) * pulse;

    // Draw laser beam
    const beamGradient = c.createLinearGradient(screenX, screenY, attractorX, attractorY);
    beamGradient.addColorStop(0, `rgba(${primaryColor.r}, ${primaryColor.g}, ${primaryColor.b}, ${intensity * 0.8})`);
    beamGradient.addColorStop(0.8, `rgba(${primaryColor.r}, ${primaryColor.g}, ${primaryColor.b}, ${intensity * 0.4})`);
    beamGradient.addColorStop(1, `rgba(255, 255, 255, ${intensity})`);

    // Main beam
    c.strokeStyle = beamGradient;
    c.lineWidth = 2 + intensity;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(screenX, screenY);
    c.lineTo(attractorX, attractorY);
    c.stroke();

    // Glow around beam
    c.strokeStyle = `rgba(${primaryColor.r}, ${primaryColor.g}, ${primaryColor.b}, ${intensity * 0.2})`;
    c.lineWidth = 6 + intensity * 2;
    c.beginPath();
    c.moveTo(screenX, screenY);
    c.lineTo(attractorX, attractorY);
    c.stroke();
  });

  // Draw emitters (laser sources)
  particles.forEach((particle) => {
    const screenX = particle.x * width;
    const screenY = particle.y * height;
    const size = 6 * particle.scale;

    // Emitter base
    c.fillStyle = '#333';
    c.beginPath();
    c.arc(screenX, screenY, size, 0, Math.PI * 2);
    c.fill();

    // Glowing core
    const pulsePhase = time * 3 + particle.phase;
    const pulse = 0.7 + Math.sin(pulsePhase) * 0.3;
    
    const coreGradient = c.createRadialGradient(screenX, screenY, 0, screenX, screenY, size * 0.8);
    coreGradient.addColorStop(0, `rgba(${primaryColor.r}, ${primaryColor.g}, ${primaryColor.b}, ${pulse})`);
    coreGradient.addColorStop(0.5, `rgba(${primaryColor.r * 0.8}, ${primaryColor.g * 0.8}, ${primaryColor.b * 0.8}, ${pulse * 0.5})`);
    coreGradient.addColorStop(1, 'transparent');
    
    c.fillStyle = coreGradient;
    c.beginPath();
    c.arc(screenX, screenY, size * 0.8, 0, Math.PI * 2);
    c.fill();

    // Metallic ring
    c.strokeStyle = `rgba(255, 255, 255, ${metallic * 0.5})`;
    c.lineWidth = 1;
    c.beginPath();
    c.arc(screenX, screenY, size, 0, Math.PI * 2);
    c.stroke();
  });

  // Draw intense convergence point
  const convergenceIntensity = 0.8 + Math.sin(time * 5) * 0.2;
  
  // Outer glow
  const outerGlow = c.createRadialGradient(attractorX, attractorY, 0, attractorX, attractorY, 80);
  outerGlow.addColorStop(0, `rgba(255, 255, 255, ${convergenceIntensity})`);
  outerGlow.addColorStop(0.2, `rgba(${primaryColor.r}, ${primaryColor.g}, ${primaryColor.b}, ${convergenceIntensity * 0.8})`);
  outerGlow.addColorStop(0.5, `rgba(${primaryColor.r}, ${primaryColor.g}, ${primaryColor.b}, ${convergenceIntensity * 0.3})`);
  outerGlow.addColorStop(1, 'transparent');
  
  c.fillStyle = outerGlow;
  c.beginPath();
  c.arc(attractorX, attractorY, 80, 0, Math.PI * 2);
  c.fill();

  // Core
  c.fillStyle = `rgba(255, 255, 255, ${convergenceIntensity})`;
  c.beginPath();
  c.arc(attractorX, attractorY, 8, 0, Math.PI * 2);
  c.fill();

  // Electric arcs around convergence point
  c.strokeStyle = `rgba(${primaryColor.r}, ${primaryColor.g}, ${primaryColor.b}, ${convergenceIntensity * 0.6})`;
  c.lineWidth = 1;
  for (let i = 0; i < 6; i++) {
    const arcAngle = (i / 6) * Math.PI * 2 + time * 2;
    const arcLength = 20 + Math.sin(time * 5 + i) * 10;
    
    c.beginPath();
    c.moveTo(attractorX + Math.cos(arcAngle) * 12, attractorY + Math.sin(arcAngle) * 12);
    
    // Jagged arc
    let x = attractorX + Math.cos(arcAngle) * 12;
    let y = attractorY + Math.sin(arcAngle) * 12;
    for (let j = 0; j < 4; j++) {
      x += Math.cos(arcAngle) * (arcLength / 4) + (Math.random() - 0.5) * 8;
      y += Math.sin(arcAngle) * (arcLength / 4) + (Math.random() - 0.5) * 8;
      c.lineTo(x, y);
    }
    c.stroke();
  }
}
