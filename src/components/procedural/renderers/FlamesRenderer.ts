// Flames Renderer - Candles/torches bending toward attractor

import { TrackingParticle, RenderContext, AttractorState } from './types';
import { 
  initTrackingGrid, 
  updateAttractor, 
  angleToTarget,
  getGridDimensions
} from './trackingUtils';

export function initFlamesParticles(instanceCount: number): TrackingParticle[] {
  const { cols, rows } = getGridDimensions(Math.min(instanceCount, 120));
  const particles = initTrackingGrid(cols, rows, {
    springinessRange: [0.1, 0.18],
    scaleRange: [0.7, 1.3],
    jitter: 0.02
  });

  particles.forEach(p => {
    p.swayOffset = Math.random() * Math.PI * 2;
    p.swaySpeed = 2 + Math.random() * 2;
    p.height = 0.5 + Math.random() * 0.5;
  });

  return particles;
}

export function updateFlamesAttractor(current: AttractorState, speed: number): AttractorState {
  return updateAttractor({ ...current, pattern: 'wandering' }, 0.016, speed * 0.6);
}

export function renderFlames(
  ctx: RenderContext,
  particles: TrackingParticle[],
  attractor: AttractorState
): void {
  const { ctx: c, width, height, primaryColor, secondaryColor, backgroundColor, time } = ctx;

  // Dark mystical background
  const bgGradient = c.createLinearGradient(0, 0, 0, height);
  bgGradient.addColorStop(0, `rgb(${Math.floor(backgroundColor.r * 0.3 + 10)}, ${Math.floor(backgroundColor.g * 0.3 + 5)}, ${Math.floor(backgroundColor.b * 0.3 + 15)})`);
  bgGradient.addColorStop(1, `rgb(${Math.floor(backgroundColor.r * 0.2)}, ${Math.floor(backgroundColor.g * 0.2)}, ${Math.floor(backgroundColor.b * 0.2 + 5)})`);
  c.fillStyle = bgGradient;
  c.fillRect(0, 0, width, height);

  // Stone floor
  c.fillStyle = '#2a2525';
  c.fillRect(0, height * 0.8, width, height * 0.2);

  // Floor texture
  c.fillStyle = 'rgba(0, 0, 0, 0.1)';
  for (let fx = 0; fx < width; fx += 40) {
    for (let fy = height * 0.8; fy < height; fy += 40) {
      c.fillRect(fx, fy, 38, 38);
    }
  }

  const attractorX = attractor.x * width;
  const attractorY = attractor.y * height;

  // Wind/energy source indicator
  const windPulse = 0.5 + Math.sin(time * 2) * 0.5;
  const windGlow = c.createRadialGradient(attractorX, attractorY, 0, attractorX, attractorY, 60);
  windGlow.addColorStop(0, `rgba(${secondaryColor.r}, ${secondaryColor.g}, ${secondaryColor.b}, ${windPulse * 0.3})`);
  windGlow.addColorStop(1, 'transparent');
  c.fillStyle = windGlow;
  c.beginPath();
  c.arc(attractorX, attractorY, 60, 0, Math.PI * 2);
  c.fill();

  // Draw flames/candles
  particles.forEach((particle) => {
    const screenX = particle.x * width;
    const groundY = height * 0.8 + particle.y * height * 0.15;
    
    // Calculate bend toward attractor (like wind effect)
    const dx = attractorX - screenX;
    const dy = attractorY - groundY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const influence = Math.max(0, 1 - dist / (Math.min(width, height) * 0.5));
    
    const targetBend = angleToTarget(screenX, groundY, attractorX, attractorY) + Math.PI / 2;
    
    // Apply spring bend
    let bendDiff = targetBend - particle.angle;
    while (bendDiff > Math.PI) bendDiff -= Math.PI * 2;
    while (bendDiff < -Math.PI) bendDiff += Math.PI * 2;
    particle.angle += bendDiff * particle.springiness * influence;

    // Natural flicker
    const flickerX = Math.sin(time * particle.swaySpeed! + particle.swayOffset!) * 3;
    const flickerY = Math.sin(time * particle.swaySpeed! * 1.3 + particle.swayOffset! + 1) * 2;

    const candleHeight = 20 * particle.height!;
    const flameHeight = 25 * particle.scale * (0.8 + Math.sin(time * 8 + particle.phase) * 0.2);
    const flameWidth = flameHeight * 0.4;

    c.save();
    c.translate(screenX, groundY);

    // Candle body
    const candleGradient = c.createLinearGradient(-4, 0, 4, 0);
    candleGradient.addColorStop(0, '#E8DCC8');
    candleGradient.addColorStop(0.5, '#FFF8E7');
    candleGradient.addColorStop(1, '#E8DCC8');
    
    c.fillStyle = candleGradient;
    c.beginPath();
    c.roundRect(-5, -candleHeight, 10, candleHeight, 2);
    c.fill();

    // Melted wax drips
    c.fillStyle = '#F0E6D2';
    c.beginPath();
    c.ellipse(-4, -candleHeight * 0.3, 3, 6, 0.2, 0, Math.PI * 2);
    c.ellipse(3, -candleHeight * 0.5, 2, 5, -0.1, 0, Math.PI * 2);
    c.fill();

    // Wick
    c.strokeStyle = '#333';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(0, -candleHeight);
    c.lineTo(particle.angle * 8 + flickerX * 0.5, -candleHeight - 8);
    c.stroke();

    // Flame (bent by attractor)
    const flameCenterX = particle.angle * 15 + flickerX;
    const flameCenterY = -candleHeight - flameHeight * 0.5 + flickerY;

    // Outer flame glow
    const outerGlow = c.createRadialGradient(
      flameCenterX, flameCenterY, 0,
      flameCenterX, flameCenterY, flameHeight * 1.5
    );
    outerGlow.addColorStop(0, `rgba(${primaryColor.r}, ${primaryColor.g}, ${primaryColor.b}, 0.3)`);
    outerGlow.addColorStop(1, 'transparent');
    c.fillStyle = outerGlow;
    c.beginPath();
    c.arc(flameCenterX, flameCenterY, flameHeight * 1.5, 0, Math.PI * 2);
    c.fill();

    // Main flame shape
    const flameGradient = c.createLinearGradient(
      flameCenterX, -candleHeight,
      flameCenterX + particle.angle * 10, -candleHeight - flameHeight
    );
    flameGradient.addColorStop(0, '#FFFFFF');
    flameGradient.addColorStop(0.2, '#FFFF88');
    flameGradient.addColorStop(0.5, `rgb(${primaryColor.r}, ${primaryColor.g}, ${Math.floor(primaryColor.b * 0.5)})`);
    flameGradient.addColorStop(0.8, `rgb(${primaryColor.r}, ${Math.floor(primaryColor.g * 0.5)}, 0)`);
    flameGradient.addColorStop(1, 'rgba(255, 50, 0, 0)');

    c.fillStyle = flameGradient;
    
    // Teardrop flame shape
    c.beginPath();
    c.moveTo(0, -candleHeight - 5);
    
    // Left curve
    c.bezierCurveTo(
      -flameWidth + flickerX * 0.3, -candleHeight - flameHeight * 0.3,
      -flameWidth * 0.5 + flameCenterX, -candleHeight - flameHeight * 0.7,
      flameCenterX + flickerX, -candleHeight - flameHeight
    );
    
    // Right curve
    c.bezierCurveTo(
      flameWidth * 0.5 + flameCenterX, -candleHeight - flameHeight * 0.7,
      flameWidth + flickerX * 0.3, -candleHeight - flameHeight * 0.3,
      0, -candleHeight - 5
    );
    
    c.fill();

    // Inner bright core
    c.fillStyle = 'rgba(255, 255, 200, 0.8)';
    c.beginPath();
    c.ellipse(flickerX * 0.3, -candleHeight - 8, flameWidth * 0.3, flameHeight * 0.25, 0, 0, Math.PI * 2);
    c.fill();

    c.restore();

    // Light cast on ground
    const lightRadius = 30 + flameHeight;
    const groundLight = c.createRadialGradient(screenX, groundY, 0, screenX, groundY, lightRadius);
    groundLight.addColorStop(0, `rgba(${primaryColor.r}, ${primaryColor.g}, ${Math.floor(primaryColor.b * 0.3)}, 0.3)`);
    groundLight.addColorStop(1, 'transparent');
    c.fillStyle = groundLight;
    c.beginPath();
    c.ellipse(screenX, groundY + 5, lightRadius, lightRadius * 0.3, 0, 0, Math.PI * 2);
    c.fill();
  });

  // Energy source marker
  c.strokeStyle = `rgba(${secondaryColor.r}, ${secondaryColor.g}, ${secondaryColor.b}, ${windPulse})`;
  c.lineWidth = 2;
  c.setLineDash([3, 3]);
  c.beginPath();
  c.arc(attractorX, attractorY, 20, 0, Math.PI * 2);
  c.stroke();
  c.setLineDash([]);

  // Swirl icon
  c.beginPath();
  c.arc(attractorX, attractorY, 12, 0, Math.PI * 1.5);
  c.stroke();
}
