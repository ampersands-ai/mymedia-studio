// Metronomes Renderer - Swinging pendulums with magnetic attraction

import { TrackingParticle, RenderContext, AttractorState, AttractorPattern } from './types';
import { 
  initTrackingGrid, 
  updateAttractor, 
  angleToTarget,
  getGridDimensions
} from './trackingUtils';

export function initMetronomesParticles(instanceCount: number): TrackingParticle[] {
  const { cols, rows } = getGridDimensions(Math.min(instanceCount, 100));
  const particles = initTrackingGrid(cols, rows, {
    springinessRange: [0.02, 0.04],
    scaleRange: [0.8, 1.2],
    jitter: 0.01
  });

  particles.forEach(p => {
    p.pendulumAngle = (Math.random() - 0.5) * 0.5;
    p.pendulumVelocity = 0;
  });

  return particles;
}

export function updateMetronomesAttractor(current: AttractorState, speed: number, pattern: AttractorPattern = 'trueRandom'): AttractorState {
  return updateAttractor({ ...current, pattern }, 0.016, speed * 0.5);
}

export function renderMetronomes(
  ctx: RenderContext,
  particles: TrackingParticle[],
  attractor: AttractorState
): void {
  const { ctx: c, width, height, primaryColor, secondaryColor, backgroundColor, metallic, time } = ctx;

  // Elegant background
  c.fillStyle = `rgb(${Math.floor(backgroundColor.r * 0.6 + 20)}, ${Math.floor(backgroundColor.g * 0.6 + 18)}, ${Math.floor(backgroundColor.b * 0.6 + 15)})`;
  c.fillRect(0, 0, width, height);

  // Wood grain texture (subtle)
  c.strokeStyle = 'rgba(0, 0, 0, 0.02)';
  c.lineWidth = 1;
  for (let y = 0; y < height; y += 3) {
    c.beginPath();
    c.moveTo(0, y + Math.sin(y * 0.1) * 2);
    for (let x = 0; x < width; x += 10) {
      c.lineTo(x, y + Math.sin(y * 0.1 + x * 0.01) * 2);
    }
    c.stroke();
  }

  const attractorX = attractor.x * width;
  const attractorY = attractor.y * height;

  // Draw magnetic attractor
  const attractorPulse = 0.5 + Math.sin(time * 2) * 0.5;
  const attractorGlow = c.createRadialGradient(attractorX, attractorY, 0, attractorX, attractorY, 60);
  attractorGlow.addColorStop(0, `rgba(${primaryColor.r}, ${primaryColor.g}, ${primaryColor.b}, ${attractorPulse * 0.5})`);
  attractorGlow.addColorStop(1, 'transparent');
  c.fillStyle = attractorGlow;
  c.beginPath();
  c.arc(attractorX, attractorY, 60, 0, Math.PI * 2);
  c.fill();

  // Draw metronomes
  particles.forEach((particle) => {
    const screenX = particle.x * width;
    const screenY = particle.y * height;
    
    // Physics simulation for pendulum
    const gravity = 0.002;
    const damping = 0.998;
    const pendulumLength = 40 * particle.scale;
    
    // Calculate magnetic pull from attractor
    const dx = attractorX - screenX;
    const dy = attractorY - screenY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const magneticStrength = Math.max(0, 1 - dist / (Math.min(width, height) * 0.3)) * 0.001;
    
    // Desired angle toward attractor
    const targetAngle = angleToTarget(screenX, screenY, attractorX, attractorY) - Math.PI / 2;
    
    // Apply forces
    const gravityForce = -gravity * Math.sin(particle.pendulumAngle!);
    const magneticForce = magneticStrength * Math.sin(targetAngle - particle.pendulumAngle!);
    
    particle.pendulumVelocity = (particle.pendulumVelocity! + gravityForce + magneticForce) * damping;
    particle.pendulumAngle = particle.pendulumAngle! + particle.pendulumVelocity!;

    // Clamp angle
    particle.pendulumAngle = Math.max(-0.8, Math.min(0.8, particle.pendulumAngle!));

    const size = 25 * particle.scale;

    c.save();
    c.translate(screenX, screenY);

    // Metronome body (pyramid shape)
    const bodyGradient = c.createLinearGradient(-size * 0.6, size, size * 0.6, -size * 1.2);
    bodyGradient.addColorStop(0, '#5D4037');
    bodyGradient.addColorStop(0.5, '#795548');
    bodyGradient.addColorStop(1, '#6D4C41');
    
    c.fillStyle = bodyGradient;
    c.beginPath();
    c.moveTo(-size * 0.6, size * 0.8);
    c.lineTo(-size * 0.25, -size);
    c.lineTo(size * 0.25, -size);
    c.lineTo(size * 0.6, size * 0.8);
    c.closePath();
    c.fill();

    // Metallic trim
    c.strokeStyle = `rgba(218, 165, 32, ${metallic})`;
    c.lineWidth = 2;
    c.stroke();

    // Scale markings
    c.fillStyle = 'rgba(255, 255, 255, 0.3)';
    for (let m = -3; m <= 3; m++) {
      const markY = -size * 0.3 + m * size * 0.15;
      c.fillRect(-size * 0.15, markY, size * 0.3, 1);
    }

    // Pendulum arm
    const bobX = Math.sin(particle.pendulumAngle!) * pendulumLength;
    const bobY = Math.cos(particle.pendulumAngle!) * pendulumLength;

    c.strokeStyle = '#8D6E63';
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(0, -size * 0.3);
    c.lineTo(bobX, -size * 0.3 - bobY);
    c.stroke();

    // Weight/Bob
    const bobGradient = c.createRadialGradient(bobX, -size * 0.3 - bobY, 0, bobX, -size * 0.3 - bobY, size * 0.2);
    bobGradient.addColorStop(0, `rgba(${secondaryColor.r + 50}, ${secondaryColor.g + 50}, ${secondaryColor.b + 50}, 1)`);
    bobGradient.addColorStop(0.7, `rgba(${secondaryColor.r}, ${secondaryColor.g}, ${secondaryColor.b}, 1)`);
    bobGradient.addColorStop(1, `rgba(${secondaryColor.r * 0.7}, ${secondaryColor.g * 0.7}, ${secondaryColor.b * 0.7}, 1)`);
    
    c.fillStyle = bobGradient;
    c.beginPath();
    c.arc(bobX, -size * 0.3 - bobY, size * 0.18, 0, Math.PI * 2);
    c.fill();

    // Bob highlight
    c.fillStyle = `rgba(255, 255, 255, ${metallic * 0.4})`;
    c.beginPath();
    c.arc(bobX - size * 0.05, -size * 0.3 - bobY - size * 0.05, size * 0.06, 0, Math.PI * 2);
    c.fill();

    // Pivot point
    c.fillStyle = '#4E342E';
    c.beginPath();
    c.arc(0, -size * 0.3, size * 0.08, 0, Math.PI * 2);
    c.fill();

    c.restore();
  });

  // Magnetic field indicator
  c.fillStyle = `rgba(${primaryColor.r}, ${primaryColor.g}, ${primaryColor.b}, ${attractorPulse})`;
  c.beginPath();
  c.arc(attractorX, attractorY, 10, 0, Math.PI * 2);
  c.fill();

  // Magnet icon
  c.strokeStyle = `rgba(${primaryColor.r}, ${primaryColor.g}, ${primaryColor.b}, ${attractorPulse})`;
  c.lineWidth = 3;
  c.beginPath();
  c.arc(attractorX, attractorY, 18, -0.5, Math.PI + 0.5);
  c.stroke();
}
