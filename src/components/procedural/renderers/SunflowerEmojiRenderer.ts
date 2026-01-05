// Sunflower Emoji Renderer - Kawaii sunflower faces

import { TrackingParticle, RenderContext, AttractorState, AttractorPattern } from './types';
import { 
  initTrackingGrid, 
  updateAttractor, 
  distanceToTarget,
  getGridDimensions
} from './trackingUtils';

export function initSunflowerEmojiParticles(instanceCount: number): TrackingParticle[] {
  const { cols, rows } = getGridDimensions(Math.min(instanceCount, 80));
  const particles = initTrackingGrid(cols, rows, {
    springinessRange: [0.08, 0.14],
    scaleRange: [0.7, 1.3],
    jitter: 0.03
  });

  particles.forEach(p => {
    p.swayOffset = Math.random() * Math.PI * 2;
    p.swaySpeed = 0.5 + Math.random() * 0.5;
  });

  return particles;
}

export function updateSunflowerEmojiAttractor(current: AttractorState, speed: number, pattern: AttractorPattern = 'trueRandom'): AttractorState {
  return updateAttractor({ ...current, pattern }, 0.016, speed * 0.4);
}

export function renderSunflowerEmoji(
  ctx: RenderContext,
  particles: TrackingParticle[],
  attractor: AttractorState
): void {
  const { ctx: c, width, height, primaryColor, secondaryColor, time } = ctx;

  // Cheerful sky background
  const skyGradient = c.createLinearGradient(0, 0, 0, height);
  skyGradient.addColorStop(0, '#87CEEB');
  skyGradient.addColorStop(0.6, '#B0E0E6');
  skyGradient.addColorStop(1, '#90EE90');
  c.fillStyle = skyGradient;
  c.fillRect(0, 0, width, height);

  // Fluffy clouds
  c.fillStyle = 'rgba(255, 255, 255, 0.8)';
  const drawCloud = (cx: number, cy: number, size: number) => {
    c.beginPath();
    c.arc(cx, cy, size, 0, Math.PI * 2);
    c.arc(cx + size * 0.8, cy - size * 0.2, size * 0.7, 0, Math.PI * 2);
    c.arc(cx - size * 0.8, cy, size * 0.6, 0, Math.PI * 2);
    c.arc(cx + size * 0.3, cy + size * 0.3, size * 0.5, 0, Math.PI * 2);
    c.fill();
  };
  drawCloud(width * 0.2, height * 0.15, 30);
  drawCloud(width * 0.7, height * 0.1, 25);
  drawCloud(width * 0.9, height * 0.2, 20);

  // Ground
  c.fillStyle = '#228B22';
  c.fillRect(0, height * 0.75, width, height * 0.25);

  const sunX = attractor.x * width;
  const sunY = Math.min(attractor.y * height, height * 0.4);

  // Draw cartoon sun
  const sunRadius = 50;
  
  // Sun rays
  c.strokeStyle = '#FFD700';
  c.lineWidth = 4;
  for (let i = 0; i < 12; i++) {
    const rayAngle = (i / 12) * Math.PI * 2 + time * 0.2;
    const innerR = sunRadius * 1.2;
    const outerR = sunRadius * 1.6;
    c.beginPath();
    c.moveTo(sunX + Math.cos(rayAngle) * innerR, sunY + Math.sin(rayAngle) * innerR);
    c.lineTo(sunX + Math.cos(rayAngle) * outerR, sunY + Math.sin(rayAngle) * outerR);
    c.stroke();
  }

  // Sun face
  c.fillStyle = '#FFD700';
  c.beginPath();
  c.arc(sunX, sunY, sunRadius, 0, Math.PI * 2);
  c.fill();

  // Sun face details
  c.fillStyle = '#000';
  c.beginPath();
  c.arc(sunX - 15, sunY - 5, 5, 0, Math.PI * 2);
  c.arc(sunX + 15, sunY - 5, 5, 0, Math.PI * 2);
  c.fill();

  // Sun smile
  c.strokeStyle = '#000';
  c.lineWidth = 3;
  c.beginPath();
  c.arc(sunX, sunY + 5, 20, 0.1 * Math.PI, 0.9 * Math.PI);
  c.stroke();

  // Draw sunflower emojis
  particles.forEach((particle) => {
    const screenX = particle.x * width;
    const groundY = height * 0.75 + particle.y * height * 0.2;
    
    // Calculate tilt toward sun
    const dx = sunX - screenX;
    const dy = sunY - groundY;
    const targetAngle = Math.atan2(dy, dx);
    
    // Apply spring rotation
    let angleDiff = targetAngle - particle.angle;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    particle.angle += angleDiff * particle.springiness;

    const dist = distanceToTarget(screenX / width, groundY / height, sunX / width, sunY / height);
    
    // Cheerful bounce when sun is close
    const bounce = dist < 0.4 ? Math.sin(time * 6 + particle.phase) * 5 : 0;
    const sway = Math.sin(time * particle.swaySpeed! + particle.swayOffset!) * 3;

    const size = 35 * particle.scale;
    const stemHeight = 60 * particle.scale;

    // Draw stem
    c.strokeStyle = '#228B22';
    c.lineWidth = 4 * particle.scale;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(screenX, groundY);
    c.quadraticCurveTo(screenX + sway, groundY - stemHeight * 0.5, screenX + particle.angle * 20, groundY - stemHeight + bounce);
    c.stroke();

    // Flower head position
    const headX = screenX + particle.angle * 20 + sway * 0.5;
    const headY = groundY - stemHeight + bounce;

    c.save();
    c.translate(headX, headY);
    c.rotate(particle.angle * 0.3);

    // Petals
    const petalColor = primaryColor;
    for (let p = 0; p < 10; p++) {
      const petalAngle = (p / 10) * Math.PI * 2;
      c.save();
      c.rotate(petalAngle);
      c.translate(0, -size * 0.5);
      
      c.fillStyle = `rgb(${petalColor.r}, ${petalColor.g}, ${petalColor.b})`;
      c.beginPath();
      c.ellipse(0, 0, size * 0.25, size * 0.4, 0, 0, Math.PI * 2);
      c.fill();
      
      c.restore();
    }

    // Center face
    c.fillStyle = `rgb(${secondaryColor.r}, ${secondaryColor.g}, ${secondaryColor.b})`;
    c.beginPath();
    c.arc(0, 0, size * 0.35, 0, Math.PI * 2);
    c.fill();

    // Kawaii face
    c.fillStyle = '#000';
    
    // Eyes (cute dots)
    c.beginPath();
    c.arc(-size * 0.1, -size * 0.05, size * 0.05, 0, Math.PI * 2);
    c.arc(size * 0.1, -size * 0.05, size * 0.05, 0, Math.PI * 2);
    c.fill();

    // Blush
    c.fillStyle = 'rgba(255, 150, 150, 0.5)';
    c.beginPath();
    c.ellipse(-size * 0.18, size * 0.05, size * 0.06, size * 0.04, 0, 0, Math.PI * 2);
    c.ellipse(size * 0.18, size * 0.05, size * 0.06, size * 0.04, 0, 0, Math.PI * 2);
    c.fill();

    // Happy smile
    c.strokeStyle = '#000';
    c.lineWidth = 2;
    c.beginPath();
    c.arc(0, size * 0.02, size * 0.12, 0.1 * Math.PI, 0.9 * Math.PI);
    c.stroke();

    c.restore();
  });
}
