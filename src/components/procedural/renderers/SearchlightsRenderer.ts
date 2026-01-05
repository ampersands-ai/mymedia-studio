// Searchlights Renderer - Military searchlights scanning sky

import { TrackingParticle, RenderContext, AttractorState, AttractorPattern } from './types';
import { 
  updateAttractor, 
  angleToTarget, 
  distanceToTarget,
  applySpringRotation
} from './trackingUtils';

export function initSearchlightsParticles(instanceCount: number): TrackingParticle[] {
  // Only place searchlights at bottom of screen
  const cols = Math.min(Math.ceil(Math.sqrt(instanceCount) * 1.5), 15);
  const rows = 2;
  
  const particles: TrackingParticle[] = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      particles.push({
        x: (col + 0.5) / cols,
        y: 0.85 + row * 0.08,
        angle: -Math.PI / 2,
        targetAngle: -Math.PI / 2,
        springiness: 0.04 + Math.random() * 0.03,
        scale: 0.8 + Math.random() * 0.4,
        phase: Math.random() * Math.PI * 2,
        intensity: 0.7 + Math.random() * 0.3,
      });
    }
  }

  return particles;
}

export function updateSearchlightsAttractor(current: AttractorState, speed: number, pattern: AttractorPattern = 'trueRandom'): AttractorState {
  return updateAttractor({ ...current, pattern }, 0.016, speed * 0.5);
}

export function renderSearchlights(
  ctx: RenderContext,
  particles: TrackingParticle[],
  attractor: AttractorState
): void {
  const { ctx: c, width, height, primaryColor, secondaryColor, time } = ctx;

  // Night sky
  const skyGradient = c.createLinearGradient(0, 0, 0, height);
  skyGradient.addColorStop(0, '#0a0a15');
  skyGradient.addColorStop(0.4, '#151525');
  skyGradient.addColorStop(1, '#252535');
  c.fillStyle = skyGradient;
  c.fillRect(0, 0, width, height);

  // Stars
  c.fillStyle = 'rgba(255, 255, 255, 0.6)';
  for (let i = 0; i < 150; i++) {
    const starX = (Math.sin(i * 123.456) * 0.5 + 0.5) * width;
    const starY = (Math.cos(i * 234.567) * 0.5 + 0.5) * height * 0.6;
    const twinkle = 0.3 + Math.sin(time * 2 + i) * 0.7;
    c.globalAlpha = twinkle;
    c.beginPath();
    c.arc(starX, starY, 0.5 + Math.random(), 0, Math.PI * 2);
    c.fill();
  }
  c.globalAlpha = 1;

  // Ground/city silhouette
  c.fillStyle = '#1a1a1a';
  c.fillRect(0, height * 0.8, width, height * 0.2);

  // Building silhouettes
  for (let b = 0; b < 20; b++) {
    const bx = b * (width / 20) + Math.sin(b * 5) * 10;
    const bh = 30 + Math.random() * 80;
    c.fillRect(bx, height * 0.8 - bh, width / 25, bh);
  }

  const attractorX = attractor.x * width;
  const attractorY = Math.min(attractor.y * height, height * 0.4);

  // Draw aircraft target
  const aircraftPulse = 0.5 + Math.sin(time * 3) * 0.5;
  
  // Aircraft shape
  c.save();
  c.translate(attractorX, attractorY);
  c.rotate(Math.sin(time * 0.5) * 0.1);
  
  c.fillStyle = `rgba(${secondaryColor.r}, ${secondaryColor.g}, ${secondaryColor.b}, ${aircraftPulse})`;
  // Fuselage
  c.beginPath();
  c.ellipse(0, 0, 20, 5, 0, 0, Math.PI * 2);
  c.fill();
  // Wings
  c.fillRect(-5, -15, 10, 30);
  // Tail
  c.fillRect(15, -8, 5, 16);
  
  c.restore();

  // Draw searchlight beams
  particles.forEach((particle) => {
    const screenX = particle.x * width;
    const screenY = particle.y * height;

    const targetAngle = angleToTarget(screenX, screenY, attractorX, attractorY);
    applySpringRotation(particle, targetAngle);

    const dist = distanceToTarget(particle.x, particle.y, attractorX / width, attractorY / height);
    const isLocked = dist < 0.25;

    const beamLength = height;
    const beamWidth = 0.08;
    const intensity = particle.intensity! * (isLocked ? 1 : 0.6);

    // Beam gradient
    const beamColor = isLocked ? primaryColor : secondaryColor;
    const beamGradient = c.createLinearGradient(
      screenX, screenY,
      screenX + Math.cos(particle.angle) * beamLength,
      screenY + Math.sin(particle.angle) * beamLength
    );
    beamGradient.addColorStop(0, `rgba(${beamColor.r}, ${beamColor.g}, ${beamColor.b}, ${intensity * 0.6})`);
    beamGradient.addColorStop(0.3, `rgba(${beamColor.r}, ${beamColor.g}, ${beamColor.b}, ${intensity * 0.3})`);
    beamGradient.addColorStop(1, 'transparent');

    c.save();
    c.translate(screenX, screenY);
    c.rotate(particle.angle);

    // Main beam cone
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(beamLength, -beamLength * beamWidth);
    c.lineTo(beamLength, beamLength * beamWidth);
    c.closePath();
    c.fillStyle = beamGradient;
    c.fill();

    // Bright core
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(beamLength * 0.8, -beamLength * beamWidth * 0.3);
    c.lineTo(beamLength * 0.8, beamLength * beamWidth * 0.3);
    c.closePath();
    c.fillStyle = `rgba(255, 255, 255, ${intensity * 0.15})`;
    c.fill();

    c.restore();
  });

  // Draw searchlight bases
  particles.forEach((particle) => {
    const screenX = particle.x * width;
    const screenY = particle.y * height;
    const size = 15 * particle.scale;

    // Platform
    c.fillStyle = '#2a2a2a';
    c.fillRect(screenX - size, screenY, size * 2, size * 0.5);

    // Searchlight housing
    c.save();
    c.translate(screenX, screenY);
    c.rotate(particle.angle - Math.PI / 2);

    c.fillStyle = '#3a3a3a';
    c.beginPath();
    c.arc(0, 0, size * 0.8, 0, Math.PI * 2);
    c.fill();

    // Lens
    const dist = distanceToTarget(particle.x, particle.y, attractorX / width, attractorY / height);
    const isLocked = dist < 0.25;
    
    c.fillStyle = isLocked ? 
      `rgba(${primaryColor.r}, ${primaryColor.g}, ${primaryColor.b}, 0.9)` : 
      'rgba(255, 255, 200, 0.6)';
    c.beginPath();
    c.arc(size * 0.3, 0, size * 0.5, 0, Math.PI * 2);
    c.fill();

    c.restore();
  });

  // Lock-on indicator when beams converge
  let lockedCount = 0;
  particles.forEach((particle) => {
    const dist = distanceToTarget(particle.x, particle.y * height / height, attractorX / width, attractorY / height);
    if (dist < 0.25) lockedCount++;
  });

  if (lockedCount > particles.length * 0.3) {
    c.strokeStyle = `rgba(255, 50, 50, ${aircraftPulse})`;
    c.lineWidth = 3;
    c.setLineDash([5, 5]);
    c.beginPath();
    c.arc(attractorX, attractorY, 35, 0, Math.PI * 2);
    c.stroke();
    c.setLineDash([]);

    c.fillStyle = `rgba(255, 50, 50, ${aircraftPulse})`;
    c.font = 'bold 12px monospace';
    c.fillText('TARGET LOCKED', attractorX - 55, attractorY + 55);
  }
}
