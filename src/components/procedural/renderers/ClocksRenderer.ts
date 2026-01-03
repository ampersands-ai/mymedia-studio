// Clocks Renderer - Clock faces with hands pointing to target

import { TrackingParticle, RenderContext, AttractorState } from './types';
import { 
  initTrackingGrid, 
  updateAttractor, 
  angleToTarget,
  getGridDimensions,
  applySpringRotation
} from './trackingUtils';

export function initClocksParticles(instanceCount: number): TrackingParticle[] {
  const { cols, rows } = getGridDimensions(Math.min(instanceCount, 100));
  const particles = initTrackingGrid(cols, rows, {
    springinessRange: [0.06, 0.1],
    scaleRange: [0.8, 1.2],
    jitter: 0.02
  });

  particles.forEach(p => {
    p.handAngle = 0;
  });

  return particles;
}

export function updateClocksAttractor(current: AttractorState, speed: number): AttractorState {
  return updateAttractor({ ...current, pattern: 'orbital' }, 0.016, speed * 0.5);
}

export function renderClocks(
  ctx: RenderContext,
  particles: TrackingParticle[],
  attractor: AttractorState
): void {
  const { ctx: c, width, height, primaryColor, secondaryColor, backgroundColor, metallic, time } = ctx;

  // Sophisticated dark background
  c.fillStyle = `rgb(${Math.floor(backgroundColor.r * 0.5 + 10)}, ${Math.floor(backgroundColor.g * 0.5 + 10)}, ${Math.floor(backgroundColor.b * 0.5 + 15)})`;
  c.fillRect(0, 0, width, height);

  const attractorX = attractor.x * width;
  const attractorY = attractor.y * height;

  // Draw clocks
  particles.forEach((particle) => {
    const screenX = particle.x * width;
    const screenY = particle.y * height;
    
    // Calculate target angle (pointing hand toward attractor)
    const targetAngle = angleToTarget(screenX, screenY, attractorX, attractorY) + Math.PI / 2;
    applySpringRotation(particle, targetAngle);

    const size = 30 * particle.scale;

    c.save();
    c.translate(screenX, screenY);

    // Clock face background
    const faceGradient = c.createRadialGradient(0, 0, 0, 0, 0, size);
    faceGradient.addColorStop(0, '#FFFFFF');
    faceGradient.addColorStop(0.8, '#F5F5F5');
    faceGradient.addColorStop(1, '#E0E0E0');
    
    c.fillStyle = faceGradient;
    c.beginPath();
    c.arc(0, 0, size, 0, Math.PI * 2);
    c.fill();

    // Clock rim
    c.strokeStyle = `rgba(${secondaryColor.r}, ${secondaryColor.g}, ${secondaryColor.b}, ${0.5 + metallic * 0.5})`;
    c.lineWidth = 3;
    c.stroke();

    // Hour markers
    c.fillStyle = '#333';
    for (let h = 0; h < 12; h++) {
      const markerAngle = (h / 12) * Math.PI * 2 - Math.PI / 2;
      const markerDist = size * 0.8;
      const markerX = Math.cos(markerAngle) * markerDist;
      const markerY = Math.sin(markerAngle) * markerDist;
      
      if (h % 3 === 0) {
        // Major markers
        c.fillRect(markerX - 2, markerY - 4, 4, 8);
      } else {
        // Minor markers
        c.beginPath();
        c.arc(markerX, markerY, 2, 0, Math.PI * 2);
        c.fill();
      }
    }

    // Main pointer hand (tracking)
    c.save();
    c.rotate(particle.angle);
    
    // Hand shadow
    c.fillStyle = 'rgba(0, 0, 0, 0.2)';
    c.beginPath();
    c.moveTo(-size * 0.08, 2);
    c.lineTo(size * 0.7, 2);
    c.lineTo(size * 0.75, 2);
    c.lineTo(-size * 0.15, 4);
    c.closePath();
    c.fill();

    // Main hand
    c.fillStyle = `rgb(${primaryColor.r}, ${primaryColor.g}, ${primaryColor.b})`;
    c.beginPath();
    c.moveTo(-size * 0.1, -size * 0.04);
    c.lineTo(size * 0.7, 0);
    c.lineTo(-size * 0.1, size * 0.04);
    c.closePath();
    c.fill();
    
    c.restore();

    // Decorative minute hand (slowly rotating)
    c.save();
    c.rotate(time * 0.5 + particle.phase);
    c.fillStyle = '#666';
    c.beginPath();
    c.moveTo(-size * 0.05, -size * 0.02);
    c.lineTo(size * 0.5, 0);
    c.lineTo(-size * 0.05, size * 0.02);
    c.closePath();
    c.fill();
    c.restore();

    // Center cap
    c.fillStyle = `rgb(${secondaryColor.r}, ${secondaryColor.g}, ${secondaryColor.b})`;
    c.beginPath();
    c.arc(0, 0, size * 0.1, 0, Math.PI * 2);
    c.fill();

    // Metallic highlight on cap
    c.fillStyle = `rgba(255, 255, 255, ${metallic * 0.6})`;
    c.beginPath();
    c.arc(-size * 0.02, -size * 0.02, size * 0.04, 0, Math.PI * 2);
    c.fill();

    c.restore();
  });

  // Draw attractor (time marker)
  const pulse = 0.5 + Math.sin(time * 3) * 0.5;
  
  c.strokeStyle = `rgba(${primaryColor.r}, ${primaryColor.g}, ${primaryColor.b}, ${pulse})`;
  c.lineWidth = 2;
  c.setLineDash([4, 4]);
  c.beginPath();
  c.arc(attractorX, attractorY, 25, 0, Math.PI * 2);
  c.stroke();
  c.setLineDash([]);

  // Central dot
  c.fillStyle = `rgba(${primaryColor.r}, ${primaryColor.g}, ${primaryColor.b}, 1)`;
  c.beginPath();
  c.arc(attractorX, attractorY, 6, 0, Math.PI * 2);
  c.fill();
}
