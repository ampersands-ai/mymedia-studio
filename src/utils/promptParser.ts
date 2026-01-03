import { ShaderParams } from '@/types/procedural-background';

interface ColorMapping {
  keywords: string[];
  hex: string;
}

const COLOR_MAPPINGS: ColorMapping[] = [
  { keywords: ['gold', 'golden', 'amber'], hex: '#D4AF37' },
  { keywords: ['blue', 'azure', 'sapphire'], hex: '#4169E1' },
  { keywords: ['red', 'crimson', 'scarlet'], hex: '#DC143C' },
  { keywords: ['green', 'emerald', 'jade'], hex: '#50C878' },
  { keywords: ['purple', 'violet', 'amethyst'], hex: '#9B59B6' },
  { keywords: ['pink', 'rose', 'magenta'], hex: '#FF6EC7' },
  { keywords: ['orange', 'tangerine', 'coral'], hex: '#FF7F50' },
  { keywords: ['white', 'silver', 'platinum'], hex: '#E8E8E8' },
  { keywords: ['black', 'obsidian', 'onyx'], hex: '#1a1a1a' },
  { keywords: ['cyan', 'aqua', 'turquoise'], hex: '#00CED1' },
  { keywords: ['neon'], hex: '#39FF14' },
  { keywords: ['sunset', 'dusk'], hex: '#FF6B35' },
  { keywords: ['ocean', 'sea', 'marine'], hex: '#1E90FF' },
  { keywords: ['fire', 'flame', 'inferno'], hex: '#FF4500' },
  { keywords: ['ice', 'frost', 'arctic'], hex: '#A5D8FF' },
  { keywords: ['forest', 'nature', 'leaf'], hex: '#228B22' },
];

const ARRANGEMENT_KEYWORDS: Record<string, ShaderParams['arrangement']> = {
  radial: 'radial',
  circle: 'radial',
  circular: 'radial',
  spiral: 'spiral',
  swirl: 'spiral',
  helix: 'spiral',
  grid: 'grid',
  matrix: 'grid',
  structured: 'grid',
  wave: 'wave',
  waves: 'wave',
  flowing: 'wave',
  ocean: 'wave',
  // Tracking-based arrangements
  eyes: 'eyes',
  eyeballs: 'eyes',
  watching: 'eyes',
  staring: 'eyes',
  pupils: 'eyes',
  spotlights: 'spotlights',
  theater: 'spotlights',
  stage: 'spotlights',
  broadway: 'spotlights',
  cameras: 'cameras',
  security: 'cameras',
  surveillance: 'cameras',
  cctv: 'cameras',
  satellites: 'satellites',
  dishes: 'satellites',
  radio: 'satellites',
  vla: 'satellites',
  arrows: 'arrows',
  signs: 'arrows',
  directions: 'arrows',
  wayfinding: 'arrows',
  sunfloweremoji: 'sunfloweremoji',
  kawaii: 'sunfloweremoji',
  cute: 'sunfloweremoji',
  emoji: 'sunfloweremoji',
  turrets: 'turrets',
  guns: 'turrets',
  defense: 'turrets',
  targeting: 'turrets',
  mirrors: 'mirrors',
  concentrator: 'mirrors',
  reflection: 'mirrors',
  periscopes: 'periscopes',
  submarine: 'periscopes',
  underwater: 'periscopes',
  radar: 'radar',
  scanning: 'radar',
  detection: 'radar',
  clocks: 'clocks',
  time: 'clocks',
  hours: 'clocks',
  lasers: 'lasers',
  beams: 'lasers',
  convergence: 'lasers',
  flowers: 'flowers',
  meadow: 'flowers',
  garden: 'flowers',
  petals: 'flowers',
  speakers: 'speakers',
  audio: 'speakers',
  sound: 'speakers',
  bass: 'speakers',
  watchtowers: 'watchtowers',
  towers: 'watchtowers',
  searchlight: 'watchtowers',
  metronomes: 'metronomes',
  pendulum: 'metronomes',
  swinging: 'metronomes',
  tick: 'metronomes',
  windvanes: 'windvanes',
  weather: 'windvanes',
  vanes: 'windvanes',
  searchlights: 'searchlights',
  antiaircraft: 'searchlights',
  wwii: 'searchlights',
  telescopes: 'telescopes',
  observatory: 'telescopes',
  astronomy: 'telescopes',
  flames: 'flames',
  candles: 'flames',
  torches: 'flames',
  fire: 'flames',
  // POV tunnel ride
  tunnelride: 'tunnelride',
  tunnel: 'tunnelride',
  pov: 'tunnelride',
  bikeride: 'tunnelride',
  psychedelic: 'tunnelride',
  trippy: 'tunnelride',
  warp: 'tunnelride',
  hyperdrive: 'tunnelride',
  hyperspace: 'tunnelride',
  lightspeed: 'tunnelride',
};

const SHAPE_KEYWORDS: Record<string, ShaderParams['shape']> = {
  cube: 'cube',
  cubes: 'cube',
  box: 'cube',
  boxes: 'cube',
  block: 'cube',
  blocks: 'cube',
  sphere: 'sphere',
  spheres: 'sphere',
  ball: 'sphere',
  balls: 'sphere',
  orb: 'sphere',
  orbs: 'sphere',
  pyramid: 'pyramid',
  pyramids: 'pyramid',
  triangle: 'pyramid',
  triangular: 'pyramid',
};

const METALLIC_KEYWORDS: Record<string, number> = {
  metallic: 0.9,
  shiny: 0.85,
  glossy: 0.8,
  chrome: 0.95,
  mirror: 1.0,
  matte: 0.2,
  flat: 0.1,
  dull: 0.15,
};

const SPEED_KEYWORDS: Record<string, number> = {
  fast: 0.8,
  quick: 0.7,
  rapid: 0.9,
  slow: 0.2,
  gentle: 0.15,
  calm: 0.1,
  smooth: 0.25,
  dynamic: 0.6,
};

const DENSITY_KEYWORDS: Record<string, number> = {
  dense: 6000,
  thick: 5000,
  packed: 7000,
  sparse: 1500,
  minimal: 1000,
  light: 2000,
  heavy: 5500,
};

export function parsePromptToParams(prompt: string): Partial<ShaderParams> {
  const lowerPrompt = prompt.toLowerCase();
  const result: Partial<ShaderParams> = {};

  // Parse color
  for (const mapping of COLOR_MAPPINGS) {
    for (const keyword of mapping.keywords) {
      if (lowerPrompt.includes(keyword)) {
        result.colorPrimary = mapping.hex;
        break;
      }
    }
    if (result.colorPrimary) break;
  }

  // Parse arrangement
  for (const [keyword, arrangement] of Object.entries(ARRANGEMENT_KEYWORDS)) {
    if (lowerPrompt.includes(keyword)) {
      result.arrangement = arrangement;
      break;
    }
  }

  // Parse shape
  for (const [keyword, shape] of Object.entries(SHAPE_KEYWORDS)) {
    if (lowerPrompt.includes(keyword)) {
      result.shape = shape;
      break;
    }
  }

  // Parse metallic
  for (const [keyword, metallic] of Object.entries(METALLIC_KEYWORDS)) {
    if (lowerPrompt.includes(keyword)) {
      result.metallic = metallic;
      break;
    }
  }

  // Parse speed
  for (const [keyword, speed] of Object.entries(SPEED_KEYWORDS)) {
    if (lowerPrompt.includes(keyword)) {
      result.cameraSpeed = speed;
      break;
    }
  }

  // Parse density
  for (const [keyword, count] of Object.entries(DENSITY_KEYWORDS)) {
    if (lowerPrompt.includes(keyword)) {
      result.instanceCount = count;
      break;
    }
  }

  return result;
}

export function getPromptSuggestions(): string[] {
  return [
    'gold cubes spiral metallic',
    'blue spheres radial shiny',
    'neon pink wave fast',
    'matrix grid green dense',
    'ocean wave calm minimal',
    'fire cubes dynamic packed',
    'ice pyramids spiral gentle',
    'purple spheres radial glossy',
  ];
}
