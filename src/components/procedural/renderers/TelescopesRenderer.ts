// Telescopes Renderer - Observatory telescopes tracking celestial objects

import { TrackingParticle, RenderContext, AttractorState, AttractorPattern } from './types';
import { 
  initTrackingGrid, 
  updateAttractor, 
  distanceToTarget,
  getGridDimensions,
  applySpringRotation
} from './trackingUtils';

export function initTelescopesParticles(instanceCount: number): TrackingParticle[] {
  const { cols, rows } = getGridDimensions(Math.min(instanceCount, 60));
  const particles = initTrackingGrid(cols, rows, {
    springinessRange: [0.03, 0.06],
    scaleRange: [0.8, 1.2],
    jitter: 0.02
  });

  particles.forEach(p => {
    p.elevation = 0.5;
    p.targetElevation = 0.5;
  });

  return particles;
}

export function updateTelescopesAttractor(current: AttractorState, speed: number, pattern: AttractorPattern = 'trueRandom'): AttractorState {
  return updateAttractor({ ...current, pattern }, 0.016, speed * 0.2);
}

export function renderTelescopes(
  ctx: RenderContext,
  particles: TrackingParticle[],
  attractor: AttractorState
): void {
  const { ctx: c, width, height, primaryColor, secondaryColor, metallic, time } = ctx;

  // Deep space night sky
  const skyGradient = c.createLinearGradient(0, 0, 0, height);
  skyGradient.addColorStop(0, '#050510');
  skyGradient.addColorStop(0.5, '#0a0a20');
  skyGradient.addColorStop(1, '#151530');
  c.fillStyle = skyGradient;
  c.fillRect(0, 0, width, height);

  // Milky way band
  c.fillStyle = 'rgba(100, 80, 150, 0.05)';
  c.beginPath();
  c.ellipse(width * 0.5, height * 0.3, width * 0.6, height * 0.15, 0.2, 0, Math.PI * 2);
  c.fill();

  // Stars (more for astronomy feel)
  for (let i = 0; i < 300; i++) {
    const starX = (Math.sin(i * 123.456 + 78) * 0.5 + 0.5) * width;
    const starY = (Math.cos(i * 234.567 + 12) * 0.5 + 0.5) * height * 0.7;
    const starSize = 0.3 + Math.random() * 1.5;
    const twinkle = 0.4 + Math.sin(time * 1.5 + i * 0.5) * 0.6;
    
    // Colored stars
    const colors = ['255,255,255', '255,200,200', '200,200,255', '255,255,200'];
    const color = colors[i % colors.length];
    
    c.fillStyle = `rgba(${color}, ${twinkle})`;
    c.beginPath();
    c.arc(starX, starY, starSize, 0, Math.PI * 2);
    c.fill();
  }

  // Observatory grounds
  c.fillStyle = '#1a1a25';
  c.fillRect(0, height * 0.75, width, height * 0.25);

  // Celestial target (star/planet being observed)
  const targetX = attractor.x * width;
  const targetY = Math.min(attractor.y * height, height * 0.35);

  // Target glow
  const targetPulse = 0.7 + Math.sin(time * 2) * 0.3;
  const targetGlow = c.createRadialGradient(targetX, targetY, 0, targetX, targetY, 40);
  targetGlow.addColorStop(0, `rgba(${primaryColor.r}, ${primaryColor.g}, ${primaryColor.b}, ${targetPulse})`);
  targetGlow.addColorStop(0.3, `rgba(${primaryColor.r}, ${primaryColor.g}, ${primaryColor.b}, ${targetPulse * 0.4})`);
  targetGlow.addColorStop(1, 'transparent');
  c.fillStyle = targetGlow;
  c.beginPath();
  c.arc(targetX, targetY, 40, 0, Math.PI * 2);
  c.fill();

  // Target star
  c.fillStyle = '#FFFFFF';
  c.beginPath();
  c.arc(targetX, targetY, 4, 0, Math.PI * 2);
  c.fill();

  // Diffraction spikes
  c.strokeStyle = `rgba(255, 255, 255, ${targetPulse * 0.5})`;
  c.lineWidth = 1;
  for (let s = 0; s < 4; s++) {
    const spikeAngle = (s / 4) * Math.PI + Math.PI / 8;
    c.beginPath();
    c.moveTo(targetX + Math.cos(spikeAngle) * 8, targetY + Math.sin(spikeAngle) * 8);
    c.lineTo(targetX + Math.cos(spikeAngle) * 25, targetY + Math.sin(spikeAngle) * 25);
    c.stroke();
  }

  // Draw telescopes
  particles.forEach((particle) => {
    const screenX = particle.x * width;
    const groundY = height * 0.75 + particle.y * height * 0.2;
    
    // Calculate tracking angles
    const dx = targetX - screenX;
    const dy = targetY - groundY;
    const targetAngle = Math.atan2(dx, Math.abs(dy));
    const targetElevation = Math.atan2(-dy, Math.sqrt(dx * dx + 100)) / (Math.PI / 2);
    
    applySpringRotation(particle, targetAngle);
    particle.targetElevation = Math.max(0.2, Math.min(0.9, targetElevation));
    particle.elevation = particle.elevation! + (particle.targetElevation! - particle.elevation!) * 0.04;

    const dist = distanceToTarget(screenX / width, groundY / height, targetX / width, targetY / height);
    const isObserving = dist < 0.35;

    const size = 35 * particle.scale;

    c.save();
    c.translate(screenX, groundY);

    // Observatory dome
    c.fillStyle = '#2a2a35';
    c.beginPath();
    c.arc(0, 0, size * 0.8, Math.PI, 0);
    c.fill();

    // Dome opening (slit)
    c.fillStyle = '#151520';
    c.save();
    c.rotate(particle.angle * 0.5);
    c.fillRect(-size * 0.15, -size * 0.8, size * 0.3, size * 0.6);
    c.restore();

    // Base building
    c.fillStyle = '#252530';
    c.fillRect(-size * 0.9, 0, size * 1.8, size * 0.4);

    // Telescope tube (visible through slit)
    c.save();
    c.rotate(particle.angle * 0.6);
    
    const tubeLength = size * 0.9;
    const tiltAngle = (particle.elevation! - 0.5) * 0.8;
    
    c.rotate(-tiltAngle);

    // Telescope tube
    const tubeGradient = c.createLinearGradient(0, -size * 0.08, 0, size * 0.08);
    tubeGradient.addColorStop(0, '#4a4a55');
    tubeGradient.addColorStop(0.5, '#5a5a65');
    tubeGradient.addColorStop(1, '#4a4a55');
    
    c.fillStyle = tubeGradient;
    c.beginPath();
    c.roundRect(-size * 0.15, -size * 0.1, tubeLength, size * 0.2, 3);
    c.fill();

    // Primary mirror housing
    c.fillStyle = '#3a3a45';
    c.beginPath();
    c.arc(-size * 0.1, 0, size * 0.15, 0, Math.PI * 2);
    c.fill();

    // Secondary mirror/focuser
    c.fillStyle = '#2a2a35';
    c.beginPath();
    c.arc(tubeLength - size * 0.2, 0, size * 0.08, 0, Math.PI * 2);
    c.fill();

    // Lens/aperture
    if (isObserving) {
      c.fillStyle = `rgba(${primaryColor.r}, ${primaryColor.g}, ${primaryColor.b}, 0.5)`;
    } else {
      c.fillStyle = 'rgba(100, 100, 150, 0.3)';
    }
    c.beginPath();
    c.arc(tubeLength - size * 0.15, 0, size * 0.06, 0, Math.PI * 2);
    c.fill();

    c.restore();

    // Dome metallic rim
    c.strokeStyle = `rgba(180, 180, 200, ${metallic * 0.5})`;
    c.lineWidth = 2;
    c.beginPath();
    c.arc(0, 0, size * 0.8, Math.PI, 0);
    c.stroke();

    c.restore();

    // Status indicator
    if (isObserving) {
      c.fillStyle = `rgba(${primaryColor.r}, ${primaryColor.g}, ${primaryColor.b}, ${0.5 + Math.sin(time * 3) * 0.5})`;
      c.beginPath();
      c.arc(screenX, groundY - size * 0.9, 4, 0, Math.PI * 2);
      c.fill();
    }
  });

  // Target information overlay
  c.fillStyle = `rgba(${secondaryColor.r}, ${secondaryColor.g}, ${secondaryColor.b}, 0.8)`;
  c.font = '10px monospace';
  c.fillText('TARGET: CELESTIAL OBJECT', targetX - 70, targetY + 55);
  c.fillText(`RA: ${(attractor.x * 24).toFixed(2)}h`, targetX - 70, targetY + 68);
  c.fillText(`DEC: +${((1 - attractor.y) * 90).toFixed(1)}°`, targetX - 70, targetY + 81);
}
