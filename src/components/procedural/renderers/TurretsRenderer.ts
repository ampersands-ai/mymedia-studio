// Turrets Renderer - Gun turrets with targeting lasers

import { TrackingParticle, RenderContext, AttractorState } from './types';
import { 
  initTrackingGrid, 
  updateAttractor, 
  angleToTarget, 
  distanceToTarget,
  getGridDimensions,
  applySpringRotation
} from './trackingUtils';

export function initTurretsParticles(instanceCount: number): TrackingParticle[] {
  const { cols, rows } = getGridDimensions(Math.min(instanceCount, 120));
  const particles = initTrackingGrid(cols, rows, {
    springinessRange: [0.08, 0.14],
    scaleRange: [0.7, 1.3],
    jitter: 0.02
  });

  particles.forEach(p => {
    p.beamIntensity = 0;
    p.ledOn = false;
  });

  return particles;
}

export function updateTurretsAttractor(current: AttractorState, speed: number): AttractorState {
  return updateAttractor({ ...current, pattern: 'randomWalk' }, 0.016, speed * 0.5);
}

export function renderTurrets(
  ctx: RenderContext,
  particles: TrackingParticle[],
  attractor: AttractorState
): void {
  const { ctx: c, width, height, backgroundColor, metallic, time } = ctx;

  // Dark military background
  const bgGradient = c.createLinearGradient(0, 0, 0, height);
  bgGradient.addColorStop(0, `rgb(${Math.floor(backgroundColor.r * 0.4)}, ${Math.floor(backgroundColor.g * 0.5)}, ${Math.floor(backgroundColor.b * 0.4)})`);
  bgGradient.addColorStop(1, `rgb(${Math.floor(backgroundColor.r * 0.2)}, ${Math.floor(backgroundColor.g * 0.2)}, ${Math.floor(backgroundColor.b * 0.2)})`);
  c.fillStyle = bgGradient;
  c.fillRect(0, 0, width, height);

  // Grid pattern on ground
  c.strokeStyle = 'rgba(100, 100, 100, 0.1)';
  c.lineWidth = 1;
  const gridSpacing = 50;
  for (let x = 0; x < width; x += gridSpacing) {
    c.beginPath();
    c.moveTo(x, 0);
    c.lineTo(x, height);
    c.stroke();
  }
  for (let y = 0; y < height; y += gridSpacing) {
    c.beginPath();
    c.moveTo(0, y);
    c.lineTo(width, y);
    c.stroke();
  }

  const attractorX = attractor.x * width;
  const attractorY = attractor.y * height;

  // Draw targeting lasers first
  particles.forEach((particle) => {
    const screenX = particle.x * width;
    const screenY = particle.y * height;
    const dist = distanceToTarget(particle.x, particle.y, attractor.x, attractor.y);

    // Laser only shows when tracking
    if (dist < 0.6) {
      const laserIntensity = 1 - dist / 0.6;
      
      c.strokeStyle = `rgba(255, 0, 0, ${laserIntensity * 0.6})`;
      c.lineWidth = 1;
      c.setLineDash([5, 3]);
      c.beginPath();
      c.moveTo(screenX, screenY);
      c.lineTo(attractorX, attractorY);
      c.stroke();
      c.setLineDash([]);

      // Laser glow
      c.strokeStyle = `rgba(255, 0, 0, ${laserIntensity * 0.2})`;
      c.lineWidth = 4;
      c.beginPath();
      c.moveTo(screenX, screenY);
      c.lineTo(attractorX, attractorY);
      c.stroke();
    }
  });

  // Draw turrets
  particles.forEach((particle) => {
    const screenX = particle.x * width;
    const screenY = particle.y * height;
    
    const targetAngle = angleToTarget(screenX, screenY, attractorX, attractorY);
    applySpringRotation(particle, targetAngle);

    const dist = distanceToTarget(particle.x, particle.y, attractor.x, attractor.y);
    const isTracking = dist < 0.5;
    const size = 20 * particle.scale;

    c.save();
    c.translate(screenX, screenY);

    // Base platform
    c.fillStyle = '#3a3a3a';
    c.beginPath();
    c.arc(0, 0, size * 0.8, 0, Math.PI * 2);
    c.fill();

    // Metallic rim
    c.strokeStyle = `rgba(180, 180, 180, ${metallic})`;
    c.lineWidth = 2;
    c.stroke();

    // Rotating turret
    c.rotate(particle.angle);

    // Turret body
    const bodyGradient = c.createLinearGradient(-size * 0.4, -size * 0.3, size * 0.4, size * 0.3);
    bodyGradient.addColorStop(0, '#5a5a5a');
    bodyGradient.addColorStop(0.5, '#4a4a4a');
    bodyGradient.addColorStop(1, '#3a3a3a');
    
    c.fillStyle = bodyGradient;
    c.beginPath();
    c.roundRect(-size * 0.4, -size * 0.3, size * 0.8, size * 0.6, 4);
    c.fill();

    // Gun barrels
    c.fillStyle = '#2a2a2a';
    const barrelLength = size * 0.9;
    const barrelWidth = size * 0.12;
    
    // Top barrel
    c.beginPath();
    c.roundRect(size * 0.2, -barrelWidth * 1.5, barrelLength, barrelWidth, 2);
    c.fill();
    
    // Bottom barrel
    c.beginPath();
    c.roundRect(size * 0.2, barrelWidth * 0.5, barrelLength, barrelWidth, 2);
    c.fill();

    // Barrel highlights
    c.strokeStyle = `rgba(255, 255, 255, ${metallic * 0.3})`;
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(size * 0.2, -barrelWidth * 1.5);
    c.lineTo(size * 0.2 + barrelLength, -barrelWidth * 1.5);
    c.stroke();
    c.beginPath();
    c.moveTo(size * 0.2, barrelWidth * 0.5);
    c.lineTo(size * 0.2 + barrelLength, barrelWidth * 0.5);
    c.stroke();

    // Muzzle flash when tracking
    if (isTracking && Math.sin(time * 20 + particle.phase) > 0.8) {
      c.fillStyle = `rgba(255, 200, 100, 0.8)`;
      c.beginPath();
      c.arc(size * 0.2 + barrelLength, -barrelWidth, 8, 0, Math.PI * 2);
      c.arc(size * 0.2 + barrelLength, barrelWidth, 8, 0, Math.PI * 2);
      c.fill();
    }

    c.restore();

    // Status LED
    const ledColor = isTracking ? 'rgba(255, 0, 0, 0.9)' : 'rgba(0, 255, 0, 0.5)';
    c.fillStyle = ledColor;
    c.beginPath();
    c.arc(screenX, screenY - size * 0.5, 3, 0, Math.PI * 2);
    c.fill();

    // LED glow
    if (isTracking) {
      c.fillStyle = 'rgba(255, 0, 0, 0.2)';
      c.beginPath();
      c.arc(screenX, screenY - size * 0.5, 8, 0, Math.PI * 2);
      c.fill();
    }
  });

  // Draw target marker
  const targetPulse = 0.5 + Math.sin(time * 4) * 0.5;
  
  // Target reticle
  c.strokeStyle = `rgba(255, 0, 0, ${targetPulse})`;
  c.lineWidth = 2;
  
  // Outer circle
  c.beginPath();
  c.arc(attractorX, attractorY, 30, 0, Math.PI * 2);
  c.stroke();
  
  // Inner circle
  c.beginPath();
  c.arc(attractorX, attractorY, 15, 0, Math.PI * 2);
  c.stroke();
  
  // Crosshairs
  c.beginPath();
  c.moveTo(attractorX - 40, attractorY);
  c.lineTo(attractorX - 20, attractorY);
  c.moveTo(attractorX + 20, attractorY);
  c.lineTo(attractorX + 40, attractorY);
  c.moveTo(attractorX, attractorY - 40);
  c.lineTo(attractorX, attractorY - 20);
  c.moveTo(attractorX, attractorY + 20);
  c.lineTo(attractorX, attractorY + 40);
  c.stroke();

  // Target glow
  const targetGlow = c.createRadialGradient(attractorX, attractorY, 0, attractorX, attractorY, 50);
  targetGlow.addColorStop(0, `rgba(255, 0, 0, ${targetPulse * 0.3})`);
  targetGlow.addColorStop(1, 'transparent');
  c.fillStyle = targetGlow;
  c.beginPath();
  c.arc(attractorX, attractorY, 50, 0, Math.PI * 2);
  c.fill();
}
