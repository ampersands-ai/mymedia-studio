// Central voice database for ElevenLabs voices
// Single source of truth for all voice data across the application

export interface VoiceData {
  voice_id: string;        // For direct API calls and audio previews
  name: string;            // For model parameters and display
  gender: 'male' | 'female' | 'neutral';
  accent: string;
  use_case: string;
  description?: string;
  hasPreview?: boolean;    // Whether audio preview is available
}

// All 20 ElevenLabs voices with complete metadata
export const VOICE_DATABASE: VoiceData[] = [
  { voice_id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', gender: 'female', accent: 'American', use_case: 'narration', description: 'Calm and clear American female voice', hasPreview: false },
  { voice_id: '9BWtsMINqrJLrRacOk9x', name: 'Aria', gender: 'female', accent: 'American', use_case: 'narration', description: 'Expressive and warm female voice', hasPreview: false },
  { voice_id: 'CwhRBWXzGAHq8TQ4Fs17', name: 'Roger', gender: 'male', accent: 'American', use_case: 'narration', description: 'Confident and authoritative male voice', hasPreview: true },
  { voice_id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', gender: 'female', accent: 'American', use_case: 'narration', description: 'Soft and friendly female voice', hasPreview: true },
  { voice_id: 'FGY2WhTYpPnrIDTdsKH5', name: 'Laura', gender: 'female', accent: 'American', use_case: 'narration', description: 'Professional and articulate female voice', hasPreview: true },
  { voice_id: 'IKne3meq5aSn9XLyUdCD', name: 'Charlie', gender: 'male', accent: 'British', use_case: 'conversational', description: 'Casual and friendly British male voice', hasPreview: true },
  { voice_id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George', gender: 'male', accent: 'British', use_case: 'narration', description: 'Distinguished British male voice', hasPreview: true },
  { voice_id: 'N2lVS1w4EtoT3dr4eOWO', name: 'Callum', gender: 'male', accent: 'American', use_case: 'narration', description: 'Deep and resonant male voice', hasPreview: true },
  { voice_id: 'SAz9YHcvj6GT2YYXdXww', name: 'River', gender: 'neutral', accent: 'American', use_case: 'narration', description: 'Versatile and balanced voice', hasPreview: true },
  { voice_id: 'TX3LPaxmHKxFdv7VOQHJ', name: 'Liam', gender: 'male', accent: 'American', use_case: 'narration', description: 'Young and energetic male voice', hasPreview: true },
  { voice_id: 'XB0fDUnXU5powFXDhCwa', name: 'Charlotte', gender: 'female', accent: 'British', use_case: 'narration', description: 'Elegant British female voice', hasPreview: false },
  { voice_id: 'Xb7hH8MSUJpSbSDYk0k2', name: 'Alice', gender: 'female', accent: 'British', use_case: 'narration', description: 'Clear and articulate British female voice', hasPreview: true },
  { voice_id: 'XrExE9yKIg1WjnnlVkGX', name: 'Matilda', gender: 'female', accent: 'American', use_case: 'narration', description: 'Warm and engaging female voice', hasPreview: true },
  { voice_id: 'bIHbv24MWmeRgasZH58o', name: 'Will', gender: 'male', accent: 'American', use_case: 'narration', description: 'Strong and steady male voice', hasPreview: true },
  { voice_id: 'cgSgspJ2msm6clMCkdW9', name: 'Jessica', gender: 'female', accent: 'American', use_case: 'conversational', description: 'Bright and enthusiastic female voice', hasPreview: true },
  { voice_id: 'cjVigY5qzO86Huf0OWal', name: 'Eric', gender: 'male', accent: 'American', use_case: 'narration', description: 'Mature and authoritative male voice', hasPreview: true },
  { voice_id: 'iP95p4xoKVk53GoZ742B', name: 'Chris', gender: 'male', accent: 'American', use_case: 'conversational', description: 'Casual and relatable male voice', hasPreview: true },
  { voice_id: 'nPczCjzI2devNBz1zQrb', name: 'Brian', gender: 'male', accent: 'American', use_case: 'narration', description: 'Professional and clear male voice', hasPreview: true },
  { voice_id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel', gender: 'male', accent: 'British', use_case: 'narration', description: 'Deep and commanding British male voice', hasPreview: true },
  { voice_id: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily', gender: 'female', accent: 'British', use_case: 'narration', description: 'Youthful and expressive British female voice', hasPreview: true },
  { voice_id: 'pqHfZKP75CvOlQylNhV4', name: 'Bill', gender: 'male', accent: 'American', use_case: 'narration', description: 'Rich and powerful male voice', hasPreview: true },
];

// Helper functions for voice lookups

export const getVoiceById = (id: string): VoiceData | undefined => {
  return VOICE_DATABASE.find(v => v.voice_id === id);
};

export const getVoiceByName = (name: string): VoiceData | undefined => {
  return VOICE_DATABASE.find(v => v.name.toLowerCase() === name.toLowerCase());
};

export const getVoiceIdFromName = (name: string): string | undefined => {
  return getVoiceByName(name)?.voice_id;
};

export const getVoiceNameFromId = (id: string): string | undefined => {
  return getVoiceById(id)?.name;
};

export const getAllVoiceNames = (): string[] => {
  return VOICE_DATABASE.map(v => v.name);
};

export const getAllVoiceIds = (): string[] => {
  return VOICE_DATABASE.map(v => v.voice_id);
};

export const isElevenLabsVoice = (name: string): boolean => {
  return getVoiceByName(name) !== undefined;
};
