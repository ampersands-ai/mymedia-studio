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
  vx: number;
  vy: number;
  vz: number;
  size: number;
  colorMix: number;
}

export function Canvas2DFallback({ params, className = '' }: Canvas2DFallbackProps) {
  // Create and manage our own canvas - never share with WebGPU
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number | null>(null);
  const timeRef = useRef(0);

  const hexToRgb = useCallback((hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return { r, g, b };
  }, []);

  const initParticles = useCallback(() => {
    const count = params.instanceCount;
    const particles: Particle[] = [];

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 * 4;
      const radius = 100 + (i / count) * 200;
      
      particles.push({
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        z: (Math.random() - 0.5) * 400,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        vz: (Math.random() - 0.5) * 0.5,
        size: 3 + Math.random() * 5,
        colorMix: Math.random(),
      });
    }

    particlesRef.current = particles;
  }, [params.instanceCount]);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('Canvas2DFallback: Could not get 2D context');
      return;
    }

    const { width, height } = canvas;
    const centerX = width / 2;
    const centerY = height / 2;
    
    timeRef.current += 0.016 * params.cameraSpeed;

    // Clear with background color
    const bgColor = hexToRgb(params.backgroundColor);
    ctx.fillStyle = `rgb(${bgColor.r}, ${bgColor.g}, ${bgColor.b})`;
    ctx.fillRect(0, 0, width, height);

    const color1 = hexToRgb(params.colorPrimary);
    const color2 = hexToRgb(params.colorSecondary);

    // Sort particles by z for depth
    const sortedParticles = [...particlesRef.current].sort((a, b) => a.z - b.z);

    // Rotate all particles around center
    const rotationAngle = timeRef.current;
    const cosR = Math.cos(rotationAngle);
    const sinR = Math.sin(rotationAngle);

    sortedParticles.forEach((particle) => {
      // Apply rotation
      const rotatedX = particle.x * cosR - particle.z * sinR;
      const rotatedZ = particle.x * sinR + particle.z * cosR;

      // Simple perspective projection
      const perspective = 600;
      const scale = perspective / (perspective + rotatedZ);
      
      const screenX = centerX + rotatedX * scale;
      const screenY = centerY + particle.y * scale;
      const screenSize = particle.size * scale * (1 + params.metallic * 0.5);

      // Calculate color based on mix and depth
      const depthFactor = (rotatedZ + 200) / 400;
      const r = Math.round(color1.r + (color2.r - color1.r) * particle.colorMix);
      const g = Math.round(color1.g + (color2.g - color1.g) * particle.colorMix);
      const b = Math.round(color1.b + (color2.b - color1.b) * particle.colorMix);
      
      const alpha = 0.3 + depthFactor * 0.7;

      // Draw shape based on params
      ctx.beginPath();
      
      if (params.shape === 'sphere') {
        ctx.arc(screenX, screenY, screenSize, 0, Math.PI * 2);
      } else if (params.shape === 'pyramid') {
        ctx.moveTo(screenX, screenY - screenSize);
        ctx.lineTo(screenX - screenSize, screenY + screenSize);
        ctx.lineTo(screenX + screenSize, screenY + screenSize);
        ctx.closePath();
      } else {
        // cube as square
        ctx.rect(screenX - screenSize / 2, screenY - screenSize / 2, screenSize, screenSize);
      }

      // Add metallic glow effect
      if (params.metallic > 0.5) {
        const gradient = ctx.createRadialGradient(
          screenX, screenY, 0,
          screenX, screenY, screenSize * 2
        );
        gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha})`);
        gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
        ctx.fillStyle = gradient;
      } else {
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
      }
      
      ctx.fill();
    });

    animationRef.current = requestAnimationFrame(render);
  }, [params, hexToRgb]);

  // Initialize canvas and start animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateSize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      initParticles();
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
  }, [initParticles, render]);

  // Re-init particles when count changes
  useEffect(() => {
    initParticles();
  }, [params.instanceCount, initParticles]);

  return (
    <canvas
      ref={canvasRef}
      className={`h-full w-full ${className}`}
      style={{ backgroundColor: params.backgroundColor }}
    />
  );
}
