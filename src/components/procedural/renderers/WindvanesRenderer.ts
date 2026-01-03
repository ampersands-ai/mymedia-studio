// Windvanes Renderer - Weather vanes on rooftops

import { TrackingParticle, RenderContext, AttractorState } from './types';
import { 
  initTrackingGrid, 
  updateAttractor, 
  angleToTarget,
  getGridDimensions,
  applySpringRotation
} from './trackingUtils';

export function initWindvanesParticles(instanceCount: number): TrackingParticle[] {
  const { cols, rows } = getGridDimensions(Math.min(instanceCount, 80));
  return initTrackingGrid(cols, rows, {
    springinessRange: [0.06, 0.12],
    scaleRange: [0.7, 1.3],
    jitter: 0.02
  });
}

export function updateWindvanesAttractor(current: AttractorState, speed: number): AttractorState {
  return updateAttractor({ ...current, pattern: 'wandering' }, 0.016, speed * 0.4);
}

export function renderWindvanes(
  ctx: RenderContext,
  particles: TrackingParticle[],
  attractor: AttractorState
): void {
  const { ctx: c, width, height, primaryColor, secondaryColor, metallic, time } = ctx;

  // Sky gradient
  const skyGradient = c.createLinearGradient(0, 0, 0, height);
  skyGradient.addColorStop(0, '#4A90D9');
  skyGradient.addColorStop(0.5, '#87CEEB');
  skyGradient.addColorStop(1, '#B8D4E8');
  c.fillStyle = skyGradient;
  c.fillRect(0, 0, width, height);

  // Moving clouds
  c.fillStyle = 'rgba(255, 255, 255, 0.7)';
  for (let i = 0; i < 5; i++) {
    const cloudX = ((time * 20 + i * 300) % (width + 200)) - 100;
    const cloudY = 50 + i * 40 + Math.sin(i * 2) * 20;
    
    c.beginPath();
    c.arc(cloudX, cloudY, 30, 0, Math.PI * 2);
    c.arc(cloudX + 25, cloudY - 10, 25, 0, Math.PI * 2);
    c.arc(cloudX + 50, cloudY, 28, 0, Math.PI * 2);
    c.arc(cloudX + 20, cloudY + 10, 20, 0, Math.PI * 2);
    c.fill();
  }

  // Rooftop level
  c.fillStyle = '#8B7355';
  c.fillRect(0, height * 0.7, width, height * 0.3);

  // Wind source indicator (the direction wind comes FROM)
  const windX = attractor.x * width;
  const windY = attractor.y * height;

  // Wind direction indicator
  c.strokeStyle = `rgba(${primaryColor.r}, ${primaryColor.g}, ${primaryColor.b}, 0.3)`;
  c.lineWidth = 2;
  c.setLineDash([10, 5]);
  
  // Draw wind lines across screen from source
  for (let l = 0; l < 8; l++) {
    const startX = windX + (Math.random() - 0.5) * 100;
    const startY = windY + (Math.random() - 0.5) * 100;
    const lineLength = 100 + Math.random() * 100;
    const windAngle = Math.atan2(height / 2 - windY, width / 2 - windX);
    
    c.beginPath();
    c.moveTo(startX, startY);
    c.lineTo(startX + Math.cos(windAngle) * lineLength, startY + Math.sin(windAngle) * lineLength);
    c.stroke();
  }
  c.setLineDash([]);

  // Draw wind vanes
  particles.forEach((particle) => {
    const screenX = particle.x * width;
    const roofY = height * 0.7 + particle.y * height * 0.2;
    
    // Wind vanes point toward the wind (opposite to where it comes from)
    const targetAngle = angleToTarget(screenX, roofY, windX, windY);
    applySpringRotation(particle, targetAngle);

    const size = 25 * particle.scale;

    c.save();
    c.translate(screenX, roofY);

    // Rooftop peak
    c.fillStyle = '#6B4423';
    c.beginPath();
    c.moveTo(-size, size * 0.5);
    c.lineTo(0, 0);
    c.lineTo(size, size * 0.5);
    c.closePath();
    c.fill();

    // Pole
    c.strokeStyle = '#1a1a1a';
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(0, -size * 1.5);
    c.stroke();

    // Rotating vane
    c.translate(0, -size * 1.5);
    c.rotate(particle.angle);

    // Arrow/vane body
    const vaneGradient = c.createLinearGradient(-size, 0, size, 0);
    vaneGradient.addColorStop(0, `rgba(${secondaryColor.r}, ${secondaryColor.g}, ${secondaryColor.b}, 1)`);
    vaneGradient.addColorStop(0.5, `rgba(${secondaryColor.r + 30}, ${secondaryColor.g + 30}, ${secondaryColor.b + 30}, 1)`);
    vaneGradient.addColorStop(1, `rgba(${secondaryColor.r}, ${secondaryColor.g}, ${secondaryColor.b}, 1)`);
    
    c.fillStyle = vaneGradient;
    
    // Arrow pointing toward wind
    c.beginPath();
    c.moveTo(size * 0.8, 0);           // Arrow tip
    c.lineTo(size * 0.3, -size * 0.15); // Top edge
    c.lineTo(-size * 0.7, -size * 0.08); // Back top
    c.lineTo(-size * 0.6, 0);           // Back center
    c.lineTo(-size * 0.7, size * 0.08);  // Back bottom
    c.lineTo(size * 0.3, size * 0.15);   // Bottom edge
    c.closePath();
    c.fill();

    // Tail fin
    c.beginPath();
    c.moveTo(-size * 0.7, 0);
    c.lineTo(-size, -size * 0.25);
    c.lineTo(-size, size * 0.25);
    c.closePath();
    c.fill();

    // Metallic highlight
    c.strokeStyle = `rgba(255, 255, 255, ${metallic * 0.5})`;
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(size * 0.7, -size * 0.02);
    c.lineTo(-size * 0.5, -size * 0.05);
    c.stroke();

    c.restore();

    // Compass directions at base
    c.fillStyle = 'rgba(255, 255, 255, 0.5)';
    c.font = '8px sans-serif';
    c.fillText('N', screenX - 3, roofY - size * 1.8);
  });

  // Wind source marker
  c.fillStyle = `rgba(${primaryColor.r}, ${primaryColor.g}, ${primaryColor.b}, 0.5)`;
  c.beginPath();
  c.arc(windX, windY, 25, 0, Math.PI * 2);
  c.fill();

  // Wind icon
  c.strokeStyle = `rgba(${primaryColor.r}, ${primaryColor.g}, ${primaryColor.b}, 0.8)`;
  c.lineWidth = 2;
  for (let w = 0; w < 3; w++) {
    const waveY = windY - 10 + w * 10;
    c.beginPath();
    c.moveTo(windX - 15, waveY);
    c.bezierCurveTo(windX - 5, waveY - 5, windX + 5, waveY + 5, windX + 15, waveY);
    c.stroke();
  }
}
