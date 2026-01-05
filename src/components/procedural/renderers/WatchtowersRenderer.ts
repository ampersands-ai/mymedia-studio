// Watchtowers Renderer - Security towers with searchlights

import { TrackingParticle, RenderContext, AttractorState, AttractorPattern } from './types';
import { 
  initTrackingGrid, 
  updateAttractor, 
  angleToTarget, 
  distanceToTarget,
  getGridDimensions,
  applySpringRotation
} from './trackingUtils';

export function initWatchtowersParticles(instanceCount: number): TrackingParticle[] {
  const { cols, rows } = getGridDimensions(Math.min(instanceCount, 50));
  const particles = initTrackingGrid(cols, rows, {
    springinessRange: [0.04, 0.08],
    scaleRange: [0.8, 1.2],
    jitter: 0.02
  });

  particles.forEach(p => {
    p.height = 0.6 + Math.random() * 0.4;
  });

  return particles;
}

export function updateWatchtowersAttractor(current: AttractorState, speed: number, pattern: AttractorPattern = 'trueRandom'): AttractorState {
  return updateAttractor({ ...current, pattern }, 0.016, speed * 0.4);
}

export function renderWatchtowers(
  ctx: RenderContext,
  particles: TrackingParticle[],
  attractor: AttractorState
): void {
  const { ctx: c, width, height, primaryColor, secondaryColor, time } = ctx;

  // Night sky
  const skyGradient = c.createLinearGradient(0, 0, 0, height);
  skyGradient.addColorStop(0, '#0a0a15');
  skyGradient.addColorStop(0.5, '#151520');
  skyGradient.addColorStop(1, '#202030');
  c.fillStyle = skyGradient;
  c.fillRect(0, 0, width, height);

  // Stars
  c.fillStyle = 'rgba(255, 255, 255, 0.5)';
  for (let i = 0; i < 80; i++) {
    const starX = (Math.sin(i * 123) * 0.5 + 0.5) * width;
    const starY = (Math.cos(i * 234) * 0.5 + 0.5) * height * 0.5;
    c.beginPath();
    c.arc(starX, starY, 0.5 + Math.random(), 0, Math.PI * 2);
    c.fill();
  }

  // Ground
  c.fillStyle = '#1a1a1a';
  c.fillRect(0, height * 0.75, width, height * 0.25);

  // Fence
  c.strokeStyle = '#333';
  c.lineWidth = 2;
  for (let x = 0; x < width; x += 25) {
    c.beginPath();
    c.moveTo(x, height * 0.75);
    c.lineTo(x, height * 0.72);
    c.stroke();
  }
  c.beginPath();
  c.moveTo(0, height * 0.73);
  c.lineTo(width, height * 0.73);
  c.stroke();

  const attractorX = attractor.x * width;
  const attractorY = attractor.y * height;

  // Draw searchlight beams first (behind towers)
  particles.forEach((particle) => {
    const screenX = particle.x * width;
    const groundY = height * 0.75 + particle.y * height * 0.15;
    const towerHeight = height * 0.25 * particle.height!;
    const topY = groundY - towerHeight;
    
    const targetAngle = angleToTarget(screenX, topY, attractorX, attractorY);
    applySpringRotation(particle, targetAngle);

    const dist = distanceToTarget(particle.x, topY / height, attractor.x, attractor.y);
    const isTracking = dist < 0.35;

    // Searchlight beam
    const beamLength = height * 0.8;
    const beamWidth = 0.15;
    
    const beamGradient = c.createLinearGradient(
      screenX, topY,
      screenX + Math.cos(particle.angle) * beamLength,
      topY + Math.sin(particle.angle) * beamLength
    );
    
    const beamColor = isTracking ? primaryColor : secondaryColor;
    const beamIntensity = isTracking ? 0.4 : 0.2;
    beamGradient.addColorStop(0, `rgba(${beamColor.r}, ${beamColor.g}, ${beamColor.b}, ${beamIntensity})`);
    beamGradient.addColorStop(0.5, `rgba(${beamColor.r}, ${beamColor.g}, ${beamColor.b}, ${beamIntensity * 0.3})`);
    beamGradient.addColorStop(1, 'transparent');

    c.save();
    c.translate(screenX, topY);
    c.rotate(particle.angle);

    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(beamLength, -beamLength * beamWidth);
    c.lineTo(beamLength, beamLength * beamWidth);
    c.closePath();
    c.fillStyle = beamGradient;
    c.fill();

    c.restore();
  });

  // Draw towers
  particles.forEach((particle) => {
    const screenX = particle.x * width;
    const groundY = height * 0.75 + particle.y * height * 0.15;
    const towerHeight = height * 0.25 * particle.height! * particle.scale;
    const topY = groundY - towerHeight;
    const size = 20 * particle.scale;

    // Tower legs (4 supports)
    c.strokeStyle = '#404040';
    c.lineWidth = 3;
    
    const legSpread = size * 0.8;
    c.beginPath();
    c.moveTo(screenX - legSpread, groundY);
    c.lineTo(screenX - size * 0.3, topY + size);
    c.moveTo(screenX + legSpread, groundY);
    c.lineTo(screenX + size * 0.3, topY + size);
    c.stroke();

    // Cross bracing
    c.strokeStyle = '#353535';
    c.lineWidth = 1;
    for (let b = 0; b < 3; b++) {
      const y1 = groundY - towerHeight * (b / 3);
      const y2 = groundY - towerHeight * ((b + 1) / 3);
      const spread1 = legSpread * (1 - b / 4);
      const spread2 = legSpread * (1 - (b + 1) / 4);
      
      c.beginPath();
      c.moveTo(screenX - spread1, y1);
      c.lineTo(screenX + spread2, y2);
      c.moveTo(screenX + spread1, y1);
      c.lineTo(screenX - spread2, y2);
      c.stroke();
    }

    // Platform
    c.fillStyle = '#3a3a3a';
    c.fillRect(screenX - size * 0.6, topY, size * 1.2, size * 0.3);

    // Spotlight housing
    c.save();
    c.translate(screenX, topY);
    c.rotate(particle.angle - Math.PI / 2);

    c.fillStyle = '#2a2a2a';
    c.beginPath();
    c.arc(0, 0, size * 0.4, 0, Math.PI * 2);
    c.fill();

    // Lens
    const dist = distanceToTarget(particle.x, topY / height, attractor.x, attractor.y);
    const isTracking = dist < 0.35;
    
    c.fillStyle = isTracking ? 
      `rgba(${primaryColor.r}, ${primaryColor.g}, ${primaryColor.b}, 0.9)` : 
      `rgba(${secondaryColor.r}, ${secondaryColor.g}, ${secondaryColor.b}, 0.6)`;
    c.beginPath();
    c.arc(size * 0.2, 0, size * 0.25, 0, Math.PI * 2);
    c.fill();

    c.restore();

    // Warning light on top
    const warningPulse = Math.sin(time * 4 + particle.phase) > 0.5 ? 1 : 0.2;
    c.fillStyle = `rgba(255, 0, 0, ${warningPulse})`;
    c.beginPath();
    c.arc(screenX, topY - size * 0.3, 3, 0, Math.PI * 2);
    c.fill();
  });

  // Draw intruder marker
  const intruderPulse = 0.5 + Math.sin(time * 3) * 0.5;
  
  c.strokeStyle = `rgba(255, 50, 50, ${intruderPulse})`;
  c.lineWidth = 2;
  c.setLineDash([5, 5]);
  c.beginPath();
  c.arc(attractorX, attractorY, 20, 0, Math.PI * 2);
  c.stroke();
  c.setLineDash([]);

  c.fillStyle = `rgba(255, 50, 50, ${intruderPulse * 0.5})`;
  c.beginPath();
  c.arc(attractorX, attractorY, 25, 0, Math.PI * 2);
  c.fill();

  // Alert text
  c.fillStyle = `rgba(255, 50, 50, ${intruderPulse})`;
  c.font = 'bold 10px monospace';
  c.fillText('ALERT', attractorX - 18, attractorY + 35);
}
