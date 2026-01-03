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
  // Additional properties for new effects
  angle?: number;
  radius?: number;
  speed?: number;
  phase?: number;
  orbitTilt?: number;
  orbitIndex?: number;
}

interface TunnelParticle {
  rayAngle: number;
  rayDistance: number;
  z: number;
  bobOffset: number;
  bobSpeed: number;
  colorMix: number;
}

// Helix particle for DNA double helix effect
interface HelixParticle {
  angle: number;
  y: number;
  strand: number; // 0 or 1
  speed: number;
  size: number;
}

// Matrix particle for rain effect
interface MatrixParticle {
  x: number;
  y: number;
  speed: number;
  brightness: number;
  column: number;
}

// Orbit particle for atomic orbits
interface OrbitParticle {
  angle: number;
  orbitIndex: number;
  orbitTilt: number;
  orbitSpeed: number;
  radius: number;
  size: number;
}

// Vortex particle for spiral vortex
interface VortexParticle {
  angle: number;
  radius: number;
  z: number;
  speed: number;
  colorMix: number;
}

// Constellation particle for floating spheres
interface ConstellationParticle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  size: number;
  brightness: number;
}

// Stream particle for flowing river
interface StreamParticle {
  t: number; // position along bezier curve 0-1
  offset: number; // perpendicular offset from center
  speed: number;
  size: number;
  colorMix: number;
}

// Explosion particle
interface ExplosionParticle {
  angle: number;
  distance: number;
  maxDistance: number;
  speed: number;
  size: number;
  colorMix: number;
}

// Sunflower particle for heliotropism effect
interface SunflowerParticle {
  x: number; // position on field
  z: number; // depth position
  stemHeight: number;
  stemCurve: number; // slight random bend
  headRotationY: number; // current horizontal rotation
  headRotationX: number; // current vertical tilt
  targetRotationY: number;
  targetRotationX: number;
  petalCount: number;
  swayOffset: number; // for wind sway
  swaySpeed: number;
  scale: number;
}

// Solar panel particle for sun-tracking array
interface SolarPanelParticle {
  angle: number; // radial angle from center
  distance: number; // distance from center
  tiltX: number; // current tilt rotation
  tiltY: number; // current horizontal rotation  
  scale: number;
  colorMix: number;
  depth: number; // z depth for perspective
}

// Windmill particle for wind-responsive turbines
interface WindmillParticle {
  x: number; // grid position
  z: number; // depth position
  height: number; // tower height
  bladeAngle: number; // current blade rotation
  bladeSpeed: number; // current spin speed
  yawAngle: number; // direction turbine faces
  targetYaw: number; // target direction
  colorMix: number;
}

// Surfer particle for wave riding
interface SurferParticle {
  x: number; // position along wave
  z: number; // lateral position
  state: 'paddling' | 'riding' | 'returning';
  wavePhase: number; // timing on wave
  armPhase: number; // paddle animation
  boardTilt: number; // angle matching wave
  bodyLean: number; // turning lean
  speed: number;
  stateTimer: number; // time in current state
}

// Flag particle for wind-responsive flags
interface FlagParticle {
  x: number;
  z: number;
  poleHeight: number;
  flagWidth: number;
  flagHeight: number;
  wavePhase: number;
  waveAmplitude: number;
  colorIndex: number;
}

// Sailboat particle for ocean swells
interface SailboatParticle {
  x: number;
  z: number;
  size: number;
  rotation: number;
  sailBillow: number;
  colorMix: number;
}

// Tree particle for forest wind
interface TreeParticle {
  x: number;
  z: number;
  height: number;
  trunkWidth: number;
  canopySize: number;
  swayPhase: number;
  swayAmount: number;
  treeType: 'pine' | 'deciduous';
}

// Fish particle for schooling behavior
interface FishParticle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  size: number;
  colorMix: number;
}

// Bird particle for murmuration
interface BirdParticle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  wingPhase: number;
}

// Pendulum particle for wave patterns
interface PendulumParticle {
  length: number;
  angle: number;
  angularVelocity: number;
  x: number;
  colorMix: number;
}

// Domino particle for chain reaction
interface DominoParticle {
  x: number;
  y: number;
  angle: number; // tilt angle (0 = standing, PI/2 = fallen)
  targetAngle: number;
  fallSpeed: number;
  triggered: boolean;
  colorMix: number;
  pathIndex: number;
}

// Compass needle particle for magnetic field
interface CompassParticle {
  x: number;
  y: number;
  angle: number;
  targetAngle: number;
  springiness: number;
}

export function Canvas2DFallback({ params, className = '' }: Canvas2DFallbackProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const tunnelParticlesRef = useRef<TunnelParticle[]>([]);
  const helixParticlesRef = useRef<HelixParticle[]>([]);
  const matrixParticlesRef = useRef<MatrixParticle[]>([]);
  const orbitParticlesRef = useRef<OrbitParticle[]>([]);
  const vortexParticlesRef = useRef<VortexParticle[]>([]);
  const constellationParticlesRef = useRef<ConstellationParticle[]>([]);
  const streamParticlesRef = useRef<StreamParticle[]>([]);
  const explosionParticlesRef = useRef<ExplosionParticle[]>([]);
  const sunflowerParticlesRef = useRef<SunflowerParticle[]>([]);
  const solarPanelParticlesRef = useRef<SolarPanelParticle[]>([]);
  const windmillParticlesRef = useRef<WindmillParticle[]>([]);
  const surferParticlesRef = useRef<SurferParticle[]>([]);
  const flagParticlesRef = useRef<FlagParticle[]>([]);
  const sailboatParticlesRef = useRef<SailboatParticle[]>([]);
  const treeParticlesRef = useRef<TreeParticle[]>([]);
  const fishParticlesRef = useRef<FishParticle[]>([]);
  const birdParticlesRef = useRef<BirdParticle[]>([]);
  const pendulumParticlesRef = useRef<PendulumParticle[]>([]);
  const dominoParticlesRef = useRef<DominoParticle[]>([]);
  const compassParticlesRef = useRef<CompassParticle[]>([]);
  const animationRef = useRef<number | null>(null);
  const timeRef = useRef(0);
  const explosionPhaseRef = useRef(0); // 0 = expanding, 1 = contracting
  const sunAngleRef = useRef(0); // For sun arc position
  const lightAngleRef = useRef(0); // For solar panel light orbit
  const windAngleRef = useRef(0); // For wind direction
  const windGustRef = useRef(0); // For gust wave position
  const waveTimeRef = useRef(0); // For ocean waves
  const magnetPositionRef = useRef({ x: 0.5, y: 0.5, angle: 0 }); // For compass magnet
  const dominoTriggerRef = useRef(0); // For domino chain reaction
  const pendulumTimeRef = useRef(0); // For pendulum phase

  const hexToRgb = useCallback((hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return { r, g, b };
  }, []);

  // Initialize Helix particles (DNA double helix)
  const initHelixParticles = useCallback(() => {
    const count = Math.min(params.instanceCount, 2000);
    const particles: HelixParticle[] = [];
    const particlesPerStrand = Math.floor(count / 2);

    for (let strand = 0; strand < 2; strand++) {
      for (let i = 0; i < particlesPerStrand; i++) {
        particles.push({
          angle: (i / particlesPerStrand) * Math.PI * 8 + strand * Math.PI,
          y: (i / particlesPerStrand) * 2 - 1, // -1 to 1
          strand,
          speed: 0.8 + Math.random() * 0.4,
          size: 4 + Math.random() * 4,
        });
      }
    }
    helixParticlesRef.current = particles;
  }, [params.instanceCount]);

  // Initialize Matrix particles (digital rain)
  const initMatrixParticles = useCallback(() => {
    const count = Math.min(params.instanceCount, 8000);
    const particles: MatrixParticle[] = [];
    const columns = 60;
    const particlesPerColumn = Math.floor(count / columns);

    for (let col = 0; col < columns; col++) {
      for (let i = 0; i < particlesPerColumn; i++) {
        particles.push({
          x: col / columns,
          y: Math.random(),
          speed: 0.3 + Math.random() * 0.7,
          brightness: 0.3 + Math.random() * 0.7,
          column: col,
        });
      }
    }
    matrixParticlesRef.current = particles;
  }, [params.instanceCount]);

  // Initialize Orbit particles (atomic orbits)
  const initOrbitParticles = useCallback(() => {
    const count = Math.min(params.instanceCount, 500);
    const particles: OrbitParticle[] = [];
    const numOrbits = 6;
    const particlesPerOrbit = Math.floor(count / numOrbits);

    for (let orbit = 0; orbit < numOrbits; orbit++) {
      const tiltX = (orbit / numOrbits) * Math.PI;
      
      for (let i = 0; i < particlesPerOrbit; i++) {
        particles.push({
          angle: (i / particlesPerOrbit) * Math.PI * 2,
          orbitIndex: orbit,
          orbitTilt: tiltX,
          orbitSpeed: 0.5 + orbit * 0.2,
          radius: 100 + orbit * 35,
          size: 6 + Math.random() * 6,
        });
      }
    }
    orbitParticlesRef.current = particles;
  }, [params.instanceCount]);

  // Initialize Vortex particles (spiral vortex)
  const initVortexParticles = useCallback(() => {
    const count = Math.min(params.instanceCount, 4000);
    const particles: VortexParticle[] = [];

    for (let i = 0; i < count; i++) {
      const progress = i / count;
      particles.push({
        angle: progress * Math.PI * 12,
        radius: 20 + progress * 280,
        z: Math.random(),
        speed: 0.5 + (1 - progress) * 1.5, // Faster near center
        colorMix: progress,
      });
    }
    vortexParticlesRef.current = particles;
  }, [params.instanceCount]);

  // Initialize Constellation particles (floating spheres)
  const initConstellationParticles = useCallback(() => {
    const count = Math.min(params.instanceCount, 800);
    const particles: ConstellationParticle[] = [];

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random(),
        y: Math.random(),
        z: Math.random(),
        vx: (Math.random() - 0.5) * 0.0005,
        vy: (Math.random() - 0.5) * 0.0005,
        size: 3 + Math.random() * 12,
        brightness: 0.5 + Math.random() * 0.5,
      });
    }
    constellationParticlesRef.current = particles;
  }, [params.instanceCount]);

  // Initialize Stream particles (flowing river)
  const initStreamParticles = useCallback(() => {
    const count = Math.min(params.instanceCount, 5000);
    const particles: StreamParticle[] = [];

    for (let i = 0; i < count; i++) {
      particles.push({
        t: Math.random(),
        offset: (Math.random() - 0.5) * 0.15,
        speed: 0.2 + Math.random() * 0.4,
        size: 2 + Math.random() * 4,
        colorMix: Math.random(),
      });
    }
    streamParticlesRef.current = particles;
  }, [params.instanceCount]);

  // Initialize Explosion particles
  const initExplosionParticles = useCallback(() => {
    const count = Math.min(params.instanceCount, 3000);
    const particles: ExplosionParticle[] = [];

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      particles.push({
        angle,
        distance: 0,
        maxDistance: 50 + Math.random() * 250,
        speed: 0.5 + Math.random() * 1.5,
        size: 3 + Math.random() * 6,
        colorMix: Math.random(),
      });
    }
    explosionParticlesRef.current = particles;
    explosionPhaseRef.current = 0;
  }, [params.instanceCount]);

  // Initialize Sunflower particles (heliotropism)
  const initSunflowerParticles = useCallback(() => {
    const count = Math.min(params.instanceCount, 500);
    const particles: SunflowerParticle[] = [];
    const rows = Math.ceil(Math.sqrt(count));
    const cols = Math.ceil(count / rows);

    for (let i = 0; i < count; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      // Scatter positions with some randomness
      const baseX = (col / cols) * 0.8 + 0.1 + (Math.random() - 0.5) * 0.08;
      const baseZ = (row / rows) * 0.6 + 0.2 + (Math.random() - 0.5) * 0.05;
      
      particles.push({
        x: baseX,
        z: baseZ,
        stemHeight: 0.15 + Math.random() * 0.1,
        stemCurve: (Math.random() - 0.5) * 0.1,
        headRotationY: 0,
        headRotationX: 0,
        targetRotationY: 0,
        targetRotationX: 0,
        petalCount: 20 + Math.floor(Math.random() * 8),
        swayOffset: Math.random() * Math.PI * 2,
        swaySpeed: 0.5 + Math.random() * 0.5,
        scale: 0.8 + Math.random() * 0.4,
      });
    }
    sunflowerParticlesRef.current = particles;
    sunAngleRef.current = 0;
  }, [params.instanceCount]);

  // Initialize Solar Panel particles (radial sun-tracking array)
  const initSolarPanelParticles = useCallback(() => {
    const count = Math.min(params.instanceCount, 5000);
    const particles: SolarPanelParticle[] = [];
    const goldenAngle = Math.PI * (3 - Math.sqrt(5)); // ~137.5 degrees for organic distribution

    for (let i = 0; i < count; i++) {
      const angle = i * goldenAngle;
      const distance = Math.sqrt(i / count) * 0.45; // Sqrt for even radial distribution
      const depth = (i / count); // 0 to 1 (center to edge)

      particles.push({
        angle,
        distance,
        tiltX: 0,
        tiltY: 0,
        scale: 0.3 + depth * 0.7, // Larger panels further from center
        colorMix: (i % 3 === 0) ? 1 : 0,
        depth,
      });
    }
    solarPanelParticlesRef.current = particles;
    lightAngleRef.current = 0;
  }, [params.instanceCount]);

  // Initialize Windmill particles (wind-responsive turbines)
  const initWindmillParticles = useCallback(() => {
    const count = Math.min(params.instanceCount, 400);
    const particles: WindmillParticle[] = [];
    const cols = Math.ceil(Math.sqrt(count * 1.5));
    const rows = Math.ceil(count / cols);

    for (let i = 0; i < count; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      // Scatter positions with randomness
      const baseX = (col / cols) * 0.85 + 0.075 + (Math.random() - 0.5) * 0.06;
      const baseZ = (row / rows) * 0.6 + 0.2 + (Math.random() - 0.5) * 0.04;

      particles.push({
        x: baseX,
        z: baseZ,
        height: 0.08 + Math.random() * 0.05,
        bladeAngle: Math.random() * Math.PI * 2,
        bladeSpeed: 0,
        yawAngle: Math.random() * Math.PI * 2,
        targetYaw: 0,
        colorMix: Math.random(),
      });
    }
    windmillParticlesRef.current = particles;
    windAngleRef.current = 0;
    windGustRef.current = 0;
  }, [params.instanceCount]);

  // Initialize Surfer particles (wave riding)
  const initSurferParticles = useCallback(() => {
    const count = Math.min(params.instanceCount, 60);
    const particles: SurferParticle[] = [];

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * 0.8 + 0.1,
        z: Math.random() * 0.6 + 0.2,
        state: 'paddling',
        wavePhase: Math.random() * Math.PI * 2,
        armPhase: Math.random() * Math.PI * 2,
        boardTilt: 0,
        bodyLean: 0,
        speed: 0.3 + Math.random() * 0.4,
        stateTimer: Math.random() * 5,
      });
    }
    surferParticlesRef.current = particles;
    waveTimeRef.current = 0;
  }, [params.instanceCount]);

  // Initialize Flag particles (wind-responsive flags)
  const initFlagParticles = useCallback(() => {
    const count = Math.min(params.instanceCount, 150);
    const particles: FlagParticle[] = [];
    const cols = Math.ceil(Math.sqrt(count * 1.5));
    const rows = Math.ceil(count / cols);

    for (let i = 0; i < count; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      particles.push({
        x: (col / cols) * 0.8 + 0.1 + (Math.random() - 0.5) * 0.03,
        z: (row / rows) * 0.5 + 0.25 + (Math.random() - 0.5) * 0.02,
        poleHeight: 0.12 + Math.random() * 0.05,
        flagWidth: 0.04 + Math.random() * 0.02,
        flagHeight: 0.025 + Math.random() * 0.01,
        wavePhase: Math.random() * Math.PI * 2,
        waveAmplitude: 0.5 + Math.random() * 0.5,
        colorIndex: i % 5,
      });
    }
    flagParticlesRef.current = particles;
  }, [params.instanceCount]);

  // Initialize Sailboat particles (ocean swells)
  const initSailboatParticles = useCallback(() => {
    const count = Math.min(params.instanceCount, 60);
    const particles: SailboatParticle[] = [];

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * 0.8 + 0.1,
        z: Math.random() * 0.6 + 0.2,
        size: 0.6 + Math.random() * 0.6,
        rotation: (Math.random() - 0.5) * 0.3,
        sailBillow: 0.5 + Math.random() * 0.5,
        colorMix: Math.random(),
      });
    }
    sailboatParticlesRef.current = particles;
  }, [params.instanceCount]);

  // Initialize Tree particles (forest wind)
  const initTreeParticles = useCallback(() => {
    const count = Math.min(params.instanceCount, 300);
    const particles: TreeParticle[] = [];

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * 0.9 + 0.05,
        z: Math.random() * 0.7 + 0.15,
        height: 0.08 + Math.random() * 0.08,
        trunkWidth: 0.005 + Math.random() * 0.003,
        canopySize: 0.03 + Math.random() * 0.03,
        swayPhase: Math.random() * Math.PI * 2,
        swayAmount: 0.5 + Math.random() * 0.5,
        treeType: Math.random() > 0.4 ? 'deciduous' : 'pine',
      });
    }
    treeParticlesRef.current = particles;
  }, [params.instanceCount]);

  // Initialize Fish particles (schooling behavior)
  const initFishParticles = useCallback(() => {
    const count = Math.min(params.instanceCount, 800);
    const particles: FishParticle[] = [];

    for (let i = 0; i < count; i++) {
      particles.push({
        x: 0.3 + Math.random() * 0.4,
        y: 0.3 + Math.random() * 0.4,
        z: Math.random(),
        vx: (Math.random() - 0.5) * 0.01,
        vy: (Math.random() - 0.5) * 0.01,
        vz: (Math.random() - 0.5) * 0.005,
        size: 3 + Math.random() * 4,
        colorMix: Math.random(),
      });
    }
    fishParticlesRef.current = particles;
  }, [params.instanceCount]);

  // Initialize Bird particles (murmuration)
  const initBirdParticles = useCallback(() => {
    const count = Math.min(params.instanceCount, 4000);
    const particles: BirdParticle[] = [];

    for (let i = 0; i < count; i++) {
      particles.push({
        x: 0.3 + Math.random() * 0.4,
        y: 0.2 + Math.random() * 0.4,
        z: Math.random(),
        vx: (Math.random() - 0.5) * 0.005,
        vy: (Math.random() - 0.5) * 0.005,
        vz: (Math.random() - 0.5) * 0.003,
        wingPhase: Math.random() * Math.PI * 2,
      });
    }
    birdParticlesRef.current = particles;
  }, [params.instanceCount]);

  // Initialize Pendulum particles (wave patterns)
  const initPendulumParticles = useCallback(() => {
    const count = Math.min(params.instanceCount, 35);
    const particles: PendulumParticle[] = [];

    for (let i = 0; i < count; i++) {
      const lengthRatio = (i + 1) / count;
      particles.push({
        length: 0.15 + lengthRatio * 0.25, // Increasing lengths
        angle: Math.PI / 4, // Start at 45 degrees
        angularVelocity: 0,
        x: (i + 0.5) / count,
        colorMix: i / count,
      });
    }
    pendulumParticlesRef.current = particles;
    pendulumTimeRef.current = 0;
  }, [params.instanceCount]);

  // Initialize Domino particles (chain reaction)
  const initDominoParticles = useCallback(() => {
    const count = Math.min(params.instanceCount, 2500);
    const particles: DominoParticle[] = [];
    
    // Create spiral path
    const spiralTurns = 4;
    for (let i = 0; i < count; i++) {
      const progress = i / count;
      const angle = progress * Math.PI * 2 * spiralTurns;
      const radius = 0.1 + progress * 0.35;
      
      particles.push({
        x: 0.5 + Math.cos(angle) * radius,
        y: 0.5 + Math.sin(angle) * radius,
        angle: 0, // Standing
        targetAngle: 0,
        fallSpeed: 0,
        triggered: false,
        colorMix: progress,
        pathIndex: i,
      });
    }
    dominoParticlesRef.current = particles;
    dominoTriggerRef.current = 0;
  }, [params.instanceCount]);

  // Initialize Compass particles (magnetic field)
  const initCompassParticles = useCallback(() => {
    const count = Math.min(params.instanceCount, 600);
    const particles: CompassParticle[] = [];
    const cols = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / cols);

    for (let i = 0; i < count; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      particles.push({
        x: (col + 0.5) / cols,
        y: (row + 0.5) / rows,
        angle: Math.random() * Math.PI * 2,
        targetAngle: 0,
        springiness: 0.8 + Math.random() * 0.2,
      });
    }
    compassParticlesRef.current = particles;
    magnetPositionRef.current = { x: 0.5, y: 0.5, angle: 0 };
  }, [params.instanceCount]);

  const initKaleidoscopeParticles = useCallback(() => {
    const count = Math.min(params.instanceCount, 3000);
    const particles: Particle[] = [];
    const symmetry = 8;
    const particlesPerSegment = Math.floor(count / symmetry);

    for (let seg = 0; seg < symmetry; seg++) {
      const segmentAngle = (seg / symmetry) * Math.PI * 2;
      
      for (let i = 0; i < particlesPerSegment; i++) {
        const localAngle = (Math.random() - 0.5) * (Math.PI / symmetry);
        const radius = 0.05 + Math.random() * 0.4;
        const angle = segmentAngle + localAngle;
        
        particles.push({
          x: 0.5 + Math.cos(angle) * radius,
          y: 0.5 + Math.sin(angle) * radius,
          z: Math.random(),
          baseX: 0.5 + Math.cos(angle) * radius,
          baseY: 0.5 + Math.sin(angle) * radius,
          vx: 0,
          vy: 0,
          vz: 0,
          size: 4 + Math.random() * 8,
          colorMix: (seg + i) / (symmetry * particlesPerSegment),
          spoke: seg,
          ring: i,
          angleToCenter: angle,
          angle: localAngle,
          radius,
          speed: 0.5 + Math.random() * 0.5,
          phase: Math.random() * Math.PI * 2,
        });
      }
    }
    particlesRef.current = particles;
  }, [params.instanceCount]);

  const initTunnelParticles = useCallback(() => {
    const count = Math.min(params.instanceCount, 6000);
    const particles: TunnelParticle[] = [];
    const numRays = 80;
    const particlesPerRay = Math.floor(count / numRays);

    for (let ray = 0; ray < numRays; ray++) {
      const rayAngle = (ray / numRays) * Math.PI * 2;

      for (let i = 0; i < particlesPerRay; i++) {
        const rayDistance = 20 + Math.random() * 280;
        const z = Math.random();

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

    const frontBrightness = 0.6 + highlightIntensity * 0.4;
    ctx.fillStyle = `rgba(${Math.min(255, color.r * frontBrightness)}, ${Math.min(255, color.g * frontBrightness)}, ${Math.min(255, color.b * frontBrightness)}, ${alpha})`;
    ctx.fillRect(-cubeSize / 2, -cubeSize / 2, cubeSize, cubeSize);

    const topBrightness = 0.8 + highlightIntensity * 0.5;
    ctx.fillStyle = `rgba(${Math.min(255, color.r * topBrightness)}, ${Math.min(255, color.g * topBrightness)}, ${Math.min(255, color.b * topBrightness)}, ${alpha})`;
    ctx.beginPath();
    ctx.moveTo(-cubeSize / 2, -cubeSize / 2);
    ctx.lineTo(-cubeSize / 2 + depth, -cubeSize / 2 - depth);
    ctx.lineTo(cubeSize / 2 + depth, -cubeSize / 2 - depth);
    ctx.lineTo(cubeSize / 2, -cubeSize / 2);
    ctx.closePath();
    ctx.fill();

    const rightBrightness = 0.4 + highlightIntensity * 0.3;
    ctx.fillStyle = `rgba(${color.r * rightBrightness}, ${color.g * rightBrightness}, ${color.b * rightBrightness}, ${alpha})`;
    ctx.beginPath();
    ctx.moveTo(cubeSize / 2, -cubeSize / 2);
    ctx.lineTo(cubeSize / 2 + depth, -cubeSize / 2 - depth);
    ctx.lineTo(cubeSize / 2 + depth, cubeSize / 2 - depth);
    ctx.lineTo(cubeSize / 2, cubeSize / 2);
    ctx.closePath();
    ctx.fill();

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

    const coolBrightness = 0.7 + metallic * 0.5;
    ctx.fillStyle = `rgba(${Math.min(255, color1.r * coolBrightness)}, ${Math.min(255, color1.g * coolBrightness)}, ${Math.min(255, color1.b * coolBrightness)}, ${alpha})`;
    ctx.fillRect(-cubeSize / 2, -cubeSize / 2, cubeSize, cubeSize);

    const topBrightness = 0.9 + metallic * 0.4;
    ctx.fillStyle = `rgba(${Math.min(255, color1.r * topBrightness)}, ${Math.min(255, color1.g * topBrightness)}, ${Math.min(255, color1.b * topBrightness)}, ${alpha})`;
    ctx.beginPath();
    ctx.moveTo(-cubeSize / 2, -cubeSize / 2);
    ctx.lineTo(-cubeSize / 2 + depth, -cubeSize / 2 - depth);
    ctx.lineTo(cubeSize / 2 + depth, -cubeSize / 2 - depth);
    ctx.lineTo(cubeSize / 2, -cubeSize / 2);
    ctx.closePath();
    ctx.fill();

    const warmBrightness = 0.6 + metallic * 0.3;
    ctx.fillStyle = `rgba(${Math.min(255, color2.r * warmBrightness)}, ${Math.min(255, color2.g * warmBrightness)}, ${Math.min(255, color2.b * warmBrightness)}, ${alpha})`;
    ctx.beginPath();
    ctx.moveTo(cubeSize / 2, -cubeSize / 2);
    ctx.lineTo(cubeSize / 2 + depth, -cubeSize / 2 - depth);
    ctx.lineTo(cubeSize / 2 + depth, cubeSize / 2 - depth);
    ctx.lineTo(cubeSize / 2, cubeSize / 2);
    ctx.closePath();
    ctx.fill();

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

  // Draw glowing sphere for helix/orbits/constellation
  const drawGlowingSphere = useCallback((
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    color: { r: number; g: number; b: number },
    alpha: number,
    glowIntensity: number = 0.5
  ) => {
    // Glow
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, size * 2);
    gradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`);
    gradient.addColorStop(0.5, `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha * 0.3})`);
    gradient.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, size * 2, 0, Math.PI * 2);
    ctx.fill();

    // Core sphere with highlight
    const coreGradient = ctx.createRadialGradient(x - size * 0.3, y - size * 0.3, 0, x, y, size);
    coreGradient.addColorStop(0, `rgba(255, 255, 255, ${alpha * glowIntensity})`);
    coreGradient.addColorStop(0.3, `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`);
    coreGradient.addColorStop(1, `rgba(${Math.floor(color.r * 0.5)}, ${Math.floor(color.g * 0.5)}, ${Math.floor(color.b * 0.5)}, ${alpha})`);
    ctx.fillStyle = coreGradient;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }, []);

  // Bezier curve calculation for stream
  const getBezierPoint = useCallback((t: number, width: number, height: number) => {
    // S-curve through space
    const p0 = { x: -50, y: height * 0.7 };
    const p1 = { x: width * 0.3, y: height * 0.2 };
    const p2 = { x: width * 0.7, y: height * 0.8 };
    const p3 = { x: width + 50, y: height * 0.3 };

    const t2 = t * t;
    const t3 = t2 * t;
    const mt = 1 - t;
    const mt2 = mt * mt;
    const mt3 = mt2 * mt;

    return {
      x: mt3 * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t3 * p3.x,
      y: mt3 * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t3 * p3.y,
    };
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
    const arrangement = params.arrangement;

    // Clear with background
    const bgColor = hexToRgb(params.backgroundColor);
    ctx.fillStyle = `rgb(${bgColor.r}, ${bgColor.g}, ${bgColor.b})`;
    ctx.fillRect(0, 0, width, height);

    const color1 = hexToRgb(params.colorPrimary);
    const color2 = hexToRgb(params.colorSecondary);

    // ============ HELIX (DNA Double Helix) ============
    if (arrangement === 'helix') {
      const particles = helixParticlesRef.current;
      const helixRadius = Math.min(width, height) * 0.15;
      const verticalSpan = height * 0.8;
      const rotationSpeed = timeRef.current * 2;

      // Draw connecting rungs first (behind spheres)
      ctx.strokeStyle = `rgba(255, 255, 255, 0.15)`;
      ctx.lineWidth = 1;
      
      for (let i = 0; i < particles.length / 2; i++) {
        const p1 = particles[i];
        const p2 = particles[i + particles.length / 2];
        if (!p1 || !p2) continue;
        
        const y1 = centerY + (p1.y + Math.sin(timeRef.current * 0.5) * 0.1) * verticalSpan / 2;
        const angle1 = p1.angle + rotationSpeed;
        const x1 = centerX + Math.cos(angle1) * helixRadius;
        
        if (Math.abs(Math.sin(angle1)) > 0.7) {
          const angle2 = p2.angle + rotationSpeed;
          const x2 = centerX + Math.cos(angle2) * helixRadius;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y1);
          ctx.stroke();
        }
      }

      // Sort by z-depth (cos of angle)
      const sortedParticles = [...particles].sort((a, b) => 
        Math.sin(a.angle + rotationSpeed) - Math.sin(b.angle + rotationSpeed)
      );

      sortedParticles.forEach((particle) => {
        const angle = particle.angle + rotationSpeed;
        const x = centerX + Math.cos(angle) * helixRadius;
        const yOffset = Math.sin(timeRef.current * 0.5) * 20;
        const y = centerY + particle.y * verticalSpan / 2 + yOffset;
        
        const zFactor = (Math.sin(angle) + 1) / 2;
        const size = particle.size * (0.5 + zFactor * 0.5);
        const alpha = 0.4 + zFactor * 0.6;
        
        const color = particle.strand === 0 ? color1 : color2;
        drawGlowingSphere(ctx, x, y, size, color, alpha, params.metallic);
      });

      // Central glow
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, helixRadius * 0.5);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, helixRadius * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // ============ MATRIX (Digital Rain) ============
    else if (arrangement === 'matrix') {
      const particles = matrixParticlesRef.current;
      const fallSpeed = params.cameraSpeed * 0.02;

      particles.forEach((particle) => {
        // Update position
        particle.y += fallSpeed * particle.speed;
        if (particle.y > 1.1) {
          particle.y = -0.1;
          particle.brightness = 0.3 + Math.random() * 0.7;
        }

        const x = particle.x * width;
        const y = particle.y * height;
        const size = 3 + particle.brightness * 4;

        // Fade based on position (brighter at top of each "stream")
        const streamFade = 1 - (particle.y % 0.3) / 0.3;
        const alpha = particle.brightness * streamFade * 0.8;

        // Green color with brightness variation
        const brightness = particle.brightness;
        const r = Math.floor(color1.r * brightness);
        const g = Math.floor(color1.g * brightness);
        const b = Math.floor(color1.b * brightness);

        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        ctx.fillRect(x - size / 2, y - size / 2, size, size);

        // Glow effect for bright particles
        if (particle.brightness > 0.6) {
          ctx.shadowColor = `rgba(${color1.r}, ${color1.g}, ${color1.b}, 0.8)`;
          ctx.shadowBlur = 10;
          ctx.fillRect(x - size / 4, y - size / 4, size / 2, size / 2);
          ctx.shadowBlur = 0;
        }
      });
    }

    // ============ ORBITS (Atomic Orbits) ============
    else if (arrangement === 'orbits') {
      const particles = orbitParticlesRef.current;
      
      // Draw central core
      const coreSize = 30;
      const coreGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, coreSize);
      coreGradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
      coreGradient.addColorStop(0.3, `rgba(255, 255, 200, 0.9)`);
      coreGradient.addColorStop(0.6, `rgba(${color1.r}, ${color1.g}, ${color1.b}, 0.5)`);
      coreGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = coreGradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, coreSize, 0, Math.PI * 2);
      ctx.fill();

      // Sort particles by depth
      const sortedParticles = [...particles].sort((a, b) => {
        const zA = Math.sin(a.angle + timeRef.current * a.orbitSpeed) * Math.cos(a.orbitTilt);
        const zB = Math.sin(b.angle + timeRef.current * b.orbitSpeed) * Math.cos(b.orbitTilt);
        return zA - zB;
      });

      sortedParticles.forEach((particle) => {
        const angle = particle.angle + timeRef.current * particle.orbitSpeed;
        const tilt = particle.orbitTilt;
        
        // 3D rotation
        const x3d = Math.cos(angle) * particle.radius;
        const y3d = Math.sin(angle) * particle.radius * Math.cos(tilt);
        const z3d = Math.sin(angle) * Math.sin(tilt);
        
        const perspective = 500;
        const scale = perspective / (perspective + z3d * 100);
        
        const screenX = centerX + x3d * scale;
        const screenY = centerY + y3d * scale;
        const size = particle.size * scale;
        
        const depthFactor = (z3d + 1) / 2;
        const alpha = 0.3 + depthFactor * 0.7;
        
        // Gradient color based on orbit
        const colorMix = particle.orbitIndex / 6;
        const r = Math.floor(color1.r * (1 - colorMix) + color2.r * colorMix);
        const g = Math.floor(color1.g * (1 - colorMix) + color2.g * colorMix);
        const b = Math.floor(color1.b * (1 - colorMix) + color2.b * colorMix);
        
        drawGlowingSphere(ctx, screenX, screenY, size, { r, g, b }, alpha, params.metallic);
      });
    }

    // ============ VORTEX (Spiral Vortex) ============
    else if (arrangement === 'vortex') {
      const particles = vortexParticlesRef.current;
      // Removed unused rotationSpeed variable

      // Sort by radius (center last for overlap)
      const sortedParticles = [...particles].sort((a, b) => b.radius - a.radius);

      sortedParticles.forEach((particle) => {
        // Rotate faster near center
        const speedMultiplier = 1 + (1 - particle.radius / 300) * 2;
        particle.angle += 0.01 * particle.speed * speedMultiplier * params.cameraSpeed;

        const x = centerX + Math.cos(particle.angle) * particle.radius;
        const y = centerY + Math.sin(particle.angle) * particle.radius;

        // Size increases toward center
        const proximityFactor = 1 - particle.radius / 300;
        const size = 2 + proximityFactor * 10;

        // Color gradient from outer to inner
        const r = Math.floor(color2.r * (1 - proximityFactor) + color1.r * proximityFactor);
        const g = Math.floor(color2.g * (1 - proximityFactor) + color1.g * proximityFactor);
        const b = Math.floor(color2.b * (1 - proximityFactor) + color1.b * proximityFactor);

        const alpha = 0.4 + proximityFactor * 0.6;

        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();

        // Motion blur / trail
        if (proximityFactor > 0.5) {
          const trailAngle = particle.angle - 0.1 * speedMultiplier;
          const trailX = centerX + Math.cos(trailAngle) * particle.radius;
          const trailY = centerY + Math.sin(trailAngle) * particle.radius;
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha * 0.3})`;
          ctx.beginPath();
          ctx.arc(trailX, trailY, size * 0.7, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // Central vortex glow
      const vortexGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 80);
      vortexGradient.addColorStop(0, `rgba(${color1.r}, ${color1.g}, ${color1.b}, 0.8)`);
      vortexGradient.addColorStop(0.5, `rgba(${color1.r}, ${color1.g}, ${color1.b}, 0.3)`);
      vortexGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = vortexGradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 80, 0, Math.PI * 2);
      ctx.fill();
    }

    // ============ CONSTELLATION (Floating Spheres) ============
    else if (arrangement === 'constellation') {
      const particles = constellationParticlesRef.current;
      const connectionDistance = 0.12;

      // Update particle positions (slow drift)
      particles.forEach((particle) => {
        particle.x += particle.vx * params.cameraSpeed;
        particle.y += particle.vy * params.cameraSpeed;

        // Wrap around edges
        if (particle.x < 0) particle.x = 1;
        if (particle.x > 1) particle.x = 0;
        if (particle.y < 0) particle.y = 1;
        if (particle.y > 1) particle.y = 0;
      });

      // Draw connection lines first
      ctx.strokeStyle = `rgba(${color1.r}, ${color1.g}, ${color1.b}, 0.15)`;
      ctx.lineWidth = 1;

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < connectionDistance) {
            const alpha = (1 - dist / connectionDistance) * 0.3;
            ctx.strokeStyle = `rgba(${color1.r}, ${color1.g}, ${color1.b}, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(particles[i].x * width, particles[i].y * height);
            ctx.lineTo(particles[j].x * width, particles[j].y * height);
            ctx.stroke();
          }
        }
      }

      // Draw spheres
      particles.forEach((particle) => {
        const x = particle.x * width;
        const y = particle.y * height;
        const pulse = 1 + Math.sin(timeRef.current * 2 + particle.x * 10) * 0.1;
        const size = particle.size * pulse;
        const alpha = particle.brightness;

        drawGlowingSphere(ctx, x, y, size, color1, alpha, 0.8);
      });
    }

    // ============ KALEIDOSCOPE (8-fold symmetry) ============
    else if (arrangement === 'kaleidoscope') {
      const particles = particlesRef.current;
      const globalRotation = timeRef.current * 0.5;

      // Hue shift over time for rainbow effect
      const hueShift = (timeRef.current * 30) % 360;

      particles.forEach((particle) => {
        if (!particle.radius || particle.phase === undefined) return;

        // Animate radius with breathing
        const breathe = 1 + Math.sin(timeRef.current * 2 + particle.phase) * 0.1;
        const animatedRadius = particle.radius * breathe;

        // Local rotation
        const localAngle = particle.angleToCenter + globalRotation + Math.sin(timeRef.current + particle.phase) * 0.2;

        const x = centerX + Math.cos(localAngle) * animatedRadius * Math.min(width, height);
        const y = centerY + Math.sin(localAngle) * animatedRadius * Math.min(width, height);

        // Rainbow color based on angle and time
        const hue = (particle.colorMix * 360 + hueShift) % 360;
        const saturation = 80;
        const lightness = 50 + params.metallic * 20;

        // Convert HSL to RGB
        const c = (1 - Math.abs(2 * lightness / 100 - 1)) * saturation / 100;
        const hueSection = hue / 60;
        const x2 = c * (1 - Math.abs(hueSection % 2 - 1));
        const m = lightness / 100 - c / 2;
        let r = 0, g = 0, b = 0;

        if (hueSection < 1) { r = c; g = x2; }
        else if (hueSection < 2) { r = x2; g = c; }
        else if (hueSection < 3) { g = c; b = x2; }
        else if (hueSection < 4) { g = x2; b = c; }
        else if (hueSection < 5) { r = x2; b = c; }
        else { r = c; b = x2; }

        const rgb = {
          r: Math.floor((r + m) * 255),
          g: Math.floor((g + m) * 255),
          b: Math.floor((b + m) * 255),
        };

        const size = particle.size * breathe;
        const alpha = 0.6 + particle.z * 0.4;

        if (params.shape === 'sphere') {
          drawGlowingSphere(ctx, x, y, size, rgb, alpha, params.metallic);
        } else {
          draw3DCube(ctx, x, y, size, localAngle, rgb, params.metallic, globalRotation, alpha);
        }
      });
    }

    // ============ STREAM (Particle River) ============
    else if (arrangement === 'stream') {
      const particles = streamParticlesRef.current;
      const flowSpeed = params.cameraSpeed * 0.008;

      particles.forEach((particle) => {
        // Move along curve
        particle.t += flowSpeed * particle.speed;
        if (particle.t > 1) {
          particle.t = 0;
          particle.offset = (Math.random() - 0.5) * 0.15;
        }

        const point = getBezierPoint(particle.t, width, height);
        
        // Add perpendicular offset and turbulence
        const tangentT = Math.min(particle.t + 0.01, 1);
        const tangentPoint = getBezierPoint(tangentT, width, height);
        const dx = tangentPoint.x - point.x;
        const dy = tangentPoint.y - point.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        const perpX = -dy / len;
        const perpY = dx / len;

        const turbulence = Math.sin(timeRef.current * 3 + particle.t * 20) * 10;
        const x = point.x + perpX * (particle.offset * width + turbulence);
        const y = point.y + perpY * (particle.offset * width + turbulence);

        // Color gradient along stream
        const colorMix = particle.t;
        const r = Math.floor(color1.r * (1 - colorMix) + color2.r * colorMix);
        const g = Math.floor(color1.g * (1 - colorMix) + color2.g * colorMix);
        const b = Math.floor(color1.b * (1 - colorMix) + color2.b * colorMix);

        // Faster in center of stream
        const centerFactor = 1 - Math.abs(particle.offset) * 6;
        const size = particle.size * (0.5 + centerFactor * 0.5);
        const alpha = 0.4 + centerFactor * 0.4;

        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // ============ EXPLOSION (Big Bang) ============
    else if (arrangement === 'explosion') {
      const particles = explosionParticlesRef.current;
      const cycleSpeed = params.cameraSpeed * 0.5;
      const cycleDuration = 4; // seconds for full cycle

      // Update explosion phase
      const cycleTime = (timeRef.current * cycleSpeed) % cycleDuration;
      const expanding = cycleTime < cycleDuration * 0.45;
      const paused = cycleTime < cycleDuration * 0.55 && !expanding;
      const contracting = !expanding && !paused;

      particles.forEach((particle) => {
        if (expanding) {
          // Ease out expansion
          const progress = cycleTime / (cycleDuration * 0.45);
          const easeOut = 1 - Math.pow(1 - progress, 3);
          particle.distance = particle.maxDistance * easeOut;
        } else if (contracting) {
          // Ease in contraction
          const contractTime = cycleTime - cycleDuration * 0.55;
          const contractDuration = cycleDuration * 0.45;
          const progress = contractTime / contractDuration;
          const easeIn = Math.pow(progress, 2);
          particle.distance = particle.maxDistance * (1 - easeIn);
        }

        const x = centerX + Math.cos(particle.angle) * particle.distance;
        const y = centerY + Math.sin(particle.angle) * particle.distance;

        // Color based on distance (white hot -> orange -> red)
        const distanceRatio = particle.distance / particle.maxDistance;
        let r, g, b;
        
        if (distanceRatio < 0.3) {
          // White hot core
          r = 255;
          g = 255;
          b = 200 + (1 - distanceRatio / 0.3) * 55;
        } else if (distanceRatio < 0.6) {
          // Orange/gold
          const t = (distanceRatio - 0.3) / 0.3;
          r = 255;
          g = Math.floor(255 - t * 100);
          b = Math.floor(200 - t * 200);
        } else {
          // Red embers
          const t = (distanceRatio - 0.6) / 0.4;
          r = Math.floor(255 - t * 116);
          g = Math.floor(155 - t * 155);
          b = 0;
        }

        const size = particle.size * (1 + (1 - distanceRatio) * 0.5);
        const alpha = 0.5 + (1 - distanceRatio) * 0.5;

        // Motion blur for fast-moving particles
        if (!paused && distanceRatio > 0.2) {
          const blurAngle = expanding ? particle.angle + Math.PI : particle.angle;
          const blurDist = particle.distance - (expanding ? 15 : -15);
          const blurX = centerX + Math.cos(blurAngle) * Math.abs(blurDist);
          const blurY = centerY + Math.sin(blurAngle) * Math.abs(blurDist);
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha * 0.3})`;
          ctx.beginPath();
          ctx.arc(blurX, blurY, size * 0.6, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      });

      // Central bright core
      const coreIntensity = 1 - Math.min(1, (particles[0]?.distance || 0) / 50);
      if (coreIntensity > 0) {
        const coreGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 50);
        coreGradient.addColorStop(0, `rgba(255, 255, 255, ${coreIntensity})`);
        coreGradient.addColorStop(0.3, `rgba(255, 200, 100, ${coreIntensity * 0.7})`);
        coreGradient.addColorStop(1, 'rgba(255, 100, 0, 0)');
        ctx.fillStyle = coreGradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, 50, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // ============ TUNNEL ============
    else if (arrangement === 'tunnel') {
      const fov = 400;
      const forwardSpeed = params.cameraSpeed * 0.015;

      const particles = tunnelParticlesRef.current;
      const sortedParticles = [...particles].sort((a, b) => b.z - a.z);

      sortedParticles.forEach((particle) => {
        particle.z -= forwardSpeed;

        if (particle.z <= 0) {
          particle.z = 1;
          particle.rayDistance = 20 + Math.random() * 280;
        }

        const scale = fov / (fov + particle.z * 800);
        const bobAmount = Math.sin(timeRef.current * particle.bobSpeed + particle.bobOffset) * 3;

        const screenX = centerX + (Math.cos(particle.rayAngle) * particle.rayDistance * scale) + bobAmount * 0.3;
        const screenY = centerY + (Math.sin(particle.rayAngle) * particle.rayDistance * scale) + bobAmount * 0.3;

        const baseSize = 4 + (1 - particle.z) * 12;
        const size = baseSize * scale;

        const depthFactor = 1 - particle.z;
        const alpha = 0.15 + depthFactor * 0.75;

        if (size < 0.5 || screenX < -20 || screenX > width + 20 || screenY < -20 || screenY > height + 20) return;

        const useSecondary = particle.colorMix > 0.5;
        const primaryColor = useSecondary ? color2 : color1;
        const secondaryColor = useSecondary ? color1 : color2;

        drawTunnelCube(ctx, screenX, screenY, size, primaryColor, secondaryColor, params.metallic, alpha, depthFactor);
      });

      const glowRadius = Math.min(width, height) * 0.08;
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, glowRadius);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
      gradient.addColorStop(0.3, `rgba(${color1.r}, ${color1.g}, ${color1.b}, 0.3)`);
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, glowRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    // ============ SUNFLOWERS (Heliotropism) ============
    else if (arrangement === 'sunflowers') {
      const particles = sunflowerParticlesRef.current;
      
      // Update sun position (moves horizontally across sky)
      sunAngleRef.current += params.cameraSpeed * 0.025;
      if (sunAngleRef.current > Math.PI * 2) {
        sunAngleRef.current = 0;
      }
      const sunAngle = sunAngleRef.current;
      
      // Sun position in screen space (moves horizontally left to right)
      const sunX = width * 0.1 + (sunAngle / (Math.PI * 2)) * width * 0.8;
      const sunY = height * 0.2; // Fixed height
      
      // Sky gradient based on sun position
      const sunProgress = sunAngle / Math.PI; // 0 to 1
      const isNearHorizon = sunProgress < 0.15 || sunProgress > 0.85;
      
      // Draw sky gradient
      const skyGradient = ctx.createLinearGradient(0, 0, 0, height * 0.7);
      if (isNearHorizon) {
        skyGradient.addColorStop(0, '#1E3A5F');
        skyGradient.addColorStop(0.5, '#FF8C00');
        skyGradient.addColorStop(1, '#FF6B35');
      } else {
        skyGradient.addColorStop(0, '#1E3A5F');
        skyGradient.addColorStop(0.5, '#4A90B8');
        skyGradient.addColorStop(1, '#87CEEB');
      }
      ctx.fillStyle = skyGradient;
      ctx.fillRect(0, 0, width, height * 0.7);
      
      // Draw ground
      const groundGradient = ctx.createLinearGradient(0, height * 0.65, 0, height);
      groundGradient.addColorStop(0, '#3D5A1F');
      groundGradient.addColorStop(1, '#2A4015');
      ctx.fillStyle = groundGradient;
      ctx.fillRect(0, height * 0.65, width, height * 0.35);
      
      // Draw sun with glow
      const sunRadius = 40;
      const sunColor = isNearHorizon ? '#FF6B35' : '#FFD700';
      const sunGlow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunRadius * 3);
      sunGlow.addColorStop(0, sunColor);
      sunGlow.addColorStop(0.3, `${sunColor}88`);
      sunGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = sunGlow;
      ctx.beginPath();
      ctx.arc(sunX, sunY, sunRadius * 3, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = sunColor;
      ctx.beginPath();
      ctx.arc(sunX, sunY, sunRadius, 0, Math.PI * 2);
      ctx.fill();
      
      // Sort sunflowers by z for proper depth rendering
      const sortedFlowers = [...particles].sort((a, b) => a.z - b.z);
      
      // Draw each sunflower
      sortedFlowers.forEach((flower) => {
        // Calculate screen position with perspective
        const perspective = 0.3 + flower.z * 0.7;
        const screenX = flower.x * width;
        const screenY = height * 0.65 + flower.z * height * 0.3;
        const scale = flower.scale * perspective;
        
        // Calculate direction from flower to sun
        const dx = sunX - screenX;
        const dy = sunY - screenY;
        const targetRotY = Math.atan2(dx, 50) * 1.5; // More pronounced rotation
        const dist = Math.sqrt(dx * dx + dy * dy);
        const targetRotX = Math.atan2(-dy, dist) * 0.3;
        
        // Smooth lerp toward target rotation
        const lerpSpeed = 0.08;
        flower.headRotationY += (targetRotY - flower.headRotationY) * lerpSpeed;
        flower.headRotationX += (targetRotX - flower.headRotationX) * lerpSpeed;
        
        // Add wind sway
        const sway = Math.sin(timeRef.current * flower.swaySpeed + flower.swayOffset) * 0.03;
        
        const stemHeight = flower.stemHeight * height * scale;
        const stemBottom = screenY;
        const stemTop = screenY - stemHeight;
        const headSize = 20 * scale;
        
        // Draw stem with curve
        ctx.strokeStyle = '#228B22';
        ctx.lineWidth = 4 * scale;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(screenX, stemBottom);
        const curveX = screenX + flower.stemCurve * 50 * scale + sway * 30;
        ctx.quadraticCurveTo(curveX, stemBottom - stemHeight * 0.5, screenX + flower.headRotationY * 30 * scale, stemTop);
        ctx.stroke();
        
        // Draw leaves
        const leafPositions = [0.3, 0.5, 0.7];
        ctx.fillStyle = '#32CD32';
        leafPositions.forEach((pos, idx) => {
          const leafY = stemBottom - stemHeight * pos;
          const leafX = screenX + (idx % 2 === 0 ? -1 : 1) * 15 * scale;
          ctx.beginPath();
          ctx.ellipse(leafX, leafY, 12 * scale, 6 * scale, (idx % 2 === 0 ? -0.5 : 0.5), 0, Math.PI * 2);
          ctx.fill();
        });
        
        // Draw flower head (tilted based on sun tracking)
        const headX = screenX + flower.headRotationY * 35 * scale;
        const headY = stemTop + flower.headRotationX * 10 * scale;
        
        // Petals
        const petalColor = hexToRgb(params.colorPrimary);
        for (let p = 0; p < flower.petalCount; p++) {
          const petalAngle = (p / flower.petalCount) * Math.PI * 2;
          const petalX = headX + Math.cos(petalAngle) * headSize * 1.3;
          const petalY = headY + Math.sin(petalAngle) * headSize * 0.8 * (1 - Math.abs(flower.headRotationX) * 0.3);
          
          ctx.fillStyle = `rgb(${petalColor.r}, ${petalColor.g}, ${petalColor.b})`;
          ctx.beginPath();
          ctx.ellipse(petalX, petalY, headSize * 0.5, headSize * 0.2, petalAngle, 0, Math.PI * 2);
          ctx.fill();
        }
        
        // Center disc
        const centerColor = hexToRgb(params.colorSecondary);
        ctx.fillStyle = `rgb(${centerColor.r}, ${centerColor.g}, ${centerColor.b})`;
        ctx.beginPath();
        ctx.arc(headX, headY, headSize * 0.7, 0, Math.PI * 2);
        ctx.fill();
        
        // Texture on center
        ctx.fillStyle = `rgba(0, 0, 0, 0.2)`;
        for (let t = 0; t < 8; t++) {
          const texAngle = (t / 8) * Math.PI * 2;
          const texX = headX + Math.cos(texAngle) * headSize * 0.35;
          const texY = headY + Math.sin(texAngle) * headSize * 0.35;
          ctx.beginPath();
          ctx.arc(texX, texY, 2 * scale, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }

    // ============ SOLAR PANEL (Radial sun-tracking array) ============
    else if (arrangement === 'solarpanel') {
      const particles = solarPanelParticlesRef.current;
      
      // Update light source position (orbits around the center)
      lightAngleRef.current += params.cameraSpeed * 0.03;
      if (lightAngleRef.current > Math.PI * 2) {
        lightAngleRef.current = 0;
      }
      const lightAngle = lightAngleRef.current;
      
      // Light position relative to center (orbits horizontally)
      const lightOrbitRadius = Math.min(width, height) * 0.4;
      const lightX = centerX + Math.cos(lightAngle) * lightOrbitRadius;
      const lightY = centerY * 0.3; // Keep light source elevated
      
      // Draw central glowing light source
      const primaryRgb = hexToRgb(params.colorPrimary);
      const lightRadius = 25;
      const lightGlow = ctx.createRadialGradient(lightX, lightY, 0, lightX, lightY, lightRadius * 4);
      lightGlow.addColorStop(0, 'rgba(255, 255, 255, 1)');
      lightGlow.addColorStop(0.2, `rgba(255, 248, 231, 0.8)`);
      lightGlow.addColorStop(0.5, `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, 0.3)`);
      lightGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = lightGlow;
      ctx.beginPath();
      ctx.arc(lightX, lightY, lightRadius * 4, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = '#FFF8E7';
      ctx.beginPath();
      ctx.arc(lightX, lightY, lightRadius, 0, Math.PI * 2);
      ctx.fill();
      
      // Sort panels by depth for proper rendering (back to front)
      const sortedPanels = [...particles].sort((a, b) => a.depth - b.depth);
      
      // Draw each solar panel
      sortedPanels.forEach((panel) => {
        // Calculate panel position from center
        const screenRadius = Math.min(width, height) * 0.4 * panel.distance;
        const panelX = centerX + Math.cos(panel.angle + timeRef.current * 0.1) * screenRadius;
        const panelY = centerY + Math.sin(panel.angle + timeRef.current * 0.1) * screenRadius;
        
        // Calculate direction from panel to light for tilt tracking
        const dx = lightX - panelX;
        const dy = lightY - panelY;
        const distToLight = Math.sqrt(dx * dx + dy * dy);
        
        // Target tilt to face the light source
        const targetTiltY = Math.atan2(dx, distToLight) * 1.2; // Horizontal rotation
        const targetTiltX = Math.atan2(-dy, distToLight) * 0.8; // Vertical tilt
        
        // Smooth lerp toward target - wave effect based on distance from center
        const lerpSpeed = 0.06;
        const waveDelay = panel.distance * 0.3; // Ripple effect
        const delayedTargetY = targetTiltY * Math.cos(waveDelay * Math.PI);
        const delayedTargetX = targetTiltX * Math.cos(waveDelay * Math.PI);
        
        panel.tiltX += (delayedTargetX - panel.tiltX) * lerpSpeed;
        panel.tiltY += (delayedTargetY - panel.tiltY) * lerpSpeed;
        
        // Panel size based on perspective (closer to camera = larger)
        const basePanelWidth = 20 * panel.scale;
        const basePanelHeight = 14 * panel.scale;
        const perspective = 0.6 + panel.depth * 0.4;
        const panelWidth = basePanelWidth * perspective;
        const panelHeight = basePanelHeight * perspective;
        
        // Calculate light angle for reflection
        const lightReflectAngle = Math.atan2(dy, dx);
        const facingLight = Math.cos(panel.tiltY - lightReflectAngle);
        const reflectionIntensity = Math.max(0, facingLight) * params.metallic;
        
        // Choose color based on light angle (warm when facing, cool when angled away)
        const warmColor = color2; // Bronze/copper tone
        const coolColor = color1; // Steel blue tone
        
        // Blend colors based on reflection
        const blendFactor = reflectionIntensity;
        const panelColor = {
          r: Math.round(coolColor.r + (warmColor.r - coolColor.r) * blendFactor),
          g: Math.round(coolColor.g + (warmColor.g - coolColor.g) * blendFactor),
          b: Math.round(coolColor.b + (warmColor.b - coolColor.b) * blendFactor),
        };
        
        // Apply tilt to panel shape (foreshortening effect)
        const tiltFactor = Math.cos(panel.tiltX);
        const displayHeight = panelHeight * Math.max(0.2, Math.abs(tiltFactor));
        
        ctx.save();
        ctx.translate(panelX, panelY);
        ctx.rotate(panel.tiltY * 0.5);
        
        // Draw panel with 3D metallic effect
        const brightness = 0.5 + reflectionIntensity * 0.5;
        
        // Panel main face
        const topBrightness = brightness * 1.2;
        ctx.fillStyle = `rgba(${Math.min(255, panelColor.r * topBrightness)}, ${Math.min(255, panelColor.g * topBrightness)}, ${Math.min(255, panelColor.b * topBrightness)}, ${0.7 + panel.depth * 0.3})`;
        ctx.fillRect(-panelWidth / 2, -displayHeight / 2, panelWidth, displayHeight);
        
        // Specular highlight when facing light
        if (reflectionIntensity > 0.5) {
          const highlightGradient = ctx.createLinearGradient(-panelWidth / 2, -displayHeight / 2, panelWidth / 2, displayHeight / 2);
          highlightGradient.addColorStop(0, `rgba(255, 255, 255, ${reflectionIntensity * 0.6})`);
          highlightGradient.addColorStop(0.5, `rgba(255, 255, 255, ${reflectionIntensity * 0.2})`);
          highlightGradient.addColorStop(1, 'transparent');
          ctx.fillStyle = highlightGradient;
          ctx.fillRect(-panelWidth / 2, -displayHeight / 2, panelWidth, displayHeight);
        }
        
        // Panel edge (3D depth)
        const edgeThickness = 3 * panel.scale;
        const edgeBrightness = brightness * 0.6;
        ctx.fillStyle = `rgba(${panelColor.r * edgeBrightness}, ${panelColor.g * edgeBrightness}, ${panelColor.b * edgeBrightness}, ${0.8 + panel.depth * 0.2})`;
        
        // Right edge
        ctx.beginPath();
        ctx.moveTo(panelWidth / 2, -displayHeight / 2);
        ctx.lineTo(panelWidth / 2 + edgeThickness, -displayHeight / 2 - edgeThickness);
        ctx.lineTo(panelWidth / 2 + edgeThickness, displayHeight / 2 - edgeThickness);
        ctx.lineTo(panelWidth / 2, displayHeight / 2);
        ctx.closePath();
        ctx.fill();
        
        // Top edge (brighter)
        ctx.fillStyle = `rgba(${Math.min(255, panelColor.r * brightness * 1.3)}, ${Math.min(255, panelColor.g * brightness * 1.3)}, ${Math.min(255, panelColor.b * brightness * 1.3)}, ${0.8 + panel.depth * 0.2})`;
        ctx.beginPath();
        ctx.moveTo(-panelWidth / 2, -displayHeight / 2);
        ctx.lineTo(-panelWidth / 2 + edgeThickness, -displayHeight / 2 - edgeThickness);
        ctx.lineTo(panelWidth / 2 + edgeThickness, -displayHeight / 2 - edgeThickness);
        ctx.lineTo(panelWidth / 2, -displayHeight / 2);
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
      });
      
      // Draw central vanishing point glow
      const coreGlow = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 60);
      coreGlow.addColorStop(0, `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, 0.4)`);
      coreGlow.addColorStop(0.5, `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, 0.1)`);
      coreGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = coreGlow;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 60, 0, Math.PI * 2);
      ctx.fill();
    }

    // ============ WINDMILL (Wind Farm) ============
    else if (arrangement === 'windmill') {
      const particles = windmillParticlesRef.current;
      
      // Update wind direction slowly
      windAngleRef.current += 0.002 * params.cameraSpeed;
      windGustRef.current += 0.015 * params.cameraSpeed;
      
      const windDir = windAngleRef.current;
      const gustPhase = windGustRef.current;

      // Golden hour sky gradient
      const skyGradient = ctx.createLinearGradient(0, 0, 0, height);
      skyGradient.addColorStop(0, '#1a2a4a');
      skyGradient.addColorStop(0.4, '#2a3a5a');
      skyGradient.addColorStop(0.7, '#4a3a3a');
      skyGradient.addColorStop(1, '#6a4a3a');
      ctx.fillStyle = skyGradient;
      ctx.fillRect(0, 0, width, height);

      // Ground plane
      const groundY = height * 0.7;
      const groundGradient = ctx.createLinearGradient(0, groundY, 0, height);
      groundGradient.addColorStop(0, '#3a4a2a');
      groundGradient.addColorStop(1, '#2a3a1a');
      ctx.fillStyle = groundGradient;
      ctx.fillRect(0, groundY, width, height - groundY);

      // Calculate wind intensity at each position (gust waves)
      const getWindIntensity = (x: number, z: number) => {
        const gustFreq = 3;
        const gustSpeed = gustPhase;
        const gust = Math.sin((x - gustSpeed) * gustFreq) * 0.5 + 0.5;
        const variance = Math.sin(z * 5 + gustSpeed * 0.3) * 0.2;
        return Math.max(0.15, Math.min(1, gust + variance));
      };

      // Sort by depth (further first)
      const sortedWindmills = [...particles].sort((a, b) => a.z - b.z);

      sortedWindmills.forEach((windmill) => {
        // Calculate local wind
        const localWind = getWindIntensity(windmill.x, windmill.z);
        
        // Update blade speed based on wind
        const targetSpeed = localWind * 0.15 * params.cameraSpeed;
        windmill.bladeSpeed += (targetSpeed - windmill.bladeSpeed) * 0.05;
        windmill.bladeAngle += windmill.bladeSpeed;

        // Yaw to face wind
        windmill.targetYaw = windDir + Math.PI;
        windmill.yawAngle += (windmill.targetYaw - windmill.yawAngle) * 0.02;

        // Screen position
        const perspective = 400;
        const pz = windmill.z * 300;
        const scale = perspective / (perspective + pz);
        const screenX = (windmill.x - 0.5) * width * 1.2 * scale + centerX;
        const baseY = groundY - 20 * scale;
        const towerHeight = windmill.height * height * scale;
        const hubY = baseY - towerHeight;

        // Draw tower shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.beginPath();
        ctx.ellipse(screenX + towerHeight * 0.3, baseY + 5, 8 * scale, 3 * scale, 0, 0, Math.PI * 2);
        ctx.fill();

        // Draw tower
        const towerWidth = 6 * scale;
        const towerTopWidth = 3 * scale;
        ctx.fillStyle = `rgba(${color1.r}, ${color1.g}, ${color1.b}, 0.9)`;
        ctx.beginPath();
        ctx.moveTo(screenX - towerWidth, baseY);
        ctx.lineTo(screenX + towerWidth, baseY);
        ctx.lineTo(screenX + towerTopWidth, hubY);
        ctx.lineTo(screenX - towerTopWidth, hubY);
        ctx.closePath();
        ctx.fill();

        // Tower highlight
        ctx.fillStyle = `rgba(255, 255, 255, ${params.metallic * 0.3})`;
        ctx.beginPath();
        ctx.moveTo(screenX - towerTopWidth * 0.5, hubY);
        ctx.lineTo(screenX - towerWidth * 0.5, baseY);
        ctx.lineTo(screenX - towerWidth * 0.3, baseY);
        ctx.lineTo(screenX - towerTopWidth * 0.3, hubY);
        ctx.closePath();
        ctx.fill();

        // Draw hub
        const hubSize = 8 * scale;
        ctx.fillStyle = `rgba(${color2.r}, ${color2.g}, ${color2.b}, 1)`;
        ctx.beginPath();
        ctx.arc(screenX, hubY, hubSize, 0, Math.PI * 2);
        ctx.fill();

        // Draw 3 blades
        const bladeLength = 40 * scale;
        const bladeWidth = 4 * scale;
        
        for (let i = 0; i < 3; i++) {
          const bladeAngle = windmill.bladeAngle + (i * Math.PI * 2) / 3 + windmill.yawAngle * 0.3;
          
          ctx.save();
          ctx.translate(screenX, hubY);
          ctx.rotate(bladeAngle);
          
          // Blade body
          const bladeFacing = Math.abs(Math.sin(bladeAngle));
          const brightness = 0.6 + bladeFacing * 0.4 * params.metallic;
          ctx.fillStyle = `rgba(${Math.min(255, color2.r * brightness)}, ${Math.min(255, color2.g * brightness)}, ${Math.min(255, color2.b * brightness)}, 0.95)`;
          
          ctx.beginPath();
          ctx.moveTo(0, -hubSize * 0.5);
          ctx.lineTo(bladeWidth, -bladeLength);
          ctx.lineTo(-bladeWidth * 0.5, -bladeLength);
          ctx.closePath();
          ctx.fill();

          // Blade highlight (glint)
          if (localWind > 0.6 && bladeFacing > 0.7) {
            ctx.fillStyle = `rgba(255, 255, 255, ${params.metallic * 0.5})`;
            ctx.beginPath();
            ctx.moveTo(0, -hubSize);
            ctx.lineTo(bladeWidth * 0.3, -bladeLength * 0.8);
            ctx.lineTo(-bladeWidth * 0.2, -bladeLength * 0.8);
            ctx.closePath();
            ctx.fill();
          }

          ctx.restore();
        }
      });
    }

    // ============ SURFERS (Ocean Wave Riding) ============
    else if (arrangement === 'surfers') {
      const particles = surferParticlesRef.current;
      waveTimeRef.current += 0.025 * params.cameraSpeed;
      const waveTime = waveTimeRef.current;

      // Wave calculation functions
      const getWaveHeight = (x: number, t: number) => {
        const wave1 = Math.sin(x * 8 + t * 1.5) * 25;
        const wave2 = Math.sin(x * 4 + t * 0.8) * 40;
        const wave3 = Math.sin(x * 12 + t * 2.2) * 12;
        return wave1 + wave2 + wave3;
      };

      const getWaveSlope = (x: number, t: number) => {
        const slope1 = Math.cos(x * 8 + t * 1.5) * 8 * 25;
        const slope2 = Math.cos(x * 4 + t * 0.8) * 4 * 40;
        const slope3 = Math.cos(x * 12 + t * 2.2) * 12 * 12;
        return (slope1 + slope2 + slope3) * 0.01;
      };

      // Sky gradient (sunset)
      const skyGradient = ctx.createLinearGradient(0, 0, 0, height * 0.5);
      const bgColor = hexToRgb(params.backgroundColor);
      skyGradient.addColorStop(0, `rgb(${bgColor.r * 0.6}, ${bgColor.g * 0.5}, ${bgColor.b * 0.8})`);
      skyGradient.addColorStop(0.5, `rgb(${bgColor.r}, ${bgColor.g * 0.7}, ${bgColor.b * 0.5})`);
      skyGradient.addColorStop(1, `rgb(${bgColor.r}, ${bgColor.g}, ${bgColor.b})`);
      ctx.fillStyle = skyGradient;
      ctx.fillRect(0, 0, width, height * 0.5);

      // Draw ocean waves
      const oceanTop = height * 0.35;
      for (let row = 0; row < 40; row++) {
        const rowZ = row / 40;
        const rowY = oceanTop + row * (height * 0.65 / 40);
        const waveOffset = getWaveHeight(rowZ, waveTime);
        
        // Wave color gradient (deep to light)
        const depthMix = row / 40;
        const r = Math.floor(color1.r * (1 - depthMix) + color2.r * depthMix);
        const g = Math.floor(color1.g * (1 - depthMix) + color2.g * depthMix);
        const b = Math.floor(color1.b * (1 - depthMix) + color2.b * depthMix);
        
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.8)`;
        ctx.lineWidth = 3 - depthMix * 2;
        
        ctx.beginPath();
        ctx.moveTo(0, rowY + waveOffset * (1 - depthMix * 0.5));
        
        for (let x = 0; x <= width; x += 10) {
          const localHeight = getWaveHeight(x / width + rowZ * 0.5, waveTime);
          ctx.lineTo(x, rowY + localHeight * (1 - depthMix * 0.5) * 0.5);
        }
        ctx.stroke();

        // Foam on wave peaks
        if (row < 15) {
          for (let x = 0; x < width; x += 30) {
            const localHeight = getWaveHeight(x / width + rowZ * 0.5, waveTime);
            if (localHeight > 30) {
              ctx.fillStyle = `rgba(255, 255, 255, ${0.6 - depthMix})`;
              ctx.beginPath();
              ctx.ellipse(x + Math.random() * 20, rowY + localHeight * 0.3, 8 - depthMix * 6, 3, 0, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
      }

      // Update and draw surfers
      const sortedSurfers = [...particles].sort((a, b) => a.z - b.z);

      sortedSurfers.forEach((surfer) => {
        // Update state timer
        surfer.stateTimer += 0.016 * params.cameraSpeed;
        surfer.armPhase += 0.1 * params.cameraSpeed;

        // State machine
        const localWaveHeight = getWaveHeight(surfer.x, waveTime);
        const localSlope = getWaveSlope(surfer.x, waveTime);

        if (surfer.state === 'paddling') {
          // Move slowly, wait for wave
          surfer.x += 0.001 * params.cameraSpeed;
          if (localWaveHeight > 35 && surfer.stateTimer > 2) {
            surfer.state = 'riding';
            surfer.stateTimer = 0;
          }
        } else if (surfer.state === 'riding') {
          // Ride the wave
          surfer.x -= 0.003 * params.cameraSpeed * (1 + Math.abs(localSlope));
          surfer.boardTilt = localSlope * 0.8;
          surfer.bodyLean = Math.sin(waveTime * 2) * 0.2;
          
          if (localWaveHeight < 10 || surfer.stateTimer > 8 || surfer.x < 0.05) {
            surfer.state = 'returning';
            surfer.stateTimer = 0;
          }
        } else if (surfer.state === 'returning') {
          // Paddle back out
          surfer.x += 0.002 * params.cameraSpeed;
          surfer.boardTilt *= 0.95;
          surfer.bodyLean *= 0.95;
          
          if (surfer.x > 0.9 || surfer.stateTimer > 6) {
            surfer.state = 'paddling';
            surfer.stateTimer = 0;
            surfer.x = 0.3 + Math.random() * 0.4;
          }
        }

        // Keep in bounds
        surfer.x = Math.max(0.05, Math.min(0.95, surfer.x));

        // Calculate screen position
        const perspective = 500;
        const pz = surfer.z * 400;
        const scale = perspective / (perspective + pz);
        const screenX = surfer.x * width;
        const baseWaveY = oceanTop + surfer.z * (height * 0.5);
        const screenY = baseWaveY + localWaveHeight * (1 - surfer.z * 0.5) * 0.4;

        ctx.save();
        ctx.translate(screenX, screenY);
        ctx.rotate(surfer.boardTilt);
        ctx.scale(scale, scale);

        // Draw surfboard
        const boardLength = 35;
        const boardWidth = 8;
        ctx.fillStyle = `rgba(${color2.r}, ${color2.g}, ${color2.b}, 0.9)`;
        ctx.beginPath();
        ctx.ellipse(0, 0, boardLength, boardWidth, 0, 0, Math.PI * 2);
        ctx.fill();

        // Board highlight
        ctx.fillStyle = `rgba(255, 255, 255, ${params.metallic * 0.4})`;
        ctx.beginPath();
        ctx.ellipse(-5, -2, boardLength * 0.6, boardWidth * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Draw surfer based on state
        if (surfer.state === 'riding') {
          // Standing pose
          ctx.save();
          ctx.rotate(surfer.bodyLean);
          
          // Body
          ctx.fillStyle = `rgba(${color1.r}, ${color1.g}, ${color1.b}, 1)`;
          ctx.beginPath();
          ctx.ellipse(0, -25, 8, 15, 0, 0, Math.PI * 2);
          ctx.fill();
          
          // Head
          ctx.beginPath();
          ctx.arc(0, -45, 8, 0, Math.PI * 2);
          ctx.fill();
          
          // Arms out for balance
          ctx.strokeStyle = `rgba(${color1.r}, ${color1.g}, ${color1.b}, 1)`;
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(-8, -30);
          ctx.lineTo(-25, -20 + Math.sin(waveTime * 3) * 5);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(8, -30);
          ctx.lineTo(25, -25 + Math.sin(waveTime * 3 + 1) * 5);
          ctx.stroke();
          
          // Legs
          ctx.beginPath();
          ctx.moveTo(-3, -12);
          ctx.lineTo(-8, 0);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(3, -12);
          ctx.lineTo(8, 0);
          ctx.stroke();
          
          ctx.restore();
        } else {
          // Paddling/prone pose
          ctx.fillStyle = `rgba(${color1.r}, ${color1.g}, ${color1.b}, 1)`;
          
          // Body lying down
          ctx.beginPath();
          ctx.ellipse(0, -8, 18, 6, 0, 0, Math.PI * 2);
          ctx.fill();
          
          // Head
          ctx.beginPath();
          ctx.arc(20, -10, 6, 0, Math.PI * 2);
          ctx.fill();
          
          // Paddling arms
          const armOffset = Math.sin(surfer.armPhase) * 10;
          ctx.strokeStyle = `rgba(${color1.r}, ${color1.g}, ${color1.b}, 1)`;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(5, -8);
          ctx.lineTo(5 + armOffset, -8 + Math.abs(armOffset) * 0.5);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(-5, -8);
          ctx.lineTo(-5 - armOffset, -8 + Math.abs(armOffset) * 0.5);
          ctx.stroke();
        }

        ctx.restore();
      });

      // Sun reflection on water
      const sunX = width * 0.7;
      const sunY = height * 0.15;
      const reflectionGradient = ctx.createRadialGradient(sunX, sunY + height * 0.4, 0, sunX, sunY + height * 0.4, 150);
      reflectionGradient.addColorStop(0, 'rgba(255, 200, 100, 0.3)');
      reflectionGradient.addColorStop(0.5, 'rgba(255, 150, 50, 0.1)');
      reflectionGradient.addColorStop(1, 'rgba(255, 100, 0, 0)');
      ctx.fillStyle = reflectionGradient;
      ctx.fillRect(sunX - 150, height * 0.35, 300, height * 0.65);
    }

    // ============ FLAGS IN WIND ============
    else if (arrangement === 'flags') {
      const particles = flagParticlesRef.current;
      windAngleRef.current += 0.008 * params.cameraSpeed;
      windGustRef.current += 0.03 * params.cameraSpeed;
      const gustWave = windGustRef.current;

      // Sky gradient
      const skyGradient = ctx.createLinearGradient(0, 0, 0, height);
      const bgColor = hexToRgb(params.backgroundColor);
      skyGradient.addColorStop(0, `rgb(${bgColor.r * 0.7}, ${bgColor.g * 0.8}, ${bgColor.b})`);
      skyGradient.addColorStop(1, `rgb(${bgColor.r}, ${bgColor.g}, ${bgColor.b})`);
      ctx.fillStyle = skyGradient;
      ctx.fillRect(0, 0, width, height);

      // Ground
      const groundY = height * 0.85;
      ctx.fillStyle = '#4a5d23';
      ctx.fillRect(0, groundY, width, height - groundY);

      // Flag colors
      const flagColors = [
        color1,
        color2,
        { r: 255, g: 255, b: 255 },
        { r: Math.floor((color1.r + color2.r) / 2), g: Math.floor((color1.g + color2.g) / 2), b: Math.floor((color1.b + color2.b) / 2) },
        { r: 50, g: 50, b: 50 },
      ];

      const getWindIntensity = (x: number, z: number) => {
        const gust = Math.sin((x * 4 - gustWave) + z * 2) * 0.5 + 0.5;
        return 0.3 + gust * 0.7;
      };

      // Sort by depth
      const sortedFlags = [...particles].sort((a, b) => a.z - b.z);

      sortedFlags.forEach((flag) => {
        const localWind = getWindIntensity(flag.x, flag.z);
        const windIntensity = localWind * flag.waveAmplitude;

        // Screen position with perspective
        const perspective = 400;
        const pz = flag.z * 300;
        const scale = perspective / (perspective + pz);
        const screenX = (flag.x - 0.5) * width * 1.2 * scale + centerX;
        const baseY = groundY - 10 * scale;
        const poleHeight = flag.poleHeight * height * scale;
        const topY = baseY - poleHeight;

        // Draw pole shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.beginPath();
        ctx.ellipse(screenX + 5 * scale, baseY + 3, 4 * scale, 2 * scale, 0, 0, Math.PI * 2);
        ctx.fill();

        // Draw pole
        ctx.strokeStyle = '#666666';
        ctx.lineWidth = 3 * scale;
        ctx.beginPath();
        ctx.moveTo(screenX, baseY);
        ctx.lineTo(screenX, topY);
        ctx.stroke();

        // Draw flag with wave effect
        const flagWidth = flag.flagWidth * width * scale;
        const flagHeight = flag.flagHeight * height * scale;
        const segments = 8;
        const flagColor = flagColors[flag.colorIndex % flagColors.length];

        ctx.fillStyle = `rgba(${flagColor.r}, ${flagColor.g}, ${flagColor.b}, 0.95)`;
        ctx.beginPath();
        ctx.moveTo(screenX, topY);

        // Top edge with wave
        for (let i = 0; i <= segments; i++) {
          const t = i / segments;
          const waveY = Math.sin(t * Math.PI * 3 + flag.wavePhase + gustWave * 2) * windIntensity * 8 * scale;
          const stretch = 1 + windIntensity * 0.3;
          ctx.lineTo(screenX + t * flagWidth * stretch, topY + waveY);
        }

        // Bottom edge with wave (reverse)
        for (let i = segments; i >= 0; i--) {
          const t = i / segments;
          const waveY = Math.sin(t * Math.PI * 3 + flag.wavePhase + gustWave * 2 + 0.5) * windIntensity * 8 * scale;
          const stretch = 1 + windIntensity * 0.3;
          ctx.lineTo(screenX + t * flagWidth * stretch, topY + flagHeight + waveY);
        }

        ctx.closePath();
        ctx.fill();

        // Flag highlight
        ctx.fillStyle = `rgba(255, 255, 255, ${windIntensity * 0.2})`;
        ctx.beginPath();
        ctx.moveTo(screenX, topY);
        for (let i = 0; i <= segments / 2; i++) {
          const t = i / segments;
          const waveY = Math.sin(t * Math.PI * 3 + flag.wavePhase + gustWave * 2) * windIntensity * 8 * scale;
          const stretch = 1 + windIntensity * 0.3;
          ctx.lineTo(screenX + t * flagWidth * stretch, topY + waveY);
        }
        for (let i = Math.floor(segments / 2); i >= 0; i--) {
          const t = i / segments;
          const waveY = Math.sin(t * Math.PI * 3 + flag.wavePhase + gustWave * 2 + 0.5) * windIntensity * 8 * scale;
          const stretch = 1 + windIntensity * 0.3;
          ctx.lineTo(screenX + t * flagWidth * stretch, topY + flagHeight * 0.5 + waveY);
        }
        ctx.closePath();
        ctx.fill();

        flag.wavePhase += 0.1 * params.cameraSpeed;
      });
    }

    // ============ SAILBOATS ON SWELLS ============
    else if (arrangement === 'sailboats') {
      const particles = sailboatParticlesRef.current;
      waveTimeRef.current += 0.02 * params.cameraSpeed;
      const waveTime = waveTimeRef.current;

      const getWaveHeight = (x: number, z: number, t: number) => {
        return Math.sin(x * 6 + t) * 15 + Math.sin(z * 4 + t * 0.7) * 20 + Math.sin(x * 3 + z * 5 + t * 1.3) * 10;
      };

      const getWaveSlope = (x: number, z: number, t: number) => {
        return Math.cos(x * 6 + t) * 6 * 0.02 + Math.cos(x * 3 + z * 5 + t * 1.3) * 3 * 0.02;
      };

      // Sky
      const skyGradient = ctx.createLinearGradient(0, 0, 0, height * 0.4);
      const bgColor = hexToRgb(params.backgroundColor);
      skyGradient.addColorStop(0, `rgb(${bgColor.r * 0.6}, ${bgColor.g * 0.7}, ${bgColor.b * 0.9})`);
      skyGradient.addColorStop(1, `rgb(${bgColor.r}, ${bgColor.g}, ${bgColor.b})`);
      ctx.fillStyle = skyGradient;
      ctx.fillRect(0, 0, width, height * 0.4);

      // Ocean with wave lines
      const oceanTop = height * 0.4;
      for (let row = 0; row < 30; row++) {
        const rowZ = row / 30;
        const rowY = oceanTop + row * (height * 0.6 / 30);

        const depthMix = row / 30;
        const r = Math.floor(color1.r * (1 - depthMix) + color2.r * depthMix);
        const g = Math.floor(color1.g * (1 - depthMix) + color2.g * depthMix);
        const b = Math.floor(color1.b * (1 - depthMix) + color2.b * depthMix);

        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.7)`;
        ctx.lineWidth = 2 - depthMix;

        ctx.beginPath();
        for (let x = 0; x <= width; x += 15) {
          const localHeight = getWaveHeight(x / width, rowZ, waveTime);
          if (x === 0) ctx.moveTo(x, rowY + localHeight * 0.3);
          else ctx.lineTo(x, rowY + localHeight * 0.3);
        }
        ctx.stroke();
      }

      // Draw boats
      const sortedBoats = [...particles].sort((a, b) => a.z - b.z);

      sortedBoats.forEach((boat) => {
        const waveHeight = getWaveHeight(boat.x, boat.z, waveTime);
        const waveSlope = getWaveSlope(boat.x, boat.z, waveTime);

        const perspective = 500;
        const pz = boat.z * 400;
        const scale = (perspective / (perspective + pz)) * boat.size;
        const screenX = boat.x * width;
        const screenY = oceanTop + boat.z * height * 0.5 + waveHeight * (1 - boat.z * 0.5) * 0.3;

        ctx.save();
        ctx.translate(screenX, screenY);
        ctx.rotate(waveSlope + boat.rotation * 0.3);
        ctx.scale(scale, scale);

        // Hull
        ctx.fillStyle = boat.colorMix > 0.5 ? `rgb(${color2.r}, ${color2.g}, ${color2.b})` : '#FFFFFF';
        ctx.beginPath();
        ctx.moveTo(-25, 0);
        ctx.quadraticCurveTo(-30, 10, -20, 15);
        ctx.lineTo(20, 15);
        ctx.quadraticCurveTo(30, 10, 25, 0);
        ctx.lineTo(30, 0);
        ctx.quadraticCurveTo(35, -5, 25, -5);
        ctx.lineTo(-25, -5);
        ctx.quadraticCurveTo(-35, -5, -30, 0);
        ctx.closePath();
        ctx.fill();

        // Mast
        ctx.strokeStyle = '#4a3728';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, -5);
        ctx.lineTo(0, -60);
        ctx.stroke();

        // Sail
        const billowAmount = boat.sailBillow * (0.8 + Math.sin(waveTime + boat.x * 5) * 0.2);
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.moveTo(0, -55);
        ctx.quadraticCurveTo(20 * billowAmount, -35, 0, -10);
        ctx.lineTo(0, -55);
        ctx.fill();

        // Sail shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.beginPath();
        ctx.moveTo(0, -55);
        ctx.quadraticCurveTo(15 * billowAmount, -35, 0, -15);
        ctx.lineTo(0, -55);
        ctx.fill();

        ctx.restore();
      });
    }

    // ============ FOREST IN WIND ============
    else if (arrangement === 'forest') {
      const particles = treeParticlesRef.current;
      windGustRef.current += 0.015 * params.cameraSpeed;
      const gustWave = windGustRef.current;

      const getWindSway = (x: number, z: number) => {
        const gust = Math.sin(x * 8 - gustWave * 2 + z * 3) * 0.5 + 0.5;
        return gust;
      };

      // Sky
      const skyGradient = ctx.createLinearGradient(0, 0, 0, height * 0.5);
      const bgColor = hexToRgb(params.backgroundColor);
      skyGradient.addColorStop(0, `rgb(${bgColor.r * 0.8}, ${bgColor.g * 0.9}, ${bgColor.b})`);
      skyGradient.addColorStop(1, `rgb(${bgColor.r}, ${bgColor.g}, ${bgColor.b})`);
      ctx.fillStyle = skyGradient;
      ctx.fillRect(0, 0, width, height);

      // Forest floor
      const groundY = height * 0.9;
      const groundGradient = ctx.createLinearGradient(0, groundY - 100, 0, height);
      groundGradient.addColorStop(0, '#3d5c1f');
      groundGradient.addColorStop(1, '#2a4515');
      ctx.fillStyle = groundGradient;
      ctx.fillRect(0, groundY - 100, width, height - groundY + 100);

      // Sort trees by depth
      const sortedTrees = [...particles].sort((a, b) => a.z - b.z);

      sortedTrees.forEach((tree) => {
        const windSway = getWindSway(tree.x, tree.z) * tree.swayAmount;
        tree.swayPhase += 0.03 * params.cameraSpeed;
        const sway = Math.sin(tree.swayPhase + windSway * 5) * windSway * 0.1;

        const perspective = 400;
        const pz = tree.z * 300;
        const scale = perspective / (perspective + pz);
        const screenX = (tree.x - 0.5) * width * 1.3 * scale + centerX;
        const baseY = groundY - pz * 0.15;
        const treeHeight = tree.height * height * scale;

        // Trunk
        const trunkWidth = tree.trunkWidth * width * scale;
        ctx.fillStyle = `rgb(${color2.r}, ${color2.g}, ${color2.b})`;
        ctx.beginPath();
        ctx.moveTo(screenX - trunkWidth, baseY);
        ctx.lineTo(screenX + trunkWidth, baseY);
        ctx.quadraticCurveTo(screenX + trunkWidth * 0.5 + sway * 30, baseY - treeHeight * 0.5, screenX + sway * 50, baseY - treeHeight);
        ctx.quadraticCurveTo(screenX - trunkWidth * 0.5 + sway * 30, baseY - treeHeight * 0.5, screenX - trunkWidth, baseY);
        ctx.fill();

        // Canopy
        const canopySize = tree.canopySize * width * scale;
        const canopyY = baseY - treeHeight;

        if (tree.treeType === 'pine') {
          // Pine tree - triangular
          for (let layer = 0; layer < 3; layer++) {
            const layerY = canopyY + layer * canopySize * 0.4;
            const layerWidth = canopySize * (1 - layer * 0.2);
            const layerSway = sway * (3 - layer) * 15;

            ctx.fillStyle = `rgb(${Math.floor(color1.r * (0.8 + layer * 0.1))}, ${Math.floor(color1.g * (0.8 + layer * 0.1))}, ${Math.floor(color1.b * (0.6 + layer * 0.15))})`;
            ctx.beginPath();
            ctx.moveTo(screenX + layerSway, layerY - canopySize * (0.8 - layer * 0.2));
            ctx.lineTo(screenX - layerWidth + layerSway * 0.7, layerY + canopySize * 0.3);
            ctx.lineTo(screenX + layerWidth + layerSway * 0.7, layerY + canopySize * 0.3);
            ctx.closePath();
            ctx.fill();
          }
        } else {
          // Deciduous - round canopy
          const canopySway = sway * 40;
          ctx.fillStyle = `rgb(${color1.r}, ${color1.g}, ${color1.b})`;
          ctx.beginPath();
          ctx.ellipse(screenX + canopySway, canopyY, canopySize, canopySize * 0.8, 0, 0, Math.PI * 2);
          ctx.fill();

          // Highlight
          ctx.fillStyle = `rgba(${Math.min(255, color1.r + 40)}, ${Math.min(255, color1.g + 40)}, ${color1.b}, 0.5)`;
          ctx.beginPath();
          ctx.ellipse(screenX + canopySway - canopySize * 0.2, canopyY - canopySize * 0.2, canopySize * 0.5, canopySize * 0.4, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }

    // ============ FISH SCHOOL ============
    else if (arrangement === 'fishschool') {
      const particles = fishParticlesRef.current;
      timeRef.current += 0.02 * params.cameraSpeed;
      const time = timeRef.current;

      // Current flow direction
      const currentX = Math.cos(time * 0.3) * 0.003;
      const currentY = Math.sin(time * 0.4) * 0.002;

      // Underwater background
      const waterGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, Math.max(width, height) * 0.7);
      const bgColor = hexToRgb(params.backgroundColor);
      waterGradient.addColorStop(0, `rgba(${bgColor.r + 30}, ${bgColor.g + 50}, ${bgColor.b + 70}, 1)`);
      waterGradient.addColorStop(1, `rgb(${bgColor.r}, ${bgColor.g}, ${bgColor.b})`);
      ctx.fillStyle = waterGradient;
      ctx.fillRect(0, 0, width, height);

      // Light rays from above
      ctx.save();
      for (let i = 0; i < 5; i++) {
        const rayX = width * (0.2 + i * 0.15) + Math.sin(time + i) * 20;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.beginPath();
        ctx.moveTo(rayX - 30, 0);
        ctx.lineTo(rayX + 30, 0);
        ctx.lineTo(rayX + 100, height);
        ctx.lineTo(rayX - 100, height);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

      // Boids algorithm
      particles.forEach((fish) => {
        let avgX = 0, avgY = 0, avgVx = 0, avgVy = 0, separateX = 0, separateY = 0;
        let neighbors = 0;

        particles.forEach((other) => {
          if (fish === other) return;
          const dx = other.x - fish.x;
          const dy = other.y - fish.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 0.15) {
            avgX += other.x;
            avgY += other.y;
            avgVx += other.vx;
            avgVy += other.vy;
            neighbors++;

            if (dist < 0.04) {
              separateX -= dx / dist * 0.001;
              separateY -= dy / dist * 0.001;
            }
          }
        });

        if (neighbors > 0) {
          // Cohesion
          avgX /= neighbors;
          avgY /= neighbors;
          fish.vx += (avgX - fish.x) * 0.01;
          fish.vy += (avgY - fish.y) * 0.01;

          // Alignment
          avgVx /= neighbors;
          avgVy /= neighbors;
          fish.vx += (avgVx - fish.vx) * 0.05;
          fish.vy += (avgVy - fish.vy) * 0.05;

          // Separation
          fish.vx += separateX;
          fish.vy += separateY;
        }

        // Follow current
        fish.vx += currentX;
        fish.vy += currentY;

        // Speed limit
        const speed = Math.sqrt(fish.vx * fish.vx + fish.vy * fish.vy);
        if (speed > 0.015) {
          fish.vx = (fish.vx / speed) * 0.015;
          fish.vy = (fish.vy / speed) * 0.015;
        }

        // Update position
        fish.x += fish.vx;
        fish.y += fish.vy;

        // Wrap around
        if (fish.x < 0) fish.x = 1;
        if (fish.x > 1) fish.x = 0;
        if (fish.y < 0) fish.y = 1;
        if (fish.y > 1) fish.y = 0;
      });

      // Draw fish
      const sortedFish = [...particles].sort((a, b) => a.z - b.z);

      sortedFish.forEach((fish) => {
        const screenX = fish.x * width;
        const screenY = fish.y * height;
        const angle = Math.atan2(fish.vy, fish.vx);
        const size = fish.size * (0.5 + fish.z * 0.5);

        ctx.save();
        ctx.translate(screenX, screenY);
        ctx.rotate(angle);

        // Fish body
        const fishColor = fish.colorMix > 0.5 ? color2 : color1;
        const alpha = 0.6 + fish.z * 0.4;
        ctx.fillStyle = `rgba(${fishColor.r}, ${fishColor.g}, ${fishColor.b}, ${alpha})`;

        ctx.beginPath();
        ctx.ellipse(0, 0, size * 2, size, 0, 0, Math.PI * 2);
        ctx.fill();

        // Tail
        ctx.beginPath();
        ctx.moveTo(-size * 2, 0);
        ctx.lineTo(-size * 3.5, -size);
        ctx.lineTo(-size * 3.5, size);
        ctx.closePath();
        ctx.fill();

        // Eye
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.beginPath();
        ctx.arc(size, 0, size * 0.3, 0, Math.PI * 2);
        ctx.fill();

        // Metallic shine
        if (params.metallic > 0.5) {
          ctx.fillStyle = `rgba(255, 255, 255, ${params.metallic * 0.3 * alpha})`;
          ctx.beginPath();
          ctx.ellipse(size * 0.5, -size * 0.3, size * 0.8, size * 0.3, 0, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      });
    }

    // ============ BIRD MURMURATION ============
    else if (arrangement === 'murmuration') {
      const particles = birdParticlesRef.current;
      timeRef.current += 0.02 * params.cameraSpeed;
      const time = timeRef.current;

      // Predator/attractor point that moves through the flock
      const predatorX = 0.5 + Math.cos(time * 0.5) * 0.3;
      const predatorY = 0.4 + Math.sin(time * 0.7) * 0.25;

      // Dusk sky gradient
      const skyGradient = ctx.createLinearGradient(0, 0, 0, height);
      const bgColor = hexToRgb(params.backgroundColor);
      skyGradient.addColorStop(0, `rgb(${Math.floor(bgColor.r * 0.4)}, ${Math.floor(bgColor.g * 0.3)}, ${Math.floor(bgColor.b * 0.6)})`);
      skyGradient.addColorStop(0.4, `rgb(${bgColor.r}, ${bgColor.g}, ${bgColor.b})`);
      skyGradient.addColorStop(1, `rgb(${Math.floor(bgColor.r * 0.3)}, ${Math.floor(bgColor.g * 0.2)}, ${Math.floor(bgColor.b * 0.3)})`);
      ctx.fillStyle = skyGradient;
      ctx.fillRect(0, 0, width, height);

      // Silhouette treeline
      ctx.fillStyle = '#1a1a1a';
      ctx.beginPath();
      ctx.moveTo(0, height);
      for (let x = 0; x <= width; x += 20) {
        const treeHeight = 50 + Math.sin(x * 0.02) * 30 + Math.sin(x * 0.05) * 20;
        ctx.lineTo(x, height - treeHeight);
      }
      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fill();

      // Boids algorithm for birds
      particles.forEach((bird) => {
        let avgX = 0, avgY = 0, avgVx = 0, avgVy = 0, separateX = 0, separateY = 0;
        let neighbors = 0;

        // Sample only some birds for performance
        for (let i = 0; i < Math.min(50, particles.length); i++) {
          const other = particles[Math.floor(Math.random() * particles.length)];
          if (bird === other) continue;

          const dx = other.x - bird.x;
          const dy = other.y - bird.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 0.12) {
            avgX += other.x;
            avgY += other.y;
            avgVx += other.vx;
            avgVy += other.vy;
            neighbors++;

            if (dist < 0.025) {
              separateX -= dx / dist * 0.0008;
              separateY -= dy / dist * 0.0008;
            }
          }
        }

        if (neighbors > 0) {
          avgX /= neighbors;
          avgY /= neighbors;
          avgVx /= neighbors;
          avgVy /= neighbors;

          bird.vx += (avgX - bird.x) * 0.008;
          bird.vy += (avgY - bird.y) * 0.008;
          bird.vx += (avgVx - bird.vx) * 0.04;
          bird.vy += (avgVy - bird.vy) * 0.04;
          bird.vx += separateX;
          bird.vy += separateY;
        }

        // Avoid predator
        const predDx = bird.x - predatorX;
        const predDy = bird.y - predatorY;
        const predDist = Math.sqrt(predDx * predDx + predDy * predDy);
        if (predDist < 0.2) {
          bird.vx += (predDx / predDist) * 0.003 * (0.2 - predDist) * 5;
          bird.vy += (predDy / predDist) * 0.003 * (0.2 - predDist) * 5;
        }

        // Contain to screen
        if (bird.x < 0.1) bird.vx += 0.001;
        if (bird.x > 0.9) bird.vx -= 0.001;
        if (bird.y < 0.1) bird.vy += 0.001;
        if (bird.y > 0.7) bird.vy -= 0.001;

        // Speed limit
        const speed = Math.sqrt(bird.vx * bird.vx + bird.vy * bird.vy);
        if (speed > 0.01) {
          bird.vx = (bird.vx / speed) * 0.01;
          bird.vy = (bird.vy / speed) * 0.01;
        }

        bird.x += bird.vx;
        bird.y += bird.vy;
        bird.wingPhase += 0.3;
      });

      // Draw birds
      const sortedBirds = [...particles].sort((a, b) => a.z - b.z);

      sortedBirds.forEach((bird) => {
        const screenX = bird.x * width;
        const screenY = bird.y * height;
        const angle = Math.atan2(bird.vy, bird.vx);
        const size = 2 + bird.z * 2;

        ctx.save();
        ctx.translate(screenX, screenY);
        ctx.rotate(angle);

        // Simple bird silhouette
        const wingOffset = Math.sin(bird.wingPhase) * 2;
        ctx.fillStyle = `rgba(${color1.r}, ${color1.g}, ${color1.b}, ${0.6 + bird.z * 0.4})`;

        // Body
        ctx.beginPath();
        ctx.ellipse(0, 0, size, size * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Wings
        ctx.beginPath();
        ctx.moveTo(-size * 0.5, 0);
        ctx.lineTo(-size, -size + wingOffset);
        ctx.lineTo(0, 0);
        ctx.lineTo(-size, size - wingOffset);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
      });
    }

    // ============ PENDULUM WAVE ============
    else if (arrangement === 'pendulums') {
      const particles = pendulumParticlesRef.current;
      pendulumTimeRef.current += 0.03 * params.cameraSpeed;
      const time = pendulumTimeRef.current;

      // Dark background with spotlight
      const spotlightGradient = ctx.createRadialGradient(centerX, height * 0.1, 0, centerX, height * 0.5, height * 0.8);
      spotlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
      spotlightGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = spotlightGradient;
      ctx.fillRect(0, 0, width, height);

      // Support bar
      const barY = height * 0.1;
      ctx.strokeStyle = '#666666';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(width * 0.05, barY);
      ctx.lineTo(width * 0.95, barY);
      ctx.stroke();

      // Pendulum physics
      const g = 9.8;
      particles.forEach((pendulum) => {
        // Period = 2π√(L/g), angular frequency ω = √(g/L)
        const omega = Math.sqrt(g / (pendulum.length * 10));
        // Simple harmonic motion: θ(t) = θ₀ cos(ωt)
        const amplitude = Math.PI / 4;
        pendulum.angle = amplitude * Math.cos(omega * time);
      });

      // Draw pendulums
      particles.forEach((pendulum) => {
        const pivotX = pendulum.x * width * 0.9 + width * 0.05;
        const pivotY = barY;
        const length = pendulum.length * height * 2;
        const bobX = pivotX + Math.sin(pendulum.angle) * length;
        const bobY = pivotY + Math.cos(pendulum.angle) * length;
        const bobSize = 15;

        // String shadow
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(pivotX + 3, pivotY + 3);
        ctx.lineTo(bobX + 3, bobY + 3);
        ctx.stroke();

        // String
        ctx.strokeStyle = '#888888';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(pivotX, pivotY);
        ctx.lineTo(bobX, bobY);
        ctx.stroke();

        // Bob shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(bobX + 5, bobY + height * 0.7, bobSize * 0.8, bobSize * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();

        // Bob with gradient
        const bobColor = pendulum.colorMix > 0.5 ? color2 : color1;
        const bobGradient = ctx.createRadialGradient(bobX - bobSize * 0.3, bobY - bobSize * 0.3, 0, bobX, bobY, bobSize);
        bobGradient.addColorStop(0, `rgba(255, 255, 255, ${params.metallic})`);
        bobGradient.addColorStop(0.3, `rgb(${bobColor.r}, ${bobColor.g}, ${bobColor.b})`);
        bobGradient.addColorStop(1, `rgb(${Math.floor(bobColor.r * 0.5)}, ${Math.floor(bobColor.g * 0.5)}, ${Math.floor(bobColor.b * 0.5)})`);

        ctx.fillStyle = bobGradient;
        ctx.beginPath();
        ctx.arc(bobX, bobY, bobSize, 0, Math.PI * 2);
        ctx.fill();

        // Specular highlight
        if (params.metallic > 0.5) {
          ctx.fillStyle = `rgba(255, 255, 255, ${params.metallic * 0.6})`;
          ctx.beginPath();
          ctx.arc(bobX - bobSize * 0.3, bobY - bobSize * 0.3, bobSize * 0.25, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }

    // ============ DOMINO CHAIN REACTION ============
    else if (arrangement === 'dominoes') {
      const particles = dominoParticlesRef.current;
      dominoTriggerRef.current += 0.02 * params.cameraSpeed;
      const trigger = dominoTriggerRef.current;

      // Background
      const bgGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, Math.max(width, height) * 0.7);
      bgGradient.addColorStop(0, 'rgba(40, 40, 40, 1)');
      bgGradient.addColorStop(1, 'rgba(10, 10, 10, 1)');
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, width, height);

      // Chain reaction logic
      const triggerIndex = Math.floor(trigger * particles.length * 0.5) % particles.length;
      
      particles.forEach((domino, index) => {
        // Trigger domino if it's time
        if (index <= triggerIndex && !domino.triggered) {
          domino.triggered = true;
          domino.fallSpeed = 0.1 + Math.random() * 0.05;
        }

        // Fall animation
        if (domino.triggered && domino.angle < Math.PI / 2 - 0.1) {
          domino.angle += domino.fallSpeed * params.cameraSpeed;
          domino.fallSpeed += 0.005; // Accelerate
        }

        // Reset when all have fallen
        if (trigger > particles.length * 0.02 + 3) {
          domino.angle = 0;
          domino.triggered = false;
          domino.fallSpeed = 0;
        }
      });

      // Draw dominoes
      particles.forEach((domino) => {
        const screenX = domino.x * width;
        const screenY = domino.y * height;
        const dominoHeight = 25;
        const dominoWidth = 8;
        const dominoDepth = 4;

        ctx.save();
        ctx.translate(screenX, screenY);

        // Calculate fall direction based on spiral position
        const fallDirection = Math.atan2(domino.y - 0.5, domino.x - 0.5) + Math.PI / 2;
        ctx.rotate(fallDirection);

        // Domino is tilting
        const tiltOffset = Math.sin(domino.angle) * dominoHeight;
        const tiltHeight = Math.cos(domino.angle) * dominoHeight;

        // Shadow
        if (domino.angle > 0) {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
          ctx.beginPath();
          ctx.ellipse(tiltOffset * 0.5, 5, dominoWidth + tiltOffset * 0.3, 3, 0, 0, Math.PI * 2);
          ctx.fill();
        }

        // Domino face
        const dominoColor = domino.colorMix > 0.5 ? color2 : color1;
        ctx.fillStyle = `rgb(${dominoColor.r}, ${dominoColor.g}, ${dominoColor.b})`;
        
        // Front face (always visible)
        ctx.beginPath();
        ctx.rect(-dominoWidth / 2, -tiltHeight, dominoWidth, tiltHeight);
        ctx.fill();

        // Top face (visible when standing)
        if (domino.angle < Math.PI / 4) {
          ctx.fillStyle = `rgb(${Math.min(255, dominoColor.r + 30)}, ${Math.min(255, dominoColor.g + 30)}, ${Math.min(255, dominoColor.b + 30)})`;
          ctx.beginPath();
          ctx.moveTo(-dominoWidth / 2, -tiltHeight);
          ctx.lineTo(-dominoWidth / 2 + dominoDepth, -tiltHeight - dominoDepth);
          ctx.lineTo(dominoWidth / 2 + dominoDepth, -tiltHeight - dominoDepth);
          ctx.lineTo(dominoWidth / 2, -tiltHeight);
          ctx.closePath();
          ctx.fill();
        }

        // Dots (pips)
        ctx.fillStyle = '#FFFFFF';
        const pipPositions = [[0, -tiltHeight / 2]];
        pipPositions.forEach(([px, py]) => {
          ctx.beginPath();
          ctx.arc(px, py, 2, 0, Math.PI * 2);
          ctx.fill();
        });

        ctx.restore();
      });

      // Reset trigger for loop
      if (dominoTriggerRef.current > particles.length * 0.02 + 4) {
        dominoTriggerRef.current = 0;
      }
    }

    // ============ COMPASS NEEDLES TO MAGNET ============
    else if (arrangement === 'compass') {
      const particles = compassParticlesRef.current;
      timeRef.current += 0.02 * params.cameraSpeed;
      const time = timeRef.current;

      // Moving magnet position (figure-8 path)
      const magnetX = 0.5 + Math.sin(time * 0.5) * 0.35;
      const magnetY = 0.5 + Math.sin(time) * Math.cos(time * 0.5) * 0.25;
      magnetPositionRef.current = { x: magnetX, y: magnetY, angle: time };

      // Background
      const bgColor = hexToRgb(params.backgroundColor);
      ctx.fillStyle = `rgb(${bgColor.r}, ${bgColor.g}, ${bgColor.b})`;
      ctx.fillRect(0, 0, width, height);

      // Grid lines (subtle)
      ctx.strokeStyle = 'rgba(128, 128, 128, 0.1)';
      ctx.lineWidth = 1;
      const gridSize = 50;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Update compass needles to point toward magnet
      particles.forEach((compass) => {
        const dx = magnetX - compass.x;
        const dy = magnetY - compass.y;
        compass.targetAngle = Math.atan2(dy, dx);

        // Springy rotation toward target
        let angleDiff = compass.targetAngle - compass.angle;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

        compass.angle += angleDiff * 0.1 * compass.springiness;
      });

      // Draw compass needles
      const needleLength = 15;
      particles.forEach((compass) => {
        const screenX = compass.x * width;
        const screenY = compass.y * height;

        ctx.save();
        ctx.translate(screenX, screenY);
        ctx.rotate(compass.angle);

        // Needle base circle
        ctx.fillStyle = 'rgba(200, 200, 200, 0.3)';
        ctx.beginPath();
        ctx.arc(0, 0, needleLength * 0.6, 0, Math.PI * 2);
        ctx.fill();

        // North (red) half
        ctx.fillStyle = `rgb(${color1.r}, ${color1.g}, ${color1.b})`;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(needleLength, -2);
        ctx.lineTo(needleLength, 2);
        ctx.closePath();
        ctx.fill();

        // South (white/silver) half
        ctx.fillStyle = `rgb(${color2.r}, ${color2.g}, ${color2.b})`;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-needleLength * 0.7, -2);
        ctx.lineTo(-needleLength * 0.7, 2);
        ctx.closePath();
        ctx.fill();

        // Center pivot
        ctx.fillStyle = '#333333';
        ctx.beginPath();
        ctx.arc(0, 0, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      });

      // Draw magnet position (optional visible indicator)
      const magnetScreenX = magnetX * width;
      const magnetScreenY = magnetY * height;
      ctx.fillStyle = 'rgba(255, 100, 100, 0.3)';
      ctx.beginPath();
      ctx.arc(magnetScreenX, magnetScreenY, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 50, 50, 0.6)';
      ctx.beginPath();
      ctx.arc(magnetScreenX, magnetScreenY, 8, 0, Math.PI * 2);
      ctx.fill();
    }

    // ============ CANNON & OTHER STANDARD ARRANGEMENTS ============
    else if (arrangement === 'cannon' || arrangement === 'radial' || arrangement === 'spiral' || arrangement === 'grid' || arrangement === 'wave') {
      const isCannon = arrangement === 'cannon';

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

      const sortedParticles = [...particlesRef.current].sort((a, b) => a.z - b.z);

      const rotationAngle = timeRef.current;
      const cosR = Math.cos(rotationAngle);
      const sinR = Math.sin(rotationAngle);

      sortedParticles.forEach((particle) => {
        let screenX: number, screenY: number, screenSize: number, rotation: number;

        if (isCannon) {
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
          draw3DCube(ctx, screenX, screenY, screenSize * 1.5, rotation, color, params.metallic, lightAngle, alpha);
        }
      });
    }


    animationRef.current = requestAnimationFrame(render);
  }, [params, hexToRgb, draw3DCube, drawTunnelCube, drawGlowingSphere, getBezierPoint]);

  // Initialize appropriate particles based on arrangement
  const initializeParticles = useCallback(() => {
    switch (params.arrangement) {
      case 'tunnel':
        initTunnelParticles();
        break;
      case 'helix':
        initHelixParticles();
        break;
      case 'matrix':
        initMatrixParticles();
        break;
      case 'orbits':
        initOrbitParticles();
        break;
      case 'vortex':
        initVortexParticles();
        break;
      case 'constellation':
        initConstellationParticles();
        break;
      case 'stream':
        initStreamParticles();
        break;
      case 'explosion':
        initExplosionParticles();
        break;
      case 'kaleidoscope':
        initKaleidoscopeParticles();
        break;
      case 'sunflowers':
        initSunflowerParticles();
        break;
      case 'solarpanel':
        initSolarPanelParticles();
        break;
      case 'windmill':
        initWindmillParticles();
        break;
      case 'surfers':
        initSurferParticles();
        break;
      case 'flags':
        initFlagParticles();
        break;
      case 'sailboats':
        initSailboatParticles();
        break;
      case 'forest':
        initTreeParticles();
        break;
      case 'fishschool':
        initFishParticles();
        break;
      case 'murmuration':
        initBirdParticles();
        break;
      case 'pendulums':
        initPendulumParticles();
        break;
      case 'dominoes':
        initDominoParticles();
        break;
      case 'compass':
        initCompassParticles();
        break;
      default:
        initParticles();
    }
  }, [
    params.arrangement,
    initTunnelParticles,
    initHelixParticles,
    initMatrixParticles,
    initOrbitParticles,
    initVortexParticles,
    initConstellationParticles,
    initStreamParticles,
    initExplosionParticles,
    initKaleidoscopeParticles,
    initSunflowerParticles,
    initSolarPanelParticles,
    initWindmillParticles,
    initSurferParticles,
    initFlagParticles,
    initSailboatParticles,
    initTreeParticles,
    initFishParticles,
    initBirdParticles,
    initPendulumParticles,
    initDominoParticles,
    initCompassParticles,
    initParticles,
  ]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateSize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      initializeParticles();
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
  }, [initializeParticles, render]);

  useEffect(() => {
    initializeParticles();
  }, [params.instanceCount, params.arrangement, initializeParticles]);

  return (
    <canvas
      ref={canvasRef}
      className={`h-full w-full ${className}`}
      style={{ backgroundColor: params.backgroundColor }}
    />
  );
}
