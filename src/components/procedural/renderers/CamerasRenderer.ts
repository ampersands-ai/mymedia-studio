// Cameras Renderer - Security cameras with red LEDs

import { TrackingParticle, RenderContext, AttractorState, AttractorPattern } from './types';
import { 
  initTrackingGrid, 
  updateAttractor, 
  angleToTarget, 
  distanceToTarget,
  getGridDimensions,
  applySpringRotation
} from './trackingUtils';

export function initCamerasParticles(instanceCount: number): TrackingParticle[] {
  const { cols, rows } = getGridDimensions(Math.min(instanceCount, 100));
  const particles = initTrackingGrid(cols, rows, {
    springinessRange: [0.04, 0.08],
    scaleRange: [0.7, 1.3],
    jitter: 0.03
  });

  particles.forEach(p => {
    p.ledOn = true;
  });

  return particles;
}

export function updateCamerasAttractor(current: AttractorState, speed: number, pattern: AttractorPattern = 'trueRandom'): AttractorState {
  return updateAttractor({ ...current, pattern }, 0.016, speed * 0.4);
}

export function renderCameras(
  ctx: RenderContext,
  particles: TrackingParticle[],
  attractor: AttractorState
): void {
  const { ctx: c, width, height, primaryColor, backgroundColor, metallic, time } = ctx;

  // Industrial concrete background
  c.fillStyle = `rgb(${Math.floor(backgroundColor.r * 0.6 + 40)}, ${Math.floor(backgroundColor.g * 0.6 + 40)}, ${Math.floor(backgroundColor.b * 0.6 + 40)})`;
  c.fillRect(0, 0, width, height);

  // Concrete texture
  c.fillStyle = 'rgba(0, 0, 0, 0.03)';
  for (let i = 0; i < 200; i++) {
    const tx = Math.random() * width;
    const ty = Math.random() * height;
    c.fillRect(tx, ty, 2, 2);
  }

  const attractorX = attractor.x * width;
  const attractorY = attractor.y * height;

  // Draw cameras
  particles.forEach((particle) => {
    const screenX = particle.x * width;
    const screenY = particle.y * height;
    
    const targetAngle = angleToTarget(screenX, screenY, attractorX, attractorY);
    applySpringRotation(particle, targetAngle);

    const dist = distanceToTarget(particle.x, particle.y, attractor.x, attractor.y);
    const isTracking = dist < 0.4;
    const size = 25 * particle.scale;

    c.save();
    c.translate(screenX, screenY);

    // Wall mount
    c.fillStyle = '#4a4a4a';
    c.beginPath();
    c.roundRect(-8, -size * 0.3, 16, size * 0.6, 3);
    c.fill();

    // Arm
    c.fillStyle = '#3a3a3a';
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(size * 0.3, -size * 0.2);
    c.lineTo(size * 0.4, -size * 0.1);
    c.lineTo(size * 0.1, size * 0.1);
    c.closePath();
    c.fill();

    // Rotate for camera head
    c.translate(size * 0.3, 0);
    c.rotate(particle.angle);

    // Camera body (dome style)
    const domeGradient = c.createRadialGradient(0, 0, 0, 0, 0, size * 0.5);
    domeGradient.addColorStop(0, '#5a5a5a');
    domeGradient.addColorStop(0.7, '#3a3a3a');
    domeGradient.addColorStop(1, '#2a2a2a');
    
    c.fillStyle = domeGradient;
    c.beginPath();
    c.arc(0, 0, size * 0.4, 0, Math.PI * 2);
    c.fill();

    // Lens housing
    c.fillStyle = '#1a1a1a';
    c.beginPath();
    c.ellipse(size * 0.25, 0, size * 0.2, size * 0.25, 0, 0, Math.PI * 2);
    c.fill();

    // Lens
    const lensGradient = c.createRadialGradient(size * 0.25, 0, 0, size * 0.25, 0, size * 0.15);
    lensGradient.addColorStop(0, '#2a3a4a');
    lensGradient.addColorStop(0.5, '#1a2a3a');
    lensGradient.addColorStop(1, '#0a1a2a');
    
    c.fillStyle = lensGradient;
    c.beginPath();
    c.arc(size * 0.25, 0, size * 0.12, 0, Math.PI * 2);
    c.fill();

    // Lens reflection
    c.fillStyle = `rgba(255, 255, 255, ${metallic * 0.4})`;
    c.beginPath();
    c.arc(size * 0.22, -size * 0.03, size * 0.04, 0, Math.PI * 2);
    c.fill();

    c.restore();

    // Recording LED (blinks when tracking)
    const ledOn = isTracking ? Math.sin(time * 8 + particle.phase) > 0 : true;
    const ledBrightness = ledOn ? 1 : 0.3;
    
    c.fillStyle = `rgba(255, 0, 0, ${ledBrightness})`;
    c.beginPath();
    c.arc(screenX + size * 0.3, screenY - size * 0.35, 3, 0, Math.PI * 2);
    c.fill();

    // LED glow
    if (ledOn) {
      c.fillStyle = 'rgba(255, 0, 0, 0.15)';
      c.beginPath();
      c.arc(screenX + size * 0.3, screenY - size * 0.35, 10, 0, Math.PI * 2);
      c.fill();
    }

    // Connection status text (small)
    if (isTracking) {
      c.fillStyle = 'rgba(255, 0, 0, 0.6)';
      c.font = '8px monospace';
      c.fillText('REC', screenX + size * 0.4, screenY - size * 0.3);
    }
  });

  // Draw subject indicator
  const subjectPulse = 0.5 + Math.sin(time * 2) * 0.5;
  
  // Subject outline
  c.strokeStyle = `rgba(${primaryColor.r}, ${primaryColor.g}, ${primaryColor.b}, ${subjectPulse * 0.5})`;
  c.lineWidth = 2;
  c.setLineDash([5, 5]);
  c.beginPath();
  c.arc(attractorX, attractorY, 25, 0, Math.PI * 2);
  c.stroke();
  c.setLineDash([]);

  // Corner brackets
  const bracketSize = 35;
  c.strokeStyle = `rgba(${primaryColor.r}, ${primaryColor.g}, ${primaryColor.b}, ${subjectPulse})`;
  c.lineWidth = 2;
  
  // Top-left
  c.beginPath();
  c.moveTo(attractorX - bracketSize, attractorY - bracketSize + 10);
  c.lineTo(attractorX - bracketSize, attractorY - bracketSize);
  c.lineTo(attractorX - bracketSize + 10, attractorY - bracketSize);
  c.stroke();
  
  // Top-right
  c.beginPath();
  c.moveTo(attractorX + bracketSize - 10, attractorY - bracketSize);
  c.lineTo(attractorX + bracketSize, attractorY - bracketSize);
  c.lineTo(attractorX + bracketSize, attractorY - bracketSize + 10);
  c.stroke();
  
  // Bottom-left
  c.beginPath();
  c.moveTo(attractorX - bracketSize, attractorY + bracketSize - 10);
  c.lineTo(attractorX - bracketSize, attractorY + bracketSize);
  c.lineTo(attractorX - bracketSize + 10, attractorY + bracketSize);
  c.stroke();
  
  // Bottom-right
  c.beginPath();
  c.moveTo(attractorX + bracketSize - 10, attractorY + bracketSize);
  c.lineTo(attractorX + bracketSize, attractorY + bracketSize);
  c.lineTo(attractorX + bracketSize, attractorY + bracketSize - 10);
  c.stroke();

  // Subject text
  c.fillStyle = `rgba(${primaryColor.r}, ${primaryColor.g}, ${primaryColor.b}, ${subjectPulse})`;
  c.font = '10px monospace';
  c.fillText('SUBJECT', attractorX - 25, attractorY + bracketSize + 15);
}
