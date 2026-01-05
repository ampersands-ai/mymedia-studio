// Arrows Renderer - Directional arrow signs

import { TrackingParticle, RenderContext, AttractorState, AttractorPattern } from './types';
import { 
  initTrackingGrid, 
  updateAttractor, 
  angleToTarget, 
  distanceToTarget,
  getGridDimensions,
  applySpringRotation
} from './trackingUtils';

export function initArrowsParticles(instanceCount: number): TrackingParticle[] {
  const { cols, rows } = getGridDimensions(Math.min(instanceCount, 150));
  return initTrackingGrid(cols, rows, {
    springinessRange: [0.1, 0.18],
    scaleRange: [0.7, 1.3],
    jitter: 0.02
  });
}

export function updateArrowsAttractor(current: AttractorState, speed: number, pattern: AttractorPattern = 'trueRandom'): AttractorState {
  return updateAttractor({ ...current, pattern }, 0.016, speed * 0.6);
}

export function renderArrows(
  ctx: RenderContext,
  particles: TrackingParticle[],
  attractor: AttractorState
): void {
  const { ctx: c, width, height, primaryColor, secondaryColor, backgroundColor, time } = ctx;

  // Dark road-like background
  c.fillStyle = `rgb(${Math.floor(backgroundColor.r * 0.4 + 20)}, ${Math.floor(backgroundColor.g * 0.4 + 25)}, ${Math.floor(backgroundColor.b * 0.4 + 20)})`;
  c.fillRect(0, 0, width, height);

  // Subtle grid pattern
  c.strokeStyle = 'rgba(255, 255, 255, 0.03)';
  c.lineWidth = 1;
  const gridSize = 60;
  for (let x = 0; x < width; x += gridSize) {
    c.beginPath();
    c.moveTo(x, 0);
    c.lineTo(x, height);
    c.stroke();
  }
  for (let y = 0; y < height; y += gridSize) {
    c.beginPath();
    c.moveTo(0, y);
    c.lineTo(width, y);
    c.stroke();
  }

  const attractorX = attractor.x * width;
  const attractorY = attractor.y * height;

  // Draw arrows
  particles.forEach((particle) => {
    const screenX = particle.x * width;
    const screenY = particle.y * height;
    
    const targetAngle = angleToTarget(screenX, screenY, attractorX, attractorY);
    applySpringRotation(particle, targetAngle);

    const dist = distanceToTarget(particle.x, particle.y, attractor.x, attractor.y);
    
    // Scale pulse when target is close
    const scalePulse = 1 + Math.max(0, (0.3 - dist) / 0.3) * 0.3 * (0.5 + Math.sin(time * 4 + particle.phase) * 0.5);
    
    const size = 25 * particle.scale * scalePulse;

    c.save();
    c.translate(screenX, screenY);
    c.rotate(particle.angle);

    // Arrow sign background
    const signGradient = c.createLinearGradient(-size, 0, size, 0);
    const isClose = dist < 0.3;
    const color = isClose ? primaryColor : secondaryColor;
    signGradient.addColorStop(0, `rgba(${color.r * 0.8}, ${color.g * 0.8}, ${color.b * 0.8}, 0.9)`);
    signGradient.addColorStop(0.5, `rgba(${color.r}, ${color.g}, ${color.b}, 1)`);
    signGradient.addColorStop(1, `rgba(${color.r * 0.8}, ${color.g * 0.8}, ${color.b * 0.8}, 0.9)`);

    c.fillStyle = signGradient;
    
    // Arrow shape
    c.beginPath();
    c.moveTo(size * 0.8, 0);           // tip
    c.lineTo(size * 0.2, -size * 0.35); // top outer
    c.lineTo(size * 0.2, -size * 0.15); // top inner
    c.lineTo(-size * 0.7, -size * 0.15); // back top
    c.lineTo(-size * 0.7, size * 0.15);  // back bottom
    c.lineTo(size * 0.2, size * 0.15);   // bottom inner
    c.lineTo(size * 0.2, size * 0.35);   // bottom outer
    c.closePath();
    c.fill();

    // White border
    c.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    c.lineWidth = 2;
    c.stroke();

    // Inner shine
    c.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(size * 0.6, 0);
    c.lineTo(size * 0.15, -size * 0.2);
    c.lineTo(-size * 0.5, -size * 0.1);
    c.stroke();

    c.restore();
  });

  // Draw destination marker
  const destPulse = 0.7 + Math.sin(time * 3) * 0.3;
  
  c.strokeStyle = `rgba(${primaryColor.r}, ${primaryColor.g}, ${primaryColor.b}, ${destPulse})`;
  c.lineWidth = 3;
  c.beginPath();
  c.arc(attractorX, attractorY, 20, 0, Math.PI * 2);
  c.stroke();

  // Destination dot
  c.fillStyle = `rgba(${primaryColor.r}, ${primaryColor.g}, ${primaryColor.b}, 1)`;
  c.beginPath();
  c.arc(attractorX, attractorY, 8, 0, Math.PI * 2);
  c.fill();

  // Expanding rings
  for (let r = 0; r < 2; r++) {
    const ringPhase = ((time + r * 0.5) % 1);
    c.strokeStyle = `rgba(${primaryColor.r}, ${primaryColor.g}, ${primaryColor.b}, ${(1 - ringPhase) * 0.4})`;
    c.lineWidth = 2;
    c.beginPath();
    c.arc(attractorX, attractorY, 25 + ringPhase * 40, 0, Math.PI * 2);
    c.stroke();
  }
}
