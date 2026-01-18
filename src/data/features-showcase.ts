import { Video, Image, Music, Film, Sparkles, Zap, Shield, CreditCard, History, Wand2 } from "lucide-react";

// Video Generation Models
export const videoModels = [
  {
    id: "veo-3",
    name: "Veo 3.1",
    provider: "Google DeepMind",
    description: "Cinematic video generation with natural motion and lighting",
    icon: "veo",
  },
  {
    id: "sora",
    name: "Sora 2",
    provider: "OpenAI",
    description: "Text-to-video with unparalleled realism and coherence",
    icon: "sora",
  },
  {
    id: "runway",
    name: "Runway Gen-3",
    provider: "Runway",
    description: "Professional-grade video effects and generation",
    icon: "runway",
  },
  {
    id: "kling",
    name: "Kling AI",
    provider: "Kuaishou",
    description: "High-fidelity video synthesis with precise control",
    icon: "kling",
  },
  {
    id: "hailuo",
    name: "Hailuo",
    provider: "MiniMax",
    description: "Fast, expressive video generation for social content",
    icon: "hailuo",
  },
  {
    id: "wan",
    name: "Wan 2.5",
    provider: "Alibaba",
    description: "Versatile video creation with multi-style support",
    icon: "wan",
  },
  {
    id: "seedance",
    name: "Seedance",
    provider: "ByteDance",
    description: "Dance and motion-focused video generation",
    icon: "seedance",
  },
];

// Image Creation Models
export const imageModels = [
  {
    id: "midjourney",
    name: "Midjourney",
    provider: "Midjourney",
    description: "Artistic, painterly images with exceptional aesthetics",
    icon: "midjourney",
  },
  {
    id: "flux",
    name: "FLUX",
    provider: "Black Forest Labs",
    description: "Photorealistic images with incredible detail",
    icon: "flux",
  },
  {
    id: "ideogram",
    name: "Ideogram",
    provider: "Ideogram",
    description: "Best-in-class text rendering in images",
    icon: "ideogram",
  },
  {
    id: "imagen",
    name: "Imagen 3",
    provider: "Google",
    description: "Google's flagship image model with natural outputs",
    icon: "imagen",
  },
  {
    id: "seedream",
    name: "Seedream",
    provider: "ByteDance",
    description: "Dreamy, artistic image generation",
    icon: "seedream",
  },
  {
    id: "grok",
    name: "Grok Imagine",
    provider: "xAI",
    description: "Unfiltered creative image generation",
    icon: "grok",
  },
  {
    id: "hidream",
    name: "HiDream",
    provider: "HiDream AI",
    description: "High-resolution artistic image creation",
    icon: "hidream",
  },
  {
    id: "qwen",
    name: "Qwen",
    provider: "Alibaba",
    description: "Versatile image generation with Chinese aesthetic",
    icon: "qwen",
  },
  {
    id: "recraft",
    name: "Recraft v3",
    provider: "Recraft",
    description: "Design-focused with vector and brand style support",
    icon: "recraft",
  },
];

// Audio & Voice Models
export const audioModels = [
  {
    id: "elevenlabs",
    name: "ElevenLabs",
    provider: "ElevenLabs",
    description: "Ultra-realistic voice cloning and text-to-speech",
    features: ["29 languages", "Voice cloning", "Emotional control", "Real-time synthesis"],
    icon: "elevenlabs",
  },
  {
    id: "suno",
    name: "Suno",
    provider: "Suno AI",
    description: "Full song generation with vocals, instruments, and lyrics",
    features: ["Any genre", "Custom lyrics", "Instrumental tracks", "Vocal styles"],
    icon: "suno",
  },
];

// Specialty Tools
export const specialtyTools = [
  {
    id: "faceless",
    name: "Faceless Video Creator",
    description: "Create viral content without showing your face. Perfect for educational channels, commentary, and storytelling.",
    features: ["Auto voiceover", "Stock footage", "Captions", "Background music"],
    isHero: true,
    icon: "faceless",
  },
  {
    id: "lyrics",
    name: "Lyric Video Generator",
    description: "Transform songs into stunning visual experiences with animated lyrics and effects.",
    features: ["Beat sync", "Typography styles", "Visual effects"],
    icon: "lyrics",
  },
  {
    id: "avatar",
    name: "Avatar & Lip-Sync",
    description: "Create AI avatars that speak and move naturally, perfect for presentations and content.",
    features: ["Custom avatars", "Multi-language", "Realistic motion"],
    icon: "avatar",
  },
];

// Video Editor Features
export const editorFeatures = [
  {
    id: "transitions",
    name: "Transitions",
    description: "Smooth cuts, fades, and creative transitions between clips",
    icon: "transitions",
  },
  {
    id: "subtitles",
    name: "Subtitles",
    description: "Auto-generated captions with customizable styles",
    icon: "subtitles",
  },
  {
    id: "backgrounds",
    name: "Backgrounds",
    description: "AI-powered background removal and replacement",
    icon: "backgrounds",
  },
  {
    id: "audio",
    name: "Audio Mix",
    description: "Layer voiceover, music, and sound effects",
    icon: "audio",
  },
];

export const aspectRatios = ["16:9", "9:16", "1:1", "4:5"];

// Platform Benefits
export const platformBenefits = [
  {
    id: "models",
    title: "30+ AI Models",
    description: "Access industry-leading models from OpenAI, Google, Runway, and more",
    icon: Sparkles,
  },
  {
    id: "api",
    title: "No API Keys",
    description: "We handle all the complexity. Just create.",
    icon: Zap,
  },
  {
    id: "commercial",
    title: "Commercial Rights",
    description: "Full ownership of everything you create",
    icon: Shield,
  },
  {
    id: "pricing",
    title: "Credit-Based Pricing",
    description: "Pay only for what you use. No subscriptions required.",
    icon: CreditCard,
  },
  {
    id: "watermarks",
    title: "No Watermarks",
    description: "Clean, professional outputs ready for publishing",
    icon: Film,
  },
  {
    id: "history",
    title: "Generation History",
    description: "Access your creations for up to 14 days after generation",
    icon: History,
  },
];

// Chapter Configuration
export const chapters = [
  { id: "intro", title: "Introduction", icon: Sparkles },
  { id: "video", title: "Video", icon: Video },
  { id: "image", title: "Image", icon: Image },
  { id: "audio", title: "Audio", icon: Music },
  { id: "tools", title: "Tools", icon: Wand2 },
  { id: "editor", title: "Editor", icon: Film },
  { id: "platform", title: "Platform", icon: Zap },
  { id: "cta", title: "Get Started", icon: Sparkles },
];
