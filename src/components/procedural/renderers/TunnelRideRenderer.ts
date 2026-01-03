// TunnelRide Renderer - POV magical tunnel ride through glowing orbs
// Creates an immersive first-person view speeding through a neon-lit tunnel

import { RenderContext } from './types';

// Tunnel orb particle - positioned in cylindrical tunnel
export interface TunnelOrb {
  angle: number;      // Angle around the tunnel circumference (0-2PI)
  radius: number;     // Distance from tunnel center
  z: number;          // Depth position (0 = far, 1 = close/behind camera)
  size: number;       // Orb size
  colorIndex: number; // Which neon color (0-4)
  brightness: number; // Glow intensity
  speed: number;      // Individual speed variation
  trail: number;      // Trail length multiplier
}

// Neon color palette
const NEON_COLORS = [
  { r: 255, g: 149, b: 0 },    // Orange #FF9500
  { r: 0, g: 255, b: 255 },    // Cyan #00FFFF
  { r: 255, g: 0, b: 255 },    // Magenta #FF00FF
  { r: 255, g: 255, b: 0 },    // Yellow #FFFF00
  { r: 0, g: 255, b: 0 },      // Green #00FF00
];

// Configuration
const TUNNEL_RADIUS_MIN = 0.15; // Min radius (normalized)
const TUNNEL_RADIUS_MAX = 0.45; // Max radius (normalized)
const BASE_SPEED = 0.015;       // Base movement speed toward camera
const SPAWN_Z = 1.0;            // Where new orbs spawn (far end)
const DESPAWN_Z = -0.1;         // Where orbs despawn (behind camera)

export function initTunnelRideOrbs(count: number): TunnelOrb[] {
  const orbs: TunnelOrb[] = [];
  
  for (let i = 0; i < count; i++) {
    orbs.push(createOrb(Math.random())); // Random initial Z position
  }
  
  return orbs;
}

function createOrb(initialZ: number): TunnelOrb {
  return {
    angle: Math.random() * Math.PI * 2,
    radius: TUNNEL_RADIUS_MIN + Math.random() * (TUNNEL_RADIUS_MAX - TUNNEL_RADIUS_MIN),
    z: initialZ,
    size: 0.003 + Math.random() * 0.012,
    colorIndex: Math.floor(Math.random() * NEON_COLORS.length),
    brightness: 0.6 + Math.random() * 0.4,
    speed: 0.7 + Math.random() * 0.6, // 0.7x to 1.3x base speed
    trail: 0.5 + Math.random() * 1.5,
  };
}

export function updateTunnelRideOrbs(
  orbs: TunnelOrb[],
  speed: number,
  time: number
): void {
  const actualSpeed = BASE_SPEED * speed * (1 + Math.sin(time * 0.5) * 0.2); // Pulsing speed
  
  for (const orb of orbs) {
    // Move orb toward camera (decreasing Z)
    orb.z -= actualSpeed * orb.speed;
    
    // Slight rotation as orbs move
    orb.angle += 0.001 * orb.speed;
    
    // Recycle orbs that pass behind camera
    if (orb.z < DESPAWN_Z) {
      // Reset to far end
      orb.z = SPAWN_Z + Math.random() * 0.1;
      orb.angle = Math.random() * Math.PI * 2;
      orb.radius = TUNNEL_RADIUS_MIN + Math.random() * (TUNNEL_RADIUS_MAX - TUNNEL_RADIUS_MIN);
      orb.colorIndex = Math.floor(Math.random() * NEON_COLORS.length);
      orb.brightness = 0.6 + Math.random() * 0.4;
    }
  }
}

export function renderTunnelRide(
  ctx: RenderContext,
  orbs: TunnelOrb[],
  time: number
): void {
  const { ctx: c, width, height, primaryColor, secondaryColor, backgroundColor } = ctx;
  const centerX = width / 2;
  const centerY = height / 2;
  const minDim = Math.min(width, height);
  
  // Draw deep dark background with slight blue tint
  c.fillStyle = `rgb(${backgroundColor.r}, ${backgroundColor.g}, ${backgroundColor.b})`;
  c.fillRect(0, 0, width, height);
  
  // Draw vanishing point glow (center of tunnel)
  const vanishGlow = c.createRadialGradient(centerX, centerY, 0, centerX, centerY, minDim * 0.15);
  vanishGlow.addColorStop(0, 'rgba(100, 150, 255, 0.15)');
  vanishGlow.addColorStop(0.5, 'rgba(50, 100, 200, 0.05)');
  vanishGlow.addColorStop(1, 'transparent');
  c.fillStyle = vanishGlow;
  c.fillRect(0, 0, width, height);
  
  // Sort orbs by Z (far to near) for proper depth rendering
  const sortedOrbs = [...orbs].sort((a, b) => b.z - a.z);
  
  // Render each orb
  for (const orb of sortedOrbs) {
    if (orb.z < 0 || orb.z > 1) continue;
    
    // Perspective projection - closer orbs appear larger and further from center
    const perspective = 1 / (orb.z + 0.1);
    const screenRadius = orb.radius * perspective * minDim * 0.5;
    
    // Position on screen
    const screenX = centerX + Math.cos(orb.angle) * screenRadius;
    const screenY = centerY + Math.sin(orb.angle) * screenRadius;
    
    // Size based on distance (closer = bigger)
    const orbSize = orb.size * perspective * minDim * 2;
    
    // Skip if too small or off screen
    if (orbSize < 1 || screenX < -50 || screenX > width + 50 || screenY < -50 || screenY > height + 50) continue;
    
    // Get color based on primary/secondary or neon palette
    let color: { r: number; g: number; b: number };
    if (orb.colorIndex < 2) {
      // Use primary/secondary colors for first 2 indices
      color = orb.colorIndex === 0 ? primaryColor : secondaryColor;
    } else {
      // Use neon palette for variety
      color = NEON_COLORS[orb.colorIndex];
    }
    
    // Alpha based on distance (fade at edges)
    const alpha = orb.brightness * Math.min(1, (1 - orb.z) * 2) * Math.min(1, orb.z * 5);
    
    // Draw motion trail (speed line toward center)
    if (orbSize > 3) {
      const trailLength = orbSize * orb.trail * (1 + ctx.cameraSpeed);
      const dirX = (screenX - centerX) / screenRadius;
      const dirY = (screenY - centerY) / screenRadius;
      
      // Trail points toward vanishing point
      const trailEndX = screenX - dirX * trailLength;
      const trailEndY = screenY - dirY * trailLength;
      
      const trailGradient = c.createLinearGradient(trailEndX, trailEndY, screenX, screenY);
      trailGradient.addColorStop(0, 'transparent');
      trailGradient.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha * 0.5})`);
      
      c.strokeStyle = trailGradient;
      c.lineWidth = orbSize * 0.5;
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(trailEndX, trailEndY);
      c.lineTo(screenX, screenY);
      c.stroke();
    }
    
    // Draw glow
    const glowSize = orbSize * 3;
    const glow = c.createRadialGradient(screenX, screenY, 0, screenX, screenY, glowSize);
    glow.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha * 0.4})`);
    glow.addColorStop(0.3, `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha * 0.15})`);
    glow.addColorStop(1, 'transparent');
    
    c.fillStyle = glow;
    c.beginPath();
    c.arc(screenX, screenY, glowSize, 0, Math.PI * 2);
    c.fill();
    
    // Draw orb core
    const coreGradient = c.createRadialGradient(
      screenX - orbSize * 0.2, screenY - orbSize * 0.2, 0,
      screenX, screenY, orbSize
    );
    coreGradient.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
    coreGradient.addColorStop(0.3, `rgba(${Math.min(255, color.r + 50)}, ${Math.min(255, color.g + 50)}, ${Math.min(255, color.b + 50)}, ${alpha})`);
    coreGradient.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha * 0.8})`);
    
    c.fillStyle = coreGradient;
    c.beginPath();
    c.arc(screenX, screenY, orbSize, 0, Math.PI * 2);
    c.fill();
  }
  
  // Draw subtle tunnel edge silhouettes (dark shapes on edges)
  drawTunnelSilhouettes(c, width, height, time);
  
  // Draw bike handlebar overlay at bottom
  drawHandlebars(c, width, height);
}

function drawTunnelSilhouettes(
  c: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number
): void {
  // Left edge silhouette - organic tree shapes
  c.fillStyle = 'rgba(0, 0, 0, 0.6)';
  
  const segments = 8;
  for (let i = 0; i < segments; i++) {
    const y = (i / segments) * height;
    const nextY = ((i + 1) / segments) * height;
    const wave = Math.sin(time * 0.5 + i * 0.8) * 15;
    const baseWidth = 30 + Math.sin(i * 1.5) * 20 + wave;
    
    c.beginPath();
    c.moveTo(0, y);
    c.lineTo(baseWidth, y + 10);
    c.lineTo(baseWidth - 10, (y + nextY) / 2);
    c.lineTo(baseWidth + 5, nextY - 10);
    c.lineTo(0, nextY);
    c.closePath();
    c.fill();
  }
  
  // Right edge silhouette
  for (let i = 0; i < segments; i++) {
    const y = (i / segments) * height;
    const nextY = ((i + 1) / segments) * height;
    const wave = Math.sin(time * 0.5 + i * 0.8 + 2) * 15;
    const baseWidth = 30 + Math.sin(i * 1.5 + 1) * 20 + wave;
    
    c.beginPath();
    c.moveTo(width, y);
    c.lineTo(width - baseWidth, y + 10);
    c.lineTo(width - baseWidth + 10, (y + nextY) / 2);
    c.lineTo(width - baseWidth - 5, nextY - 10);
    c.lineTo(width, nextY);
    c.closePath();
    c.fill();
  }
}

function drawHandlebars(
  c: CanvasRenderingContext2D,
  width: number,
  height: number
): void {
  const handlebarY = height * 0.85;
  const handlebarWidth = width * 0.6;
  const centerX = width / 2;
  
  c.fillStyle = 'rgba(0, 0, 0, 0.85)';
  c.strokeStyle = 'rgba(30, 30, 30, 0.9)';
  c.lineWidth = 3;
  
  // Left handlebar
  c.beginPath();
  c.moveTo(centerX - handlebarWidth * 0.5, height);
  c.quadraticCurveTo(
    centerX - handlebarWidth * 0.4, handlebarY - 20,
    centerX - handlebarWidth * 0.15, handlebarY
  );
  c.lineTo(centerX - handlebarWidth * 0.1, height);
  c.closePath();
  c.fill();
  c.stroke();
  
  // Right handlebar
  c.beginPath();
  c.moveTo(centerX + handlebarWidth * 0.5, height);
  c.quadraticCurveTo(
    centerX + handlebarWidth * 0.4, handlebarY - 20,
    centerX + handlebarWidth * 0.15, handlebarY
  );
  c.lineTo(centerX + handlebarWidth * 0.1, height);
  c.closePath();
  c.fill();
  c.stroke();
  
  // Center stem
  c.beginPath();
  c.moveTo(centerX - 15, height);
  c.lineTo(centerX - 10, handlebarY + 10);
  c.lineTo(centerX + 10, handlebarY + 10);
  c.lineTo(centerX + 15, height);
  c.closePath();
  c.fill();
  c.stroke();
  
  // Grip details on left
  c.fillStyle = 'rgba(50, 50, 50, 0.9)';
  c.beginPath();
  c.ellipse(centerX - handlebarWidth * 0.42, handlebarY - 5, 12, 20, -0.3, 0, Math.PI * 2);
  c.fill();
  
  // Grip details on right
  c.beginPath();
  c.ellipse(centerX + handlebarWidth * 0.42, handlebarY - 5, 12, 20, 0.3, 0, Math.PI * 2);
  c.fill();
}
