import { useRef, useEffect, useCallback } from 'react';
import { ShaderParams } from '@/types/procedural-background';

interface Canvas2DFallbackProps {
  params: ShaderParams;
  className?: string;
}

interface Particle {
  x: number;
  y: number;
  z: number;
  baseX: number;
  baseY: number;
  vx: number;
  vy: number;
  vz: number;
  size: number;
  colorMix: number;
  spoke: number;
  ring: number;
  angleToCenter: number;
}

interface TunnelParticle {
  rayAngle: number;
  rayDistance: number;
  z: number;
  bobOffset: number;
  bobSpeed: number;
  colorMix: number;
}

export function Canvas2DFallback({ params, className = '' }: Canvas2DFallbackProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const tunnelParticlesRef = useRef<TunnelParticle[]>([]);
  const animationRef = useRef<number | null>(null);
  const timeRef = useRef(0);

  const hexToRgb = useCallback((hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return { r, g, b };
  }, []);

  const initTunnelParticles = useCallback(() => {
    const count = Math.min(params.instanceCount, 6000);
    const particles: TunnelParticle[] = [];
    const numRays = 80; // Number of radial rays
    const particlesPerRay = Math.floor(count / numRays);

    for (let ray = 0; ray < numRays; ray++) {
      const rayAngle = (ray / numRays) * Math.PI * 2;

      for (let i = 0; i < particlesPerRay; i++) {
        // Distribute particles along the ray with varying distances
        const rayDistance = 20 + Math.random() * 280; // Distance from center on screen
        const z = Math.random(); // 0 = at camera, 1 = far away

        particles.push({
          rayAngle,
          rayDistance,
          z,
          bobOffset: Math.random() * Math.PI * 2,
          bobSpeed: 0.5 + Math.random() * 1.5,
          colorMix: (ray + i) % 3 === 0 ? 1 : 0,
        });
      }
    }

    tunnelParticlesRef.current = particles;
  }, [params.instanceCount]);

  const initParticles = useCallback(() => {
    const count = params.instanceCount;
    const particles: Particle[] = [];
    const isCannon = params.arrangement === 'cannon';

    if (isCannon) {
      // Cannon: radial spokes pointing toward center
      const numSpokes = Math.floor(Math.sqrt(count) * 1.2);
      const particlesPerSpoke = Math.floor(count / numSpokes);

      for (let spoke = 0; spoke < numSpokes; spoke++) {
        const spokeAngle = (spoke / numSpokes) * Math.PI * 2;

        for (let ring = 0; ring < particlesPerSpoke; ring++) {
          const distance = 0.03 + (ring / particlesPerSpoke) * 0.47;
          const jitter = Math.sin(spoke * ring * 0.1) * 0.015;

          const x = 0.5 + Math.cos(spokeAngle) * (distance + jitter);
          const y = 0.5 + Math.sin(spokeAngle) * (distance + jitter);
          const z = 0.2 + (ring / particlesPerSpoke) * 0.8;

          const angleToCenter = Math.atan2(0.5 - y, 0.5 - x);

          particles.push({
            x,
            y,
            z,
            baseX: x,
            baseY: y,
            vx: 0,
            vy: 0,
            vz: 0,
            size: 0.002 + (ring / particlesPerSpoke) * 0.01,
            colorMix: (spoke + ring) % 3 === 0 ? 1 : 0,
            spoke,
            ring,
            angleToCenter,
          });
        }
      }
    } else {
      // Standard arrangements
      for (let i = 0; i < count; i++) {
        let x = 0.5, y = 0.5;

        if (params.arrangement === 'radial') {
          const angle = (i / count) * Math.PI * 2 * 4;
          const radius = 100 + (i / count) * 200;
          x = 0.5 + (Math.cos(angle) * radius) / 400;
          y = 0.5 + (Math.sin(angle) * radius) / 400;
        } else if (params.arrangement === 'spiral') {
          const angle = (i / count) * Math.PI * 12;
          const radius = (i / count) * 0.45;
          x = 0.5 + Math.cos(angle) * radius;
          y = 0.5 + Math.sin(angle) * radius;
        } else if (params.arrangement === 'grid') {
          const cols = Math.ceil(Math.sqrt(count));
          x = ((i % cols) / cols) * 0.8 + 0.1;
          y = (Math.floor(i / cols) / cols) * 0.8 + 0.1;
        } else if (params.arrangement === 'wave') {
          x = (i / count) * 0.9 + 0.05;
          y = 0.5 + Math.sin((i / count) * Math.PI * 4) * 0.3;
        }

        particles.push({
          x,
          y,
          z: Math.random(),
          baseX: x,
          baseY: y,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          vz: (Math.random() - 0.5) * 0.5,
          size: 3 + Math.random() * 5,
          colorMix: Math.random(),
          spoke: 0,
          ring: 0,
          angleToCenter: 0,
        });
      }
    }

    particlesRef.current = particles;
  }, [params.instanceCount, params.arrangement]);

  const draw3DCube = useCallback((
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    rotation: number,
    color: { r: number; g: number; b: number },
    metallic: number,
    lightAngle: number,
    alpha: number
  ) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);

    const cubeSize = size;
    const depth = size * 0.35;
    const lightFactor = Math.cos(rotation - lightAngle) * 0.5 + 0.5;
    const highlightIntensity = metallic * lightFactor;

    // Front face
    const frontBrightness = 0.6 + highlightIntensity * 0.4;
    ctx.fillStyle = `rgba(${Math.min(255, color.r * frontBrightness)}, ${Math.min(255, color.g * frontBrightness)}, ${Math.min(255, color.b * frontBrightness)}, ${alpha})`;
    ctx.fillRect(-cubeSize / 2, -cubeSize / 2, cubeSize, cubeSize);

    // Top face
    const topBrightness = 0.8 + highlightIntensity * 0.5;
    ctx.fillStyle = `rgba(${Math.min(255, color.r * topBrightness)}, ${Math.min(255, color.g * topBrightness)}, ${Math.min(255, color.b * topBrightness)}, ${alpha})`;
    ctx.beginPath();
    ctx.moveTo(-cubeSize / 2, -cubeSize / 2);
    ctx.lineTo(-cubeSize / 2 + depth, -cubeSize / 2 - depth);
    ctx.lineTo(cubeSize / 2 + depth, -cubeSize / 2 - depth);
    ctx.lineTo(cubeSize / 2, -cubeSize / 2);
    ctx.closePath();
    ctx.fill();

    // Right face
    const rightBrightness = 0.4 + highlightIntensity * 0.3;
    ctx.fillStyle = `rgba(${color.r * rightBrightness}, ${color.g * rightBrightness}, ${color.b * rightBrightness}, ${alpha})`;
    ctx.beginPath();
    ctx.moveTo(cubeSize / 2, -cubeSize / 2);
    ctx.lineTo(cubeSize / 2 + depth, -cubeSize / 2 - depth);
    ctx.lineTo(cubeSize / 2 + depth, cubeSize / 2 - depth);
    ctx.lineTo(cubeSize / 2, cubeSize / 2);
    ctx.closePath();
    ctx.fill();

    // Metallic highlight
    if (metallic > 0.5) {
      const gradient = ctx.createLinearGradient(-cubeSize / 2, -cubeSize / 2, cubeSize / 2, cubeSize / 2);
      gradient.addColorStop(0, `rgba(255, 255, 255, ${highlightIntensity * 0.5 * alpha})`);
      gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
      gradient.addColorStop(1, `rgba(0, 0, 0, ${highlightIntensity * 0.2 * alpha})`);
      ctx.fillStyle = gradient;
      ctx.fillRect(-cubeSize / 2, -cubeSize / 2, cubeSize, cubeSize);
    }

    ctx.restore();
  }, []);

  // Two-tone metallic cube for tunnel effect
  const drawTunnelCube = useCallback((
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    color1: { r: number; g: number; b: number },
    color2: { r: number; g: number; b: number },
    metallic: number,
    alpha: number,
    depthFactor: number
  ) => {
    ctx.save();
    ctx.translate(x, y);

    const cubeSize = size;
    const depth = size * 0.35;

    // Cool light from upper-left (blue tones)
    const coolBrightness = 0.7 + metallic * 0.5;
    ctx.fillStyle = `rgba(${Math.min(255, color1.r * coolBrightness)}, ${Math.min(255, color1.g * coolBrightness)}, ${Math.min(255, color1.b * coolBrightness)}, ${alpha})`;
    ctx.fillRect(-cubeSize / 2, -cubeSize / 2, cubeSize, cubeSize);

    // Top face - brightest (cool light)
    const topBrightness = 0.9 + metallic * 0.4;
    ctx.fillStyle = `rgba(${Math.min(255, color1.r * topBrightness)}, ${Math.min(255, color1.g * topBrightness)}, ${Math.min(255, color1.b * topBrightness)}, ${alpha})`;
    ctx.beginPath();
    ctx.moveTo(-cubeSize / 2, -cubeSize / 2);
    ctx.lineTo(-cubeSize / 2 + depth, -cubeSize / 2 - depth);
    ctx.lineTo(cubeSize / 2 + depth, -cubeSize / 2 - depth);
    ctx.lineTo(cubeSize / 2, -cubeSize / 2);
    ctx.closePath();
    ctx.fill();

    // Right face - warm light (bronze tones)
    const warmBrightness = 0.6 + metallic * 0.3;
    ctx.fillStyle = `rgba(${Math.min(255, color2.r * warmBrightness)}, ${Math.min(255, color2.g * warmBrightness)}, ${Math.min(255, color2.b * warmBrightness)}, ${alpha})`;
    ctx.beginPath();
    ctx.moveTo(cubeSize / 2, -cubeSize / 2);
    ctx.lineTo(cubeSize / 2 + depth, -cubeSize / 2 - depth);
    ctx.lineTo(cubeSize / 2 + depth, cubeSize / 2 - depth);
    ctx.lineTo(cubeSize / 2, cubeSize / 2);
    ctx.closePath();
    ctx.fill();

    // Metallic specular highlight
    if (metallic > 0.5 && depthFactor > 0.3) {
      const gradient = ctx.createLinearGradient(-cubeSize / 2, -cubeSize / 2, cubeSize / 2, cubeSize / 2);
      gradient.addColorStop(0, `rgba(255, 255, 255, ${metallic * 0.6 * alpha})`);
      gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0)');
      gradient.addColorStop(1, `rgba(0, 0, 0, ${metallic * 0.15 * alpha})`);
      ctx.fillStyle = gradient;
      ctx.fillRect(-cubeSize / 2, -cubeSize / 2, cubeSize, cubeSize);
    }

    ctx.restore();
  }, []);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    const centerX = width / 2;
    const centerY = height / 2;

    timeRef.current += 0.016 * params.cameraSpeed;
    const isCannon = params.arrangement === 'cannon';
    const isTunnel = params.arrangement === 'tunnel';

    // Clear with background
    const bgColor = hexToRgb(params.backgroundColor);
    ctx.fillStyle = `rgb(${bgColor.r}, ${bgColor.g}, ${bgColor.b})`;
    ctx.fillRect(0, 0, width, height);

    const color1 = hexToRgb(params.colorPrimary);
    const color2 = hexToRgb(params.colorSecondary);

    if (isTunnel) {
      // Tunnel effect: forward camera movement through cube field
      const fov = 400;
      const forwardSpeed = params.cameraSpeed * 0.015;

      // Update and render tunnel particles
      const particles = tunnelParticlesRef.current;

      // Sort by z (far to near)
      const sortedParticles = [...particles].sort((a, b) => b.z - a.z);

      sortedParticles.forEach((particle) => {
        // Move particle toward camera
        particle.z -= forwardSpeed;

        // Respawn if passed camera
        if (particle.z <= 0) {
          particle.z = 1;
          particle.rayDistance = 20 + Math.random() * 280;
        }

        // Perspective projection
        const scale = fov / (fov + particle.z * 800);
        const bobAmount = Math.sin(timeRef.current * particle.bobSpeed + particle.bobOffset) * 3;

        const screenX = centerX + (Math.cos(particle.rayAngle) * particle.rayDistance * scale) + bobAmount * 0.3;
        const screenY = centerY + (Math.sin(particle.rayAngle) * particle.rayDistance * scale) + bobAmount * 0.3;

        // Size based on depth (larger when closer)
        const baseSize = 4 + (1 - particle.z) * 12;
        const size = baseSize * scale;

        // Alpha based on depth (fade in distance)
        const depthFactor = 1 - particle.z;
        const alpha = 0.15 + depthFactor * 0.75;

        // Skip if too small or outside canvas
        if (size < 0.5 || screenX < -20 || screenX > width + 20 || screenY < -20 || screenY > height + 20) return;

        // Draw two-tone metallic cube
        const useSecondary = particle.colorMix > 0.5;
        const primaryColor = useSecondary ? color2 : color1;
        const secondaryColor = useSecondary ? color1 : color2;

        drawTunnelCube(ctx, screenX, screenY, size, primaryColor, secondaryColor, params.metallic, alpha, depthFactor);
      });

      // Central vanishing point glow
      const glowRadius = Math.min(width, height) * 0.08;
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, glowRadius);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
      gradient.addColorStop(0.3, `rgba(${color1.r}, ${color1.g}, ${color1.b}, 0.3)`);
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, glowRadius, 0, Math.PI * 2);
      ctx.fill();

    } else {
      // Central glow for cannon
      if (isCannon) {
        const primaryRgb = hexToRgb(params.colorPrimary);
        const glowRadius = Math.min(width, height) * 0.18;
        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, glowRadius);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
        gradient.addColorStop(0.15, `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, 0.7)`);
        gradient.addColorStop(0.4, `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, 0.25)`);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, glowRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Sort by z
      const sortedParticles = [...particlesRef.current].sort((a, b) => a.z - b.z);

      const rotationAngle = timeRef.current;
      const cosR = Math.cos(rotationAngle);
      const sinR = Math.sin(rotationAngle);

      sortedParticles.forEach((particle) => {
        let screenX: number, screenY: number, screenSize: number, rotation: number;

        if (isCannon) {
          // Cannon: enhanced pulse animation
          const pulseOffset = Math.sin(timeRef.current * 2 + particle.spoke * 0.3) * 0.025;
          const rotationPulse = Math.sin(timeRef.current * 1.5 + particle.ring * 0.2) * 0.1;
          const currentX = particle.baseX + Math.cos(particle.angleToCenter + Math.PI) * pulseOffset;
          const currentY = particle.baseY + Math.sin(particle.angleToCenter + Math.PI) * pulseOffset;

          screenX = currentX * width;
          screenY = currentY * height;
          const sizePulse = 1 + Math.sin(timeRef.current * 3 + particle.spoke * 0.5) * 0.15;
          screenSize = particle.size * Math.min(width, height) * (0.4 + particle.z * 0.6) * sizePulse;
          rotation = particle.angleToCenter + Math.PI / 2 + rotationPulse;
        } else {
          // Standard: apply rotation
          const px = (particle.x - 0.5) * 400;
          const pz = (particle.z - 0.5) * 400;
          const rotatedX = px * cosR - pz * sinR;
          const rotatedZ = px * sinR + pz * cosR;

          const perspective = 600;
          const scale = perspective / (perspective + rotatedZ);

          screenX = centerX + rotatedX * scale;
          screenY = centerY + (particle.y - 0.5) * 400 * scale;
          screenSize = particle.size * scale * (1 + params.metallic * 0.5);
          rotation = rotationAngle + particle.z * 2;
        }

        // Skip if outside canvas
        if (screenX < -50 || screenX > width + 50 || screenY < -50 || screenY > height + 50) return;

        const color = particle.colorMix > 0.5 ? color2 : color1;
        const depthFactor = particle.z;
        const alpha = 0.3 + depthFactor * 0.7;
        const lightAngle = Math.atan2(centerY - screenY, centerX - screenX);

        if (params.shape === 'sphere') {
          const gradient = ctx.createRadialGradient(
            screenX - screenSize * 0.3,
            screenY - screenSize * 0.3,
            0,
            screenX,
            screenY,
            screenSize
          );
          const highlightFactor = params.metallic * (0.5 + Math.cos(lightAngle) * 0.5);
          gradient.addColorStop(0, `rgba(255, 255, 255, ${highlightFactor * alpha})`);
          gradient.addColorStop(0.3, `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`);
          gradient.addColorStop(1, `rgba(${Math.floor(color.r * 0.3)}, ${Math.floor(color.g * 0.3)}, ${Math.floor(color.b * 0.3)}, ${alpha})`);

          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(screenX, screenY, screenSize, 0, Math.PI * 2);
          ctx.fill();

          if (params.metallic > 0.5 && isCannon) {
            ctx.shadowColor = `rgba(${color.r}, ${color.g}, ${color.b}, 0.4)`;
            ctx.shadowBlur = screenSize;
            ctx.beginPath();
            ctx.arc(screenX, screenY, screenSize * 0.3, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
          }
        } else if (params.shape === 'pyramid') {
          ctx.save();
          ctx.translate(screenX, screenY);
          ctx.rotate(rotation);

          const brightness = 0.7 + params.metallic * Math.cos(lightAngle) * 0.3;
          ctx.fillStyle = `rgba(${Math.min(255, color.r * brightness)}, ${Math.min(255, color.g * brightness)}, ${Math.min(255, color.b * brightness)}, ${alpha})`;
          ctx.beginPath();
          ctx.moveTo(0, -screenSize);
          ctx.lineTo(-screenSize, screenSize);
          ctx.lineTo(screenSize, screenSize);
          ctx.closePath();
          ctx.fill();

          ctx.restore();
        } else {
          // 3D metallic cube
          draw3DCube(ctx, screenX, screenY, screenSize * 1.5, rotation, color, params.metallic, lightAngle, alpha);
        }
      });
    }

    animationRef.current = requestAnimationFrame(render);
  }, [params, hexToRgb, draw3DCube, drawTunnelCube]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateSize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      if (params.arrangement === 'tunnel') {
        initTunnelParticles();
      } else {
        initParticles();
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    animationRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', updateSize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [initParticles, initTunnelParticles, render, params.arrangement]);

  useEffect(() => {
    if (params.arrangement === 'tunnel') {
      initTunnelParticles();
    } else {
      initParticles();
    }
  }, [params.instanceCount, params.arrangement, initParticles, initTunnelParticles]);

  return (
    <canvas
      ref={canvasRef}
      className={`h-full w-full ${className}`}
      style={{ backgroundColor: params.backgroundColor }}
    />
  );
}
