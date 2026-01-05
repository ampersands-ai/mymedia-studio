// Spotlights Renderer - Theater spotlights with visible light cones

import { TrackingParticle, RenderContext, AttractorState, AttractorPattern } from './types';
import { 
  updateAttractor, 
  angleToTarget, 
  distanceToTarget,
  applySpringRotation
} from './trackingUtils';

export function initSpotlightsParticles(instanceCount: number): TrackingParticle[] {
  // Spotlights arranged in rows at the top
  const cols = Math.min(Math.ceil(Math.sqrt(instanceCount) * 1.5), 20);
  const rows = Math.min(Math.ceil(instanceCount / cols / 3), 4);
  
  const particles: TrackingParticle[] = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      particles.push({
        x: (col + 0.5) / cols,
        y: 0.05 + row * 0.08, // Top of screen
        angle: Math.PI / 2, // Start pointing down
        targetAngle: Math.PI / 2,
        springiness: 0.06 + Math.random() * 0.04,
        scale: 0.8 + Math.random() * 0.4,
        phase: Math.random() * Math.PI * 2,
        beamIntensity: 0.7 + Math.random() * 0.3,
      });
    }
  }

  return particles;
}

export function updateSpotlightsAttractor(current: AttractorState, speed: number, pattern: AttractorPattern = 'trueRandom'): AttractorState {
  return updateAttractor({ ...current, pattern }, 0.016, speed * 0.6);
}

export function renderSpotlights(
  ctx: RenderContext,
  particles: TrackingParticle[],
  attractor: AttractorState
): void {
  const { ctx: c, width, height, primaryColor, secondaryColor, backgroundColor, metallic, time } = ctx;

  // Dark stage background
  c.fillStyle = `rgb(${Math.floor(backgroundColor.r * 0.5)}, ${Math.floor(backgroundColor.g * 0.5)}, ${Math.floor(backgroundColor.b * 0.5)})`;
  c.fillRect(0, 0, width, height);

  // Draw stage floor
  const stageGradient = c.createLinearGradient(0, height * 0.7, 0, height);
  stageGradient.addColorStop(0, `rgba(${backgroundColor.r * 0.8}, ${backgroundColor.g * 0.8}, ${backgroundColor.b * 0.8}, 0.5)`);
  stageGradient.addColorStop(1, `rgba(${backgroundColor.r * 0.4}, ${backgroundColor.g * 0.4}, ${backgroundColor.b * 0.4}, 0.8)`);
  c.fillStyle = stageGradient;
  c.fillRect(0, height * 0.7, width, height * 0.3);

  // Draw ceiling/rigging
  c.fillStyle = '#1a1a1a';
  c.fillRect(0, 0, width, height * 0.15);

  const attractorX = attractor.x * width;
  const attractorY = Math.max(height * 0.5, attractor.y * height); // Keep target in lower half

  // Sort by intensity for proper layering
  const sortedParticles = [...particles].sort((a, b) => (a.beamIntensity || 0) - (b.beamIntensity || 0));

  sortedParticles.forEach((particle) => {
    const screenX = particle.x * width;
    const screenY = particle.y * height;

    // Calculate target angle to attractor
    const targetAngle = angleToTarget(screenX, screenY, attractorX, attractorY);
    applySpringRotation(particle, targetAngle);

    const dist = distanceToTarget(screenX / width, screenY / height, attractor.x, attractor.y);
    
    // Beam properties
    const beamLength = height * 1.2;
    const beamAngle = particle.angle;
    const beamWidth = 0.15 + particle.scale * 0.1;
    
    // Calculate beam end point
    const beamEndX = screenX + Math.cos(beamAngle) * beamLength;
    const beamEndY = screenY + Math.sin(beamAngle) * beamLength;

    // Intensity increases when pointing at target
    const focusFactor = 1 - Math.min(1, dist * 1.5);
    const intensity = (particle.beamIntensity || 0.8) * (0.5 + focusFactor * 0.5);

    // Draw light cone with volumetric effect
    const coneGradient = c.createLinearGradient(screenX, screenY, beamEndX, beamEndY);
    const beamColor = focusFactor > 0.5 ? primaryColor : secondaryColor;
    coneGradient.addColorStop(0, `rgba(${beamColor.r}, ${beamColor.g}, ${beamColor.b}, ${intensity * 0.6})`);
    coneGradient.addColorStop(0.3, `rgba(${beamColor.r}, ${beamColor.g}, ${beamColor.b}, ${intensity * 0.3})`);
    coneGradient.addColorStop(1, 'transparent');

    c.save();
    c.translate(screenX, screenY);
    c.rotate(beamAngle);

    // Draw cone shape
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(beamLength, -beamLength * beamWidth);
    c.lineTo(beamLength, beamLength * beamWidth);
    c.closePath();

    c.fillStyle = coneGradient;
    c.fill();

    // Add dust particles in beam
    c.fillStyle = `rgba(255, 255, 255, ${intensity * 0.15})`;
    for (let i = 0; i < 8; i++) {
      const dustDist = Math.random() * beamLength * 0.8 + beamLength * 0.1;
      const dustOffset = (Math.random() - 0.5) * dustDist * beamWidth * 1.5;
      const dustSize = 1 + Math.random() * 2;
      const dustX = dustDist;
      const dustY = dustOffset;
      
      // Animate dust
      const dustPhase = time * 0.5 + particle.phase + i;
      const animatedY = dustY + Math.sin(dustPhase) * 3;
      
      c.beginPath();
      c.arc(dustX, animatedY, dustSize, 0, Math.PI * 2);
      c.fill();
    }

    c.restore();

    // Draw spotlight fixture
    const fixtureSize = 12 * particle.scale;
    
    // Housing
    c.fillStyle = '#2a2a2a';
    c.beginPath();
    c.arc(screenX, screenY, fixtureSize, 0, Math.PI * 2);
    c.fill();

    // Lens
    const lensGradient = c.createRadialGradient(
      screenX, screenY, 0,
      screenX, screenY, fixtureSize * 0.7
    );
    lensGradient.addColorStop(0, `rgba(${beamColor.r}, ${beamColor.g}, ${beamColor.b}, ${0.8 + focusFactor * 0.2})`);
    lensGradient.addColorStop(0.5, `rgba(${beamColor.r}, ${beamColor.g}, ${beamColor.b}, 0.5)`);
    lensGradient.addColorStop(1, `rgba(${beamColor.r * 0.5}, ${beamColor.g * 0.5}, ${beamColor.b * 0.5}, 0.3)`);
    
    c.fillStyle = lensGradient;
    c.beginPath();
    c.arc(screenX, screenY, fixtureSize * 0.7, 0, Math.PI * 2);
    c.fill();

    // Metallic rim
    c.strokeStyle = `rgba(255, 255, 255, ${metallic * 0.3})`;
    c.lineWidth = 2;
    c.beginPath();
    c.arc(screenX, screenY, fixtureSize, 0, Math.PI * 2);
    c.stroke();
  });

  // Draw target glow on stage
  const stageGlow = c.createRadialGradient(attractorX, attractorY, 0, attractorX, attractorY, 100);
  stageGlow.addColorStop(0, `rgba(${primaryColor.r}, ${primaryColor.g}, ${primaryColor.b}, 0.6)`);
  stageGlow.addColorStop(0.5, `rgba(${primaryColor.r}, ${primaryColor.g}, ${primaryColor.b}, 0.2)`);
  stageGlow.addColorStop(1, 'transparent');
  c.fillStyle = stageGlow;
  c.beginPath();
  c.arc(attractorX, attractorY, 100, 0, Math.PI * 2);
  c.fill();
}
