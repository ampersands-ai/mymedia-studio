// Satellites Renderer - VLA-style satellite dish array

import { TrackingParticle, RenderContext, AttractorState, AttractorPattern } from './types';
import { 
  initTrackingGrid, 
  updateAttractor, 
  distanceToTarget,
  getGridDimensions 
} from './trackingUtils';

export function initSatellitesParticles(instanceCount: number): TrackingParticle[] {
  const { cols, rows } = getGridDimensions(Math.min(instanceCount, 60));
  const particles = initTrackingGrid(cols, rows, {
    springinessRange: [0.03, 0.07],
    scaleRange: [0.8, 1.2],
    jitter: 0.02
  });

  particles.forEach(p => {
    p.elevation = 0.5;
    p.targetElevation = 0.5;
  });

  return particles;
}

export function updateSatellitesAttractor(current: AttractorState, speed: number, pattern: AttractorPattern = 'trueRandom'): AttractorState {
  return updateAttractor({ ...current, pattern }, 0.016, speed * 0.3);
}

export function renderSatellites(
  ctx: RenderContext,
  particles: TrackingParticle[],
  attractor: AttractorState
): void {
  const { ctx: c, width, height, primaryColor, metallic, time } = ctx;

  // Night desert sky
  const skyGradient = c.createLinearGradient(0, 0, 0, height);
  skyGradient.addColorStop(0, '#0a0520');
  skyGradient.addColorStop(0.3, '#150a30');
  skyGradient.addColorStop(0.7, '#201040');
  skyGradient.addColorStop(1, '#352050');
  c.fillStyle = skyGradient;
  c.fillRect(0, 0, width, height);

  // Milky way effect
  c.fillStyle = 'rgba(200, 180, 255, 0.03)';
  c.beginPath();
  c.ellipse(width * 0.3, height * 0.2, width * 0.5, height * 0.15, -0.3, 0, Math.PI * 2);
  c.fill();

  // Stars
  for (let i = 0; i < 200; i++) {
    const starX = (Math.sin(i * 123.456 + 45) * 0.5 + 0.5) * width;
    const starY = (Math.cos(i * 234.567 + 78) * 0.5 + 0.5) * height * 0.7;
    const starSize = 0.3 + Math.random() * 1.2;
    const twinkle = 0.4 + Math.sin(time * 1.5 + i * 0.7) * 0.6;
    
    c.fillStyle = `rgba(255, 255, 255, ${twinkle})`;
    c.beginPath();
    c.arc(starX, starY, starSize, 0, Math.PI * 2);
    c.fill();
  }

  // Desert ground
  const groundGradient = c.createLinearGradient(0, height * 0.7, 0, height);
  groundGradient.addColorStop(0, '#3a2820');
  groundGradient.addColorStop(1, '#2a1810');
  c.fillStyle = groundGradient;
  c.fillRect(0, height * 0.7, width, height * 0.3);

  const attractorX = attractor.x * width;
  const attractorY = attractor.y * height * 0.3; // Keep in sky

  // Draw cosmic signal source
  const signalPulse = 0.5 + Math.sin(time * 2) * 0.5;
  const signalGlow = c.createRadialGradient(attractorX, attractorY, 0, attractorX, attractorY, 60);
  signalGlow.addColorStop(0, `rgba(${primaryColor.r}, ${primaryColor.g}, ${primaryColor.b}, ${signalPulse})`);
  signalGlow.addColorStop(0.3, `rgba(${primaryColor.r}, ${primaryColor.g}, ${primaryColor.b}, ${signalPulse * 0.5})`);
  signalGlow.addColorStop(1, 'transparent');
  c.fillStyle = signalGlow;
  c.beginPath();
  c.arc(attractorX, attractorY, 60, 0, Math.PI * 2);
  c.fill();

  // Radio waves emanating from source
  for (let w = 0; w < 3; w++) {
    const wavePhase = ((time * 0.5 + w * 0.3) % 1);
    const waveRadius = 30 + wavePhase * 100;
    c.strokeStyle = `rgba(${primaryColor.r}, ${primaryColor.g}, ${primaryColor.b}, ${(1 - wavePhase) * 0.3})`;
    c.lineWidth = 1;
    c.beginPath();
    c.arc(attractorX, attractorY, waveRadius, 0, Math.PI * 2);
    c.stroke();
  }

  // Draw satellite dishes
  particles.forEach((particle) => {
    const screenX = particle.x * width;
    const groundY = height * 0.7 + particle.y * height * 0.25;
    
    // Calculate tracking
    const dx = attractorX - screenX;
    const dy = attractorY - groundY;
    const targetAngle = Math.atan2(dx, Math.abs(dy));
    const targetElevation = Math.atan2(-dy, Math.sqrt(dx * dx + dy * dy)) / (Math.PI / 2);
    
    // Apply spring physics
    let angleDiff = targetAngle - particle.angle;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    particle.angle += angleDiff * particle.springiness;
    
    particle.targetElevation = Math.max(0.1, Math.min(0.9, targetElevation));
    particle.elevation = particle.elevation! + (particle.targetElevation! - particle.elevation!) * 0.05;

    const size = 40 * particle.scale;

    c.save();
    c.translate(screenX, groundY);

    // Y-shaped support structure
    c.strokeStyle = '#606060';
    c.lineWidth = 3;
    
    // Main vertical post
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(0, -size * 0.8);
    c.stroke();

    // Support legs
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(-size * 0.3, size * 0.3);
    c.moveTo(0, 0);
    c.lineTo(size * 0.3, size * 0.3);
    c.stroke();

    // Rotating mount
    c.translate(0, -size * 0.8);
    c.rotate(particle.angle);

    // Draw dish (3D-ish with tilt)
    const tiltFactor = particle.elevation!;
    
    // Dish back
    c.fillStyle = '#4a4a4a';
    c.beginPath();
    c.ellipse(0, 0, size * 0.5, size * 0.5 * tiltFactor, 0, 0, Math.PI * 2);
    c.fill();

    // Dish front (concave effect)
    const dishGradient = c.createRadialGradient(0, 0, 0, 0, 0, size * 0.45);
    dishGradient.addColorStop(0, '#707070');
    dishGradient.addColorStop(0.7, '#505050');
    dishGradient.addColorStop(1, '#404040');
    
    c.fillStyle = dishGradient;
    c.beginPath();
    c.ellipse(0, 0, size * 0.45, size * 0.45 * tiltFactor, 0, 0, Math.PI * 2);
    c.fill();

    // Dish rim highlight
    c.strokeStyle = `rgba(255, 255, 255, ${metallic * 0.4})`;
    c.lineWidth = 2;
    c.beginPath();
    c.ellipse(0, 0, size * 0.48, size * 0.48 * tiltFactor, 0, 0, Math.PI * 2);
    c.stroke();

    // Feed arm and receiver
    c.strokeStyle = '#505050';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(-size * 0.3 * tiltFactor, 0);
    c.lineTo(0, -size * 0.4);
    c.lineTo(size * 0.3 * tiltFactor, 0);
    c.stroke();

    // Receiver cone
    c.fillStyle = '#303030';
    c.beginPath();
    c.arc(0, -size * 0.35, size * 0.08, 0, Math.PI * 2);
    c.fill();

    // Active receiving indicator
    const dist = distanceToTarget(particle.x, groundY / height, attractor.x, attractorY / height);
    const receiving = dist < 0.4;
    if (receiving) {
      c.fillStyle = `rgba(${primaryColor.r}, ${primaryColor.g}, ${primaryColor.b}, ${0.5 + Math.sin(time * 5) * 0.5})`;
      c.beginPath();
      c.arc(0, -size * 0.35, size * 0.12, 0, Math.PI * 2);
      c.fill();
    }

    c.restore();
  });

  // Draw constellation name
  c.fillStyle = `rgba(${primaryColor.r}, ${primaryColor.g}, ${primaryColor.b}, 0.6)`;
  c.font = '12px monospace';
  c.fillText('SIGNAL SOURCE', attractorX - 50, attractorY + 80);
  c.fillText(`RA: ${(attractor.x * 24).toFixed(1)}h`, attractorX - 50, attractorY + 95);
  c.fillText(`DEC: ${((attractor.y - 0.5) * 90).toFixed(1)}°`, attractorX - 50, attractorY + 110);
}
