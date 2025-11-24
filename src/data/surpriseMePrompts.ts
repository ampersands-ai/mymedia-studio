/**
 * Curated prompts for different creation types
 * Used by the "Surprise Me" feature to provide creative inspiration
 */

import { cinematicPortraitPrompts } from './cinematicPortraitPrompts';

/**
 * Calculate current day of year (1-365/366)
 * More efficient than redundant Date constructors
 */
function getDayOfYear(): number {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - startOfYear.getTime();
  return Math.floor(diff / 86400000);
}

// Image Generation Prompts (250+ curated cinematic portrait prompts)
export const imagePrompts = cinematicPortraitPrompts;

// Image Editing Prompts
export const imageEditingPrompts = [
  "Transform this into a vintage film photograph with authentic grain, faded colors, and light leaks",
  "Make it look like a professional magazine cover with enhanced colors and polished retouching",
  "Convert to dramatic black and white with high contrast and deep shadows",
  "Add a dreamy, ethereal glow effect with soft focus and pastel tones",
  "Transform into a comic book style illustration with bold outlines and halftone patterns",
  "Make it look like an oil painting with visible brush strokes and rich textures",
  "Add cinematic color grading with teal shadows and warm highlights",
  "Convert to a cyberpunk aesthetic with neon accents and futuristic atmosphere",
  "Transform into a watercolor painting with soft edges and flowing colors",
  "Add a golden hour glow with warm sunlight and lens flare effects",
];

// Video Generation Prompts
export const videoPrompts = [
  "A serene sunrise over misty mountains, camera slowly panning across the peaks as golden light breaks through the clouds, birds flying in the distance, peaceful and cinematic",
  "Underwater coral reef teeming with colorful fish, gentle camera movement through crystal clear water, rays of sunlight penetrating the surface, vibrant and alive",
  "Futuristic cityscape at night, neon lights reflecting on wet streets, flying cars passing by, camera gliding through towering skyscrapers, cyberpunk atmosphere",
  "Time-lapse of a blooming flower, petals slowly unfurling, morning dew visible, soft natural lighting, close-up macro cinematography, beautiful and detailed",
  "Cozy coffee shop on a rainy day, steam rising from cups, people reading books, rain droplets on windows, warm interior lighting, intimate and inviting atmosphere",
  "Northern lights dancing over a frozen lake, stars visible in the clear night sky, camera slowly tilting up, ethereal green and purple auroras, magical and breathtaking",
  "Ancient library with towering bookshelves, dust particles floating in shafts of light, camera tracking through endless rows of books, mysterious and atmospheric",
  "Space station orbiting Earth, planet slowly rotating below, astronaut working outside, stars and satellites visible, epic and awe-inspiring view",
  "Enchanted forest with bioluminescent plants, magical creatures in the undergrowth, camera gliding through trees, mystical blue and green glow, fantasy atmosphere",
  "Busy Tokyo street at night, colorful signage and advertisements, crowds of people, camera moving through the bustling scene, vibrant urban energy",
];

// Image to Video Animation Prompts
export const imageToVideoPrompts = [
  "Bring this image to life with gentle camera movement, adding subtle parallax effect to create depth and dimension",
  "Animate with a dramatic zoom in, focusing on the main subject while adding atmospheric particles or light rays",
  "Create a cinematic pan across the scene, as if the camera is slowly revealing the story within the image",
  "Add a slow rotating camera movement with dynamic lighting changes to highlight different aspects",
  "Transform into a cinemagraph with selective animation - keep most elements still while animating one key feature",
  "Animate with a Ken Burns effect, slowly zooming and panning to create emotional emphasis",
  "Add environmental effects like falling snow, rain, or floating particles to bring atmosphere to life",
  "Create a dramatic reveal with fog or mist clearing to show the subject",
  "Animate with subtle breathing or swaying movements to add life while maintaining the composition",
  "Add a dreamy slow-motion effect with light bokeh particles floating through the scene",
];

// Audio Generation Prompts
export const audioPrompts = [
  "Lo-fi hip hop beat with jazzy piano chords, soft vinyl crackle, mellow bass line, and gentle drum loops, perfect for studying or relaxing",
  "Epic orchestral trailer music with powerful brass, dramatic strings, thunderous percussion, building to a climactic finale",
  "Ambient space soundscape with ethereal synth pads, distant cosmic echoes, subtle crystalline textures, mysterious and expansive",
  "Upbeat corporate background music with bright acoustic guitars, gentle piano melody, optimistic mood, professional and inspiring",
  "Dark cinematic horror ambience with unsettling drones, creaking sounds, whispered textures, tension-building atmosphere",
  "Peaceful meditation music with Tibetan singing bowls, soft nature sounds, flowing water, calming and centering",
  "Energetic electronic dance music with pulsing synth bass, catchy melodic hooks, driving four-on-the-floor beat",
  "Acoustic coffee shop jazz with walking bass line, brush drums, smooth saxophone melody, cozy and sophisticated",
  "Fantasy game music with Celtic harp, mystical flutes, gentle strings, magical and adventurous atmosphere",
  "Retro 80s synthwave with analog synthesizers, gated reverb drums, nostalgic melodies, neon-soaked aesthetic",
];

// Workflow-specific prompts organized by category
export const workflowPrompts: Record<string, string[]> = {
  'Headshot Creation': imagePrompts,
  'Product Photography': [
    "Luxury watch on marble surface with dramatic lighting, commercial photography style, ultra detailed",
    "Premium skincare product with water droplets, clean white background, soft studio lighting, e-commerce ready",
    "Artisan coffee bag with scattered beans, rustic wooden surface, warm natural lighting, lifestyle product shot",
    "Designer sneakers on geometric platform, bold colors and shadows, modern product photography",
    "Elegant perfume bottle with floral elements, soft focus background, luxury brand aesthetic",
  ],
  'Social Media Content': videoPrompts.slice(0, 5),
  'Logo Design': [
    "Modern minimalist logo for tech startup, geometric shapes, clean lines, professional and innovative",
    "Elegant vintage logo with ornate details, classic typography, timeless design for luxury brand",
    "Bold playful logo with bright colors, fun shapes, energetic and youthful brand identity",
    "Nature-inspired logo with organic elements, earth tones, eco-friendly and sustainable aesthetic",
    "Abstract geometric logo, monochromatic color scheme, sophisticated and contemporary design",
  ],
  'Background Removal': imageEditingPrompts.slice(0, 5),
  'Image Enhancement': imageEditingPrompts,
  'Style Transfer': [
    "Transform into anime art style with bold outlines, vibrant colors, and expressive features",
    "Convert to impressionist painting style with visible brush strokes and soft color blending",
    "Apply Van Gogh's Starry Night artistic style with swirling patterns and bold colors",
    "Transform into pixel art style, retro gaming aesthetic with limited color palette",
    "Apply studio Ghibli animation style with soft colors and whimsical atmosphere",
  ],
};

/**
 * Get random prompt for workflow templates based on category
 */
export function getWorkflowSurpriseMePrompt(category: string): string {
  const dayOfYear = getDayOfYear();
  const randomOffset = Math.floor(Math.random() * 30);

  // Get prompts for this category, fallback to image prompts
  const prompts = workflowPrompts[category] || imagePrompts;
  const index = (dayOfYear * 7 + randomOffset) % prompts.length;

  return prompts[index];
}

/**
 * Get random prompt based on creation type
 */
export function getSurpriseMePrompt(creationType: 'image_editing' | 'prompt_to_image' | 'prompt_to_video' | 'image_to_video' | 'prompt_to_audio'): string {
  const dayOfYear = getDayOfYear();
  const randomOffset = Math.floor(Math.random() * 30);
  
  let prompts: string[];
  
  switch (creationType) {
    case 'image_editing':
      prompts = imageEditingPrompts;
      break;
    case 'prompt_to_image':
      prompts = imagePrompts;
      break;
    case 'prompt_to_video':
      prompts = videoPrompts;
      break;
    case 'image_to_video':
      prompts = imageToVideoPrompts;
      break;
    case 'prompt_to_audio':
      prompts = audioPrompts;
      break;
    default:
      prompts = imagePrompts;
  }
  
  const index = (dayOfYear * 7 + randomOffset) % prompts.length;
  return prompts[index];
}
