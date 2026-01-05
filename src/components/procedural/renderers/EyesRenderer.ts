// Eyes Renderer - Grid of eyeballs tracking a moving point

import { TrackingParticle, RenderContext, AttractorState, AttractorPattern } from './types';
import { 
  initTrackingGrid, 
  updateAttractor, 
  angleToTarget, 
  distanceToTarget,
  getGridDimensions 
} from './trackingUtils';

export function initEyesParticles(instanceCount: number): TrackingParticle[] {
  const { cols, rows } = getGridDimensions(instanceCount);
  const particles = initTrackingGrid(cols, rows, {
    springinessRange: [0.08, 0.15],
    scaleRange: [0.9, 1.1],
    jitter: 0.01
  });

  // Initialize eye-specific properties
  particles.forEach(p => {
    p.pupilX = 0;
    p.pupilY = 0;
    p.targetPupilX = 0;
    p.targetPupilY = 0;
    p.pupilDilation = 1;
  });

  return particles;
}

export function updateEyesAttractor(current: AttractorState, speed: number, pattern: AttractorPattern = 'trueRandom'): AttractorState {
  return updateAttractor({ ...current, pattern }, 0.016, speed * 0.8);
}

export function renderEyes(
  ctx: RenderContext,
  particles: TrackingParticle[],
  attractor: AttractorState
): void {
  const { ctx: c, width, height, primaryColor, secondaryColor, backgroundColor, metallic } = ctx;

  // Draw dark background
  c.fillStyle = `rgb(${backgroundColor.r}, ${backgroundColor.g}, ${backgroundColor.b})`;
  c.fillRect(0, 0, width, height);

  // Calculate base eye size
  const gridSize = Math.sqrt(particles.length);
  const eyeRadius = Math.min(width, height) / gridSize * 0.35;

  particles.forEach((particle) => {
    const screenX = particle.x * width;
    const screenY = particle.y * height;
    const attractorScreenX = attractor.x * width;
    const attractorScreenY = attractor.y * height;

    // Calculate pupil target position (within eye bounds)
    const angle = angleToTarget(screenX, screenY, attractorScreenX, attractorScreenY);
    const dist = distanceToTarget(particle.x, particle.y, attractor.x, attractor.y);
    
    // Pupil moves within eye, more when target is close
    const maxPupilOffset = eyeRadius * 0.35;
    const pupilOffset = maxPupilOffset * Math.min(1, dist * 2);
    
    particle.targetPupilX = Math.cos(angle) * pupilOffset;
    particle.targetPupilY = Math.sin(angle) * pupilOffset;

    // Smooth pupil movement
    particle.pupilX = particle.pupilX! + (particle.targetPupilX! - particle.pupilX!) * 0.12;
    particle.pupilY = particle.pupilY! + (particle.targetPupilY! - particle.pupilY!) * 0.12;

    // Pupil dilates when target is close
    const targetDilation = 1 + (1 - Math.min(1, dist * 2.5)) * 0.5;
    particle.pupilDilation = particle.pupilDilation! + (targetDilation - particle.pupilDilation!) * 0.1;

    const size = eyeRadius * particle.scale;

    // Draw sclera (white of eye) with subtle shadow
    const scleraGradient = c.createRadialGradient(
      screenX - size * 0.2, screenY - size * 0.2, 0,
      screenX, screenY, size
    );
    scleraGradient.addColorStop(0, '#FFFFFF');
    scleraGradient.addColorStop(0.7, '#F0F0F0');
    scleraGradient.addColorStop(1, '#D0D0D0');
    
    c.fillStyle = scleraGradient;
    c.beginPath();
    c.arc(screenX, screenY, size, 0, Math.PI * 2);
    c.fill();

    // Eye outline
    c.strokeStyle = `rgba(${secondaryColor.r * 0.3}, ${secondaryColor.g * 0.3}, ${secondaryColor.b * 0.3}, 0.5)`;
    c.lineWidth = 2;
    c.stroke();

    // Draw iris
    const irisSize = size * 0.55;
    const irisX = screenX + particle.pupilX!;
    const irisY = screenY + particle.pupilY!;

    const irisGradient = c.createRadialGradient(
      irisX - irisSize * 0.2, irisY - irisSize * 0.2, 0,
      irisX, irisY, irisSize
    );
    irisGradient.addColorStop(0, `rgba(${primaryColor.r + 50}, ${primaryColor.g + 50}, ${primaryColor.b + 50}, 1)`);
    irisGradient.addColorStop(0.5, `rgba(${primaryColor.r}, ${primaryColor.g}, ${primaryColor.b}, 1)`);
    irisGradient.addColorStop(1, `rgba(${primaryColor.r * 0.6}, ${primaryColor.g * 0.6}, ${primaryColor.b * 0.6}, 1)`);

    c.fillStyle = irisGradient;
    c.beginPath();
    c.arc(irisX, irisY, irisSize, 0, Math.PI * 2);
    c.fill();

    // Iris texture - radial lines
    c.strokeStyle = `rgba(${primaryColor.r * 0.4}, ${primaryColor.g * 0.4}, ${primaryColor.b * 0.4}, 0.3)`;
    c.lineWidth = 1;
    for (let i = 0; i < 12; i++) {
      const lineAngle = (i / 12) * Math.PI * 2;
      c.beginPath();
      c.moveTo(irisX + Math.cos(lineAngle) * irisSize * 0.3, irisY + Math.sin(lineAngle) * irisSize * 0.3);
      c.lineTo(irisX + Math.cos(lineAngle) * irisSize * 0.95, irisY + Math.sin(lineAngle) * irisSize * 0.95);
      c.stroke();
    }

    // Draw pupil with dilation
    const pupilSize = irisSize * 0.5 * particle.pupilDilation!;
    
    c.fillStyle = '#000000';
    c.beginPath();
    c.arc(irisX, irisY, pupilSize, 0, Math.PI * 2);
    c.fill();

    // Specular highlight on eye
    const highlightIntensity = metallic * 0.8;
    c.fillStyle = `rgba(255, 255, 255, ${highlightIntensity})`;
    c.beginPath();
    c.arc(screenX - size * 0.3, screenY - size * 0.3, size * 0.15, 0, Math.PI * 2);
    c.fill();

    // Second smaller highlight
    c.beginPath();
    c.arc(screenX + size * 0.15, screenY - size * 0.15, size * 0.08, 0, Math.PI * 2);
    c.fill();
  });

  // Draw subtle attractor glow (the thing eyes are looking at)
  const attractorX = attractor.x * width;
  const attractorY = attractor.y * height;
  const glowGradient = c.createRadialGradient(attractorX, attractorY, 0, attractorX, attractorY, 50);
  glowGradient.addColorStop(0, `rgba(${secondaryColor.r}, ${secondaryColor.g}, ${secondaryColor.b}, 0.3)`);
  glowGradient.addColorStop(1, 'transparent');
  c.fillStyle = glowGradient;
  c.beginPath();
  c.arc(attractorX, attractorY, 50, 0, Math.PI * 2);
  c.fill();
}
