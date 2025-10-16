export const EXAMPLE_PROMPTS: Record<string, string> = {
  'portrait-headshots': 'Professional headshot of a confident business executive in modern office, natural lighting, sharp focus, high quality',
  'product-photos': 'Luxury watch on marble surface with dramatic lighting, commercial photography style, ultra detailed',
  'social-media-content': 'Vibrant product reveal with smooth camera movement, trending style, eye-catching colors, modern aesthetic',
  'video-creation': 'Dynamic cinematic video with smooth transitions, professional color grading, engaging storytelling',
  'audio-processing': 'Clear, professional voiceover with warm tone, studio quality, natural delivery',
  'creative-design': 'Modern minimalist design with bold typography, vibrant color palette, clean composition',
  'photo-editing': 'Enhanced portrait with natural skin tones, perfect lighting, professional retouching',
  'text-generation': 'Compelling marketing copy that engages readers, clear value proposition, conversational tone'
};

export const getExamplePrompt = (templateId: string): string => {
  return EXAMPLE_PROMPTS[templateId] || 'Create something amazing with AI';
};
