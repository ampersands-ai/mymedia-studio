// Radar Renderer - Spinning + tilting radar dishes

import { TrackingParticle, RenderContext, AttractorState, AttractorPattern } from './types';
import { 
  initTrackingGrid, 
  updateAttractor, 
  angleToTarget,
  getGridDimensions 
} from './trackingUtils';

export function initRadarParticles(instanceCount: number): TrackingParticle[] {
  const { cols, rows } = getGridDimensions(Math.min(instanceCount, 80));
  const particles = initTrackingGrid(cols, rows, {
    springinessRange: [0.05, 0.1],
    scaleRange: [0.7, 1.3],
    jitter: 0.02
  });

  particles.forEach(p => {
    p.spinAngle = Math.random() * Math.PI * 2;
    p.elevation = 0.3;
    p.targetElevation = 0.3;
  });

  return particles;
}

export function updateRadarAttractor(current: AttractorState, speed: number, pattern: AttractorPattern = 'trueRandom'): AttractorState {
  return updateAttractor({ ...current, pattern }, 0.016, speed * 0.5);
}

export function renderRadar(
  ctx: RenderContext,
  particles: TrackingParticle[],
  attractor: AttractorState
): void {
  const { ctx: c, width, height, primaryColor, metallic, time } = ctx;

  // Night sky background
  const skyGradient = c.createLinearGradient(0, 0, 0, height);
  skyGradient.addColorStop(0, '#0a0a1a');
  skyGradient.addColorStop(0.6, '#151525');
  skyGradient.addColorStop(1, '#202035');
  c.fillStyle = skyGradient;
  c.fillRect(0, 0, width, height);

  // Stars
  c.fillStyle = 'rgba(255, 255, 255, 0.6)';
  for (let i = 0; i < 100; i++) {
    const starX = (Math.sin(i * 123.456) * 0.5 + 0.5) * width;
    const starY = (Math.cos(i * 234.567) * 0.5 + 0.5) * height * 0.6;
    const starSize = 0.5 + Math.random() * 1.5;
    const twinkle = 0.5 + Math.sin(time * 2 + i) * 0.5;
    c.globalAlpha = twinkle;
    c.beginPath();
    c.arc(starX, starY, starSize, 0, Math.PI * 2);
    c.fill();
  }
  c.globalAlpha = 1;

  // Ground
  c.fillStyle = '#1a1a1a';
  c.fillRect(0, height * 0.75, width, height * 0.25);

  const attractorX = attractor.x * width;
  const attractorY = attractor.y * height;

  // Draw signal blip in sky
  const blipGlow = c.createRadialGradient(attractorX, attractorY, 0, attractorX, attractorY, 30);
  blipGlow.addColorStop(0, `rgba(${primaryColor.r}, ${primaryColor.g}, ${primaryColor.b}, 0.8)`);
  blipGlow.addColorStop(0.5, `rgba(${primaryColor.r}, ${primaryColor.g}, ${primaryColor.b}, 0.3)`);
  blipGlow.addColorStop(1, 'transparent');
  c.fillStyle = blipGlow;
  c.beginPath();
  c.arc(attractorX, attractorY, 30, 0, Math.PI * 2);
  c.fill();

  // Draw radar dishes
  particles.forEach((particle) => {
    const screenX = particle.x * width;
    const screenY = height * 0.75 + (particle.y * height * 0.2);
    
    // Calculate tracking angle and elevation
    const targetAngle = angleToTarget(screenX, screenY, attractorX, attractorY);
    const verticalDist = (screenY - attractorY) / height;
    particle.targetElevation = Math.max(0.2, Math.min(0.8, 0.5 + verticalDist));
    
    // Apply spring physics for both rotation and elevation
    let angleDiff = targetAngle - particle.angle;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    particle.angle += angleDiff * particle.springiness;
    
    particle.elevation = particle.elevation! + (particle.targetElevation! - particle.elevation!) * 0.08;
    
    // Constant spin
    particle.spinAngle = (particle.spinAngle || 0) + 0.02;

    const size = 30 * particle.scale;

    c.save();
    c.translate(screenX, screenY);

    // Support tower
    c.fillStyle = '#3a3a3a';
    c.beginPath();
    c.moveTo(-size * 0.1, 0);
    c.lineTo(-size * 0.15, size * 0.5);
    c.lineTo(size * 0.15, size * 0.5);
    c.lineTo(size * 0.1, 0);
    c.closePath();
    c.fill();

    // Tower crossbeam
    c.fillStyle = '#2a2a2a';
    c.fillRect(-size * 0.2, size * 0.2, size * 0.4, size * 0.08);

    // Rotating base
    c.rotate(particle.angle - Math.PI / 2);
    
    // Draw dish (ellipse to simulate tilt)
    const tiltFactor = particle.elevation!;
    
    // Dish shadow
    c.fillStyle = 'rgba(0, 0, 0, 0.3)';
    c.beginPath();
    c.ellipse(0, -size * 0.3, size * 0.6, size * 0.6 * tiltFactor, 0, 0, Math.PI * 2);
    c.fill();

    // Dish body
    const dishGradient = c.createRadialGradient(0, -size * 0.3, 0, 0, -size * 0.3, size * 0.5);
    dishGradient.addColorStop(0, '#5a5a5a');
    dishGradient.addColorStop(0.5, '#4a4a4a');
    dishGradient.addColorStop(1, '#3a3a3a');
    
    c.fillStyle = dishGradient;
    c.beginPath();
    c.ellipse(0, -size * 0.3, size * 0.5, size * 0.5 * tiltFactor, 0, 0, Math.PI * 2);
    c.fill();

    // Dish rim
    c.strokeStyle = `rgba(200, 200, 200, ${metallic})`;
    c.lineWidth = 2;
    c.stroke();

    // Feed horn (antenna at center)
    c.fillStyle = '#2a2a2a';
    c.beginPath();
    c.moveTo(0, -size * 0.1);
    c.lineTo(-size * 0.05, -size * 0.3 + size * 0.2 * tiltFactor);
    c.lineTo(size * 0.05, -size * 0.3 + size * 0.2 * tiltFactor);
    c.closePath();
    c.fill();

    // Spinning element indicator
    const spinX = Math.cos(particle.spinAngle!) * size * 0.35;
    const spinY = Math.sin(particle.spinAngle!) * size * 0.35 * tiltFactor - size * 0.3;
    
    c.fillStyle = `rgba(${primaryColor.r}, ${primaryColor.g}, ${primaryColor.b}, 0.8)`;
    c.beginPath();
    c.arc(spinX, spinY, 3, 0, Math.PI * 2);
    c.fill();

    // Status lights
    c.restore();

    // Green operational LED
    c.fillStyle = 'rgba(0, 255, 0, 0.8)';
    c.beginPath();
    c.arc(screenX, screenY + size * 0.4, 2, 0, Math.PI * 2);
    c.fill();
  });

  // Draw detection wave from blip
  const wavePhase = (time * 2) % 1;
  c.strokeStyle = `rgba(${primaryColor.r}, ${primaryColor.g}, ${primaryColor.b}, ${1 - wavePhase})`;
  c.lineWidth = 2;
  c.beginPath();
  c.arc(attractorX, attractorY, 20 + wavePhase * 50, 0, Math.PI * 2);
  c.stroke();
}
