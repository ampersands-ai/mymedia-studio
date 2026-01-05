// Mirrors Renderer - Solar concentrator mirror array

import { TrackingParticle, RenderContext, AttractorState, AttractorPattern } from './types';
import { 
  initRadialGrid, 
  updateAttractor, 
  angleToTarget, 
  distanceToTarget
} from './trackingUtils';

export function initMirrorsParticles(instanceCount: number): TrackingParticle[] {
  const rings = Math.min(Math.floor(Math.sqrt(instanceCount / 4)), 8);
  const particlesPerRing = Math.min(Math.floor(instanceCount / rings), 24);
  
  return initRadialGrid(rings, particlesPerRing, {
    springinessRange: [0.04, 0.08],
    scaleRange: [0.8, 1.2],
    minRadius: 0.15,
    maxRadius: 0.45
  });
}

export function updateMirrorsAttractor(current: AttractorState, speed: number, pattern: AttractorPattern = 'trueRandom'): AttractorState {
  return updateAttractor({ ...current, pattern }, 0.016, speed * 0.2);
}

export function renderMirrors(
  ctx: RenderContext,
  particles: TrackingParticle[],
  attractor: AttractorState
): void {
  const { ctx: c, width, height, metallic } = ctx;

  // Desert sky gradient
  const skyGradient = c.createLinearGradient(0, 0, 0, height);
  skyGradient.addColorStop(0, '#87CEEB');
  skyGradient.addColorStop(0.4, '#FFF8DC');
  skyGradient.addColorStop(0.7, '#DEB887');
  skyGradient.addColorStop(1, '#D2B48C');
  c.fillStyle = skyGradient;
  c.fillRect(0, 0, width, height);

  const centerX = width / 2;
  const centerY = height / 2;
  
  // Sun position (moves in sky arc)
  const sunX = attractor.x * width;
  const sunY = Math.min(attractor.y * height, height * 0.3);

  // Draw sun
  const sunGlow = c.createRadialGradient(sunX, sunY, 0, sunX, sunY, 60);
  sunGlow.addColorStop(0, 'rgba(255, 255, 200, 1)');
  sunGlow.addColorStop(0.3, 'rgba(255, 200, 100, 0.5)');
  sunGlow.addColorStop(1, 'transparent');
  c.fillStyle = sunGlow;
  c.beginPath();
  c.arc(sunX, sunY, 60, 0, Math.PI * 2);
  c.fill();

  c.fillStyle = '#FFE066';
  c.beginPath();
  c.arc(sunX, sunY, 25, 0, Math.PI * 2);
  c.fill();

  // Central receiver tower
  const towerHeight = height * 0.35;
  const towerX = centerX;
  const towerBaseY = centerY + height * 0.1;
  const towerTopY = towerBaseY - towerHeight;

  // Tower structure
  c.fillStyle = '#404040';
  c.beginPath();
  c.moveTo(towerX - 15, towerBaseY);
  c.lineTo(towerX - 8, towerTopY + 30);
  c.lineTo(towerX + 8, towerTopY + 30);
  c.lineTo(towerX + 15, towerBaseY);
  c.closePath();
  c.fill();

  // Calculate total light intensity on receiver
  let totalIntensity = 0;

  // Draw mirrors
  particles.forEach((particle) => {
    const screenX = particle.x * width;
    const screenY = particle.y * height;
    
    // Calculate reflection angle: sun -> mirror -> tower
    const sunAngle = angleToTarget(screenX, screenY, sunX, sunY);
    const towerAngle = angleToTarget(screenX, screenY, towerX, towerTopY);
    
    // Mirror should face halfway between sun and tower
    const targetAngle = (sunAngle + towerAngle) / 2;
    
    // Apply spring physics
    let angleDiff = targetAngle - particle.angle;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    particle.angle += angleDiff * particle.springiness;

    // Calculate how well mirror is focusing
    const focusQuality = 1 - Math.abs(angleDiff) / Math.PI;
    totalIntensity += focusQuality;

    const distFromCenter = distanceToTarget(particle.x, particle.y, 0.5, 0.5);
    const size = 25 * particle.scale * (0.7 + distFromCenter * 0.6);

    c.save();
    c.translate(screenX, screenY);
    c.rotate(particle.angle);

    // Mirror frame
    c.fillStyle = '#606060';
    c.fillRect(-size * 0.55, -size * 0.35, size * 1.1, size * 0.7);

    // Mirror surface
    const mirrorGradient = c.createLinearGradient(-size * 0.5, 0, size * 0.5, 0);
    const reflectIntensity = 0.5 + focusQuality * 0.5;
    mirrorGradient.addColorStop(0, `rgba(${200 + reflectIntensity * 55}, ${200 + reflectIntensity * 55}, ${210 + reflectIntensity * 45}, ${metallic})`);
    mirrorGradient.addColorStop(0.5, `rgba(255, 255, 255, ${metallic * reflectIntensity})`);
    mirrorGradient.addColorStop(1, `rgba(${180 + reflectIntensity * 55}, ${180 + reflectIntensity * 55}, ${200 + reflectIntensity * 55}, ${metallic})`);
    
    c.fillStyle = mirrorGradient;
    c.fillRect(-size * 0.5, -size * 0.3, size, size * 0.6);

    // Sun reflection spot on mirror
    if (focusQuality > 0.7) {
      c.fillStyle = `rgba(255, 255, 200, ${focusQuality * 0.5})`;
      c.beginPath();
      c.arc(0, 0, size * 0.15, 0, Math.PI * 2);
      c.fill();
    }

    c.restore();

    // Draw reflected beam (when well-focused)
    if (focusQuality > 0.6) {
      c.strokeStyle = `rgba(255, 255, 200, ${(focusQuality - 0.6) * 0.3})`;
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(screenX, screenY);
      c.lineTo(towerX, towerTopY);
      c.stroke();
    }
  });

  // Receiver glow (intensity based on mirror focus)
  const receiverIntensity = Math.min(1, totalIntensity / particles.length);
  
  const receiverGlow = c.createRadialGradient(towerX, towerTopY, 0, towerX, towerTopY, 40);
  receiverGlow.addColorStop(0, `rgba(255, ${200 - receiverIntensity * 100}, ${100 - receiverIntensity * 100}, ${receiverIntensity})`);
  receiverGlow.addColorStop(0.5, `rgba(255, 150, 50, ${receiverIntensity * 0.5})`);
  receiverGlow.addColorStop(1, 'transparent');
  
  c.fillStyle = receiverGlow;
  c.beginPath();
  c.arc(towerX, towerTopY, 40, 0, Math.PI * 2);
  c.fill();

  // Receiver structure
  c.fillStyle = `rgb(${150 + receiverIntensity * 105}, ${100 - receiverIntensity * 50}, ${50 - receiverIntensity * 50})`;
  c.beginPath();
  c.arc(towerX, towerTopY, 15, 0, Math.PI * 2);
  c.fill();

  // Power output indicator
  c.fillStyle = 'rgba(255, 255, 255, 0.8)';
  c.font = '12px monospace';
  c.fillText(`POWER: ${Math.round(receiverIntensity * 100)}%`, towerX - 40, towerBaseY + 20);
}
