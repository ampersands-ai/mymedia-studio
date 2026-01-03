// Speakers Renderer - Audio speakers with sound waves

import { TrackingParticle, RenderContext, AttractorState } from './types';
import { 
  initTrackingGrid, 
  updateAttractor, 
  angleToTarget, 
  distanceToTarget,
  getGridDimensions,
  applySpringRotation
} from './trackingUtils';

export function initSpeakersParticles(instanceCount: number): TrackingParticle[] {
  const { cols, rows } = getGridDimensions(Math.min(instanceCount, 100));
  return initTrackingGrid(cols, rows, {
    springinessRange: [0.08, 0.15],
    scaleRange: [0.7, 1.3],
    jitter: 0.02
  });
}

export function updateSpeakersAttractor(current: AttractorState, speed: number): AttractorState {
  return updateAttractor({ ...current, pattern: 'bounce' }, 0.016, speed * 0.7);
}

export function renderSpeakers(
  ctx: RenderContext,
  particles: TrackingParticle[],
  attractor: AttractorState
): void {
  const { ctx: c, width, height, primaryColor, secondaryColor, backgroundColor, metallic, time } = ctx;

  // Industrial dark background
  c.fillStyle = `rgb(${Math.floor(backgroundColor.r * 0.4 + 15)}, ${Math.floor(backgroundColor.g * 0.4 + 15)}, ${Math.floor(backgroundColor.b * 0.4 + 20)})`;
  c.fillRect(0, 0, width, height);

  // Grid texture
  c.strokeStyle = 'rgba(255, 255, 255, 0.02)';
  c.lineWidth = 1;
  for (let x = 0; x < width; x += 30) {
    c.beginPath();
    c.moveTo(x, 0);
    c.lineTo(x, height);
    c.stroke();
  }
  for (let y = 0; y < height; y += 30) {
    c.beginPath();
    c.moveTo(0, y);
    c.lineTo(width, y);
    c.stroke();
  }

  const attractorX = attractor.x * width;
  const attractorY = attractor.y * height;

  // Draw sound source glow
  const bassIntensity = 0.5 + Math.sin(time * 8) * 0.5;
  const sourceGlow = c.createRadialGradient(attractorX, attractorY, 0, attractorX, attractorY, 80);
  sourceGlow.addColorStop(0, `rgba(${primaryColor.r}, ${primaryColor.g}, ${primaryColor.b}, ${bassIntensity * 0.8})`);
  sourceGlow.addColorStop(0.5, `rgba(${primaryColor.r}, ${primaryColor.g}, ${primaryColor.b}, ${bassIntensity * 0.3})`);
  sourceGlow.addColorStop(1, 'transparent');
  c.fillStyle = sourceGlow;
  c.beginPath();
  c.arc(attractorX, attractorY, 80, 0, Math.PI * 2);
  c.fill();

  // Sound waves from source
  for (let w = 0; w < 4; w++) {
    const wavePhase = (time * 2 + w * 0.25) % 1;
    const waveRadius = 20 + wavePhase * 100;
    c.strokeStyle = `rgba(${primaryColor.r}, ${primaryColor.g}, ${primaryColor.b}, ${(1 - wavePhase) * 0.3})`;
    c.lineWidth = 2;
    c.beginPath();
    c.arc(attractorX, attractorY, waveRadius, 0, Math.PI * 2);
    c.stroke();
  }

  // Draw speakers
  particles.forEach((particle) => {
    const screenX = particle.x * width;
    const screenY = particle.y * height;
    
    const targetAngle = angleToTarget(screenX, screenY, attractorX, attractorY);
    applySpringRotation(particle, targetAngle);

    const dist = distanceToTarget(particle.x, particle.y, attractor.x, attractor.y);
    
    // Speaker responds to "sound" when source is close
    const soundIntensity = Math.max(0, 1 - dist * 2);
    const coneMovement = soundIntensity * Math.sin(time * 15 + particle.phase) * 3;

    const size = 30 * particle.scale;

    c.save();
    c.translate(screenX, screenY);
    c.rotate(particle.angle);

    // Speaker cabinet
    const cabinetGradient = c.createLinearGradient(-size, -size, size, size);
    cabinetGradient.addColorStop(0, '#2a2a2a');
    cabinetGradient.addColorStop(0.5, '#3a3a3a');
    cabinetGradient.addColorStop(1, '#252525');
    
    c.fillStyle = cabinetGradient;
    c.beginPath();
    c.roundRect(-size * 0.9, -size * 0.9, size * 1.8, size * 1.8, 5);
    c.fill();

    // Cabinet edge
    c.strokeStyle = `rgba(100, 100, 100, ${metallic})`;
    c.lineWidth = 2;
    c.stroke();

    // Speaker cone
    const coneGradient = c.createRadialGradient(coneMovement, 0, 0, coneMovement, 0, size * 0.7);
    coneGradient.addColorStop(0, '#1a1a1a');
    coneGradient.addColorStop(0.3, '#2a2a2a');
    coneGradient.addColorStop(0.7, '#3a3a3a');
    coneGradient.addColorStop(1, '#4a4a4a');
    
    c.fillStyle = coneGradient;
    c.beginPath();
    c.arc(coneMovement, 0, size * 0.7, 0, Math.PI * 2);
    c.fill();

    // Cone rim
    c.strokeStyle = '#505050';
    c.lineWidth = 3;
    c.stroke();

    // Dust cap
    c.fillStyle = '#1a1a1a';
    c.beginPath();
    c.arc(coneMovement * 1.5, 0, size * 0.2, 0, Math.PI * 2);
    c.fill();

    // Dust cap highlight
    c.fillStyle = `rgba(255, 255, 255, ${metallic * 0.2})`;
    c.beginPath();
    c.arc(coneMovement * 1.5 - size * 0.05, -size * 0.05, size * 0.08, 0, Math.PI * 2);
    c.fill();

    // Cone ridges (concentric circles)
    c.strokeStyle = 'rgba(60, 60, 60, 0.5)';
    c.lineWidth = 1;
    for (let r = 0.3; r <= 0.6; r += 0.15) {
      c.beginPath();
      c.arc(coneMovement * (1 - r), 0, size * r, 0, Math.PI * 2);
      c.stroke();
    }

    // Active indicator LED
    const ledColor = soundIntensity > 0.3 ? `rgba(${primaryColor.r}, ${primaryColor.g}, ${primaryColor.b}, 1)` : 'rgba(50, 50, 50, 1)';
    c.fillStyle = ledColor;
    c.beginPath();
    c.arc(-size * 0.7, -size * 0.7, 3, 0, Math.PI * 2);
    c.fill();

    if (soundIntensity > 0.3) {
      c.fillStyle = `rgba(${primaryColor.r}, ${primaryColor.g}, ${primaryColor.b}, 0.3)`;
      c.beginPath();
      c.arc(-size * 0.7, -size * 0.7, 8, 0, Math.PI * 2);
      c.fill();
    }

    c.restore();

    // Sound waves toward source when active
    if (soundIntensity > 0.2) {
      for (let sw = 0; sw < 2; sw++) {
        const swPhase = (time * 3 + sw * 0.3 + particle.phase) % 1;
        const swDist = swPhase * dist * Math.min(width, height) * 0.5;
        const swX = screenX + Math.cos(particle.angle) * swDist;
        const swY = screenY + Math.sin(particle.angle) * swDist;
        
        c.strokeStyle = `rgba(${secondaryColor.r}, ${secondaryColor.g}, ${secondaryColor.b}, ${(1 - swPhase) * soundIntensity * 0.3})`;
        c.lineWidth = 2;
        c.beginPath();
        c.arc(swX, swY, 10 + swPhase * 15, particle.angle - 0.5, particle.angle + 0.5);
        c.stroke();
      }
    }
  });

  // Sound source marker
  c.fillStyle = `rgba(${primaryColor.r}, ${primaryColor.g}, ${primaryColor.b}, ${bassIntensity})`;
  c.beginPath();
  c.arc(attractorX, attractorY, 12, 0, Math.PI * 2);
  c.fill();

  // Musical note icon
  c.font = '20px serif';
  c.fillText('♪', attractorX - 7, attractorY + 7);
}
