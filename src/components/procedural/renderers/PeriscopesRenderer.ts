// Periscopes Renderer - Submarine periscopes emerging from water

import { TrackingParticle, RenderContext, AttractorState } from './types';
import { 
  initTrackingGrid, 
  updateAttractor, 
  angleToTarget, 
  distanceToTarget,
  getGridDimensions,
  applySpringRotation
} from './trackingUtils';

export function initPeriscopesParticles(instanceCount: number): TrackingParticle[] {
  const { cols, rows } = getGridDimensions(Math.min(instanceCount, 80));
  const particles = initTrackingGrid(cols, rows, {
    springinessRange: [0.06, 0.12],
    scaleRange: [0.7, 1.3],
    jitter: 0.03
  });

  particles.forEach(p => {
    p.height = 0.5 + Math.random() * 0.5;
    p.bobOffset = Math.random() * Math.PI * 2;
  });

  return particles;
}

export function updatePeriscopesAttractor(current: AttractorState, speed: number): AttractorState {
  return updateAttractor({ ...current, pattern: 'trueRandom' }, 0.016, speed * 0.5);
}

export function renderPeriscopes(
  ctx: RenderContext,
  particles: TrackingParticle[],
  attractor: AttractorState
): void {
  const { ctx: c, width, height, primaryColor, secondaryColor, metallic, time } = ctx;

  // Sky
  const skyGradient = c.createLinearGradient(0, 0, 0, height * 0.5);
  skyGradient.addColorStop(0, '#6BB3F8');
  skyGradient.addColorStop(1, '#B8D4E8');
  c.fillStyle = skyGradient;
  c.fillRect(0, 0, width, height * 0.5);

  // Ocean
  const oceanGradient = c.createLinearGradient(0, height * 0.5, 0, height);
  oceanGradient.addColorStop(0, '#2980B9');
  oceanGradient.addColorStop(0.3, '#1A5276');
  oceanGradient.addColorStop(1, '#0E3D54');
  c.fillStyle = oceanGradient;
  c.fillRect(0, height * 0.5, width, height * 0.5);

  // Water surface waves
  c.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  c.lineWidth = 2;
  for (let w = 0; w < 5; w++) {
    const waveY = height * 0.5 + w * 15;
    c.beginPath();
    c.moveTo(0, waveY);
    for (let x = 0; x < width; x += 20) {
      const waveOffset = Math.sin(x * 0.02 + time + w * 0.5) * 5;
      c.lineTo(x, waveY + waveOffset);
    }
    c.stroke();
  }

  const attractorX = attractor.x * width;
  const attractorY = attractor.y * height;

  // Draw periscopes
  particles.forEach((particle) => {
    const screenX = particle.x * width;
    const waterY = height * 0.5;
    
    // Bobbing motion
    const bobAmount = Math.sin(time * 1.5 + particle.bobOffset!) * 5;
    const baseY = waterY + 20 + bobAmount;
    
    // Calculate rotation toward target
    const targetAngle = angleToTarget(screenX, baseY - 40, attractorX, attractorY);
    applySpringRotation(particle, targetAngle);

    const dist = distanceToTarget(particle.x, 0.5, attractor.x, attractor.y);
    const isLooking = dist < 0.4;

    const periscopeHeight = 60 * particle.height! * particle.scale;
    const tubeWidth = 8 * particle.scale;

    c.save();
    c.translate(screenX, baseY);

    // Periscope tube (vertical)
    const tubeGradient = c.createLinearGradient(-tubeWidth, 0, tubeWidth, 0);
    tubeGradient.addColorStop(0, '#3a3a3a');
    tubeGradient.addColorStop(0.3, '#5a5a5a');
    tubeGradient.addColorStop(0.7, '#4a4a4a');
    tubeGradient.addColorStop(1, '#3a3a3a');
    
    c.fillStyle = tubeGradient;
    c.beginPath();
    c.roundRect(-tubeWidth / 2, -periscopeHeight, tubeWidth, periscopeHeight + 30, 3);
    c.fill();

    // Metallic highlights
    c.strokeStyle = `rgba(255, 255, 255, ${metallic * 0.3})`;
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(-tubeWidth / 2 + 2, -periscopeHeight + 5);
    c.lineTo(-tubeWidth / 2 + 2, 20);
    c.stroke();

    // Rotating head
    c.translate(0, -periscopeHeight);
    c.rotate(particle.angle - Math.PI / 2);

    // Head housing
    c.fillStyle = '#4a4a4a';
    c.beginPath();
    c.ellipse(0, 0, tubeWidth * 1.2, tubeWidth * 0.8, 0, 0, Math.PI * 2);
    c.fill();

    // Viewport
    c.fillStyle = '#1a3040';
    c.beginPath();
    c.ellipse(tubeWidth * 0.7, 0, tubeWidth * 0.5, tubeWidth * 0.4, 0, 0, Math.PI * 2);
    c.fill();

    // Lens reflection
    if (isLooking) {
      c.fillStyle = `rgba(${primaryColor.r}, ${primaryColor.g}, ${primaryColor.b}, 0.4)`;
      c.beginPath();
      c.ellipse(tubeWidth * 0.6, -tubeWidth * 0.1, tubeWidth * 0.2, tubeWidth * 0.15, 0, 0, Math.PI * 2);
      c.fill();
    }

    c.restore();

    // Water splash around periscope
    c.fillStyle = 'rgba(255, 255, 255, 0.3)';
    const splashRadius = 15 + bobAmount * 0.5;
    c.beginPath();
    c.ellipse(screenX, waterY, splashRadius, 5, 0, 0, Math.PI * 2);
    c.fill();

    // Ripples
    c.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    c.lineWidth = 1;
    for (let r = 0; r < 2; r++) {
      const ripplePhase = (time * 0.5 + r * 0.5 + particle.phase) % 1;
      const rippleRadius = splashRadius + ripplePhase * 30;
      c.globalAlpha = 1 - ripplePhase;
      c.beginPath();
      c.ellipse(screenX, waterY, rippleRadius, 4 + ripplePhase * 2, 0, 0, Math.PI * 2);
      c.stroke();
    }
    c.globalAlpha = 1;
  });

  // Draw point of interest
  const poiPulse = 0.5 + Math.sin(time * 2) * 0.5;
  
  c.fillStyle = `rgba(${secondaryColor.r}, ${secondaryColor.g}, ${secondaryColor.b}, ${poiPulse * 0.5})`;
  c.beginPath();
  c.arc(attractorX, attractorY, 20, 0, Math.PI * 2);
  c.fill();

  c.strokeStyle = `rgba(${secondaryColor.r}, ${secondaryColor.g}, ${secondaryColor.b}, ${poiPulse})`;
  c.lineWidth = 2;
  c.beginPath();
  c.arc(attractorX, attractorY, 15, 0, Math.PI * 2);
  c.stroke();

  // Binoculars icon
  c.fillStyle = `rgba(${secondaryColor.r}, ${secondaryColor.g}, ${secondaryColor.b}, ${poiPulse})`;
  c.beginPath();
  c.arc(attractorX - 6, attractorY, 5, 0, Math.PI * 2);
  c.arc(attractorX + 6, attractorY, 5, 0, Math.PI * 2);
  c.fill();
}
