// Flowers Renderer - Stylized flowers tilting toward sun

import { TrackingParticle, RenderContext, AttractorState } from './types';
import { 
  initTrackingGrid, 
  updateAttractor, 
  distanceToTarget,
  getGridDimensions
} from './trackingUtils';

export function initFlowersParticles(instanceCount: number): TrackingParticle[] {
  const { cols, rows } = getGridDimensions(Math.min(instanceCount, 100));
  const particles = initTrackingGrid(cols, rows, {
    springinessRange: [0.05, 0.1],
    scaleRange: [0.6, 1.4],
    jitter: 0.04
  });

  particles.forEach(p => {
    p.swayOffset = Math.random() * Math.PI * 2;
    p.swaySpeed = 0.3 + Math.random() * 0.4;
    p.height = 0.3 + Math.random() * 0.4;
  });

  return particles;
}

export function updateFlowersAttractor(current: AttractorState, speed: number): AttractorState {
  return updateAttractor({ ...current, pattern: 'skyArc' }, 0.016, speed * 0.3);
}

export function renderFlowers(
  ctx: RenderContext,
  particles: TrackingParticle[],
  attractor: AttractorState
): void {
  const { ctx: c, width, height, primaryColor, secondaryColor, time } = ctx;

  // Meadow sky
  const skyGradient = c.createLinearGradient(0, 0, 0, height);
  skyGradient.addColorStop(0, '#6BB3F8');
  skyGradient.addColorStop(0.5, '#9DCFF8');
  skyGradient.addColorStop(1, '#C8E6C9');
  c.fillStyle = skyGradient;
  c.fillRect(0, 0, width, height);

  // Grass field
  const grassGradient = c.createLinearGradient(0, height * 0.6, 0, height);
  grassGradient.addColorStop(0, '#4CAF50');
  grassGradient.addColorStop(0.5, '#388E3C');
  grassGradient.addColorStop(1, '#2E7D32');
  c.fillStyle = grassGradient;
  c.fillRect(0, height * 0.6, width, height * 0.4);

  const sunX = attractor.x * width;
  const sunY = Math.min(attractor.y * height, height * 0.35);

  // Draw sun
  const sunGlow = c.createRadialGradient(sunX, sunY, 0, sunX, sunY, 80);
  sunGlow.addColorStop(0, 'rgba(255, 255, 200, 1)');
  sunGlow.addColorStop(0.3, 'rgba(255, 220, 100, 0.6)');
  sunGlow.addColorStop(1, 'transparent');
  c.fillStyle = sunGlow;
  c.beginPath();
  c.arc(sunX, sunY, 80, 0, Math.PI * 2);
  c.fill();

  c.fillStyle = '#FFE066';
  c.beginPath();
  c.arc(sunX, sunY, 35, 0, Math.PI * 2);
  c.fill();

  // Sort by y for depth
  const sortedParticles = [...particles].sort((a, b) => a.y - b.y);

  // Draw flowers
  sortedParticles.forEach((particle) => {
    const screenX = particle.x * width;
    const groundY = height * 0.65 + particle.y * height * 0.3;
    
    // Calculate tilt toward sun
    const dx = sunX - screenX;
    const dy = sunY - groundY;
    const targetAngle = Math.atan2(dx, -dy);
    
    let angleDiff = targetAngle - particle.angle;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    particle.angle += angleDiff * particle.springiness;
    
    const sway = Math.sin(time * particle.swaySpeed! + particle.swayOffset!) * 8;
    const size = 18 * particle.scale;
    const stemHeight = height * 0.15 * particle.height!;

    // Stem
    c.strokeStyle = '#2E7D32';
    c.lineWidth = 3;
    c.lineCap = 'round';
    
    const stemTopX = screenX + Math.sin(particle.angle) * stemHeight + sway;
    const stemTopY = groundY - Math.cos(particle.angle) * stemHeight;
    
    c.beginPath();
    c.moveTo(screenX, groundY);
    c.quadraticCurveTo(screenX + sway * 0.5, groundY - stemHeight * 0.5, stemTopX, stemTopY);
    c.stroke();

    // Leaves
    c.fillStyle = '#4CAF50';
    const leafY = groundY - stemHeight * 0.4;
    c.save();
    c.translate(screenX + sway * 0.3, leafY);
    c.rotate(0.3 + sway * 0.02);
    c.beginPath();
    c.ellipse(8, 0, 15, 6, 0.2, 0, Math.PI * 2);
    c.fill();
    c.restore();

    c.save();
    c.translate(screenX + sway * 0.3, leafY + 15);
    c.rotate(-0.4 + sway * 0.02);
    c.beginPath();
    c.ellipse(-8, 0, 12, 5, -0.2, 0, Math.PI * 2);
    c.fill();
    c.restore();

    // Flower head
    c.save();
    c.translate(stemTopX, stemTopY);
    c.rotate(particle.angle * 0.5);

    // Petals
    const petalCount = 6 + Math.floor(particle.scale * 2);
    for (let p = 0; p < petalCount; p++) {
      const petalAngle = (p / petalCount) * Math.PI * 2;
      c.save();
      c.rotate(petalAngle);
      
      // Gradient petal
      const petalGrad = c.createRadialGradient(0, -size * 0.4, 0, 0, -size * 0.4, size * 0.5);
      petalGrad.addColorStop(0, `rgba(${primaryColor.r + 40}, ${primaryColor.g + 40}, ${primaryColor.b + 40}, 1)`);
      petalGrad.addColorStop(1, `rgba(${primaryColor.r}, ${primaryColor.g}, ${primaryColor.b}, 1)`);
      
      c.fillStyle = petalGrad;
      c.beginPath();
      c.ellipse(0, -size * 0.5, size * 0.25, size * 0.45, 0, 0, Math.PI * 2);
      c.fill();
      
      c.restore();
    }

    // Center
    const centerGrad = c.createRadialGradient(0, 0, 0, 0, 0, size * 0.3);
    centerGrad.addColorStop(0, `rgba(${secondaryColor.r + 30}, ${secondaryColor.g + 30}, ${secondaryColor.b + 30}, 1)`);
    centerGrad.addColorStop(1, `rgba(${secondaryColor.r}, ${secondaryColor.g}, ${secondaryColor.b}, 1)`);
    
    c.fillStyle = centerGrad;
    c.beginPath();
    c.arc(0, 0, size * 0.28, 0, Math.PI * 2);
    c.fill();

    // Center texture
    c.fillStyle = 'rgba(0, 0, 0, 0.15)';
    for (let d = 0; d < 5; d++) {
      const dotAngle = (d / 5) * Math.PI * 2 + time * 0.1;
      c.beginPath();
      c.arc(Math.cos(dotAngle) * size * 0.12, Math.sin(dotAngle) * size * 0.12, 2, 0, Math.PI * 2);
      c.fill();
    }

    c.restore();
  });
}
