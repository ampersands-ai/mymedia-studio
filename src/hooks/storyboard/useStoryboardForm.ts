import { useState, useEffect } from 'react';
import type { MediaType } from '@/types/video';

const DRAFT_KEY = 'storyboardInputDraft';

export interface StoryboardFormState {
  topic: string;
  duration: number;
  style: string;
  tone: string;
  voiceID: string;
  voiceName: string;
  mediaType: MediaType;
  backgroundMusicUrl: string;
  backgroundMusicVolume: number;
  aspectRatio: string;
  videoQuality: string;
  customWidth: number;
  customHeight: number;
  subtitleLanguage: string;
  subtitleModel: string;
  subtitleStyle: string;
  subtitleFontFamily: string;
  subtitlePosition: string;
  subtitleFontSize: number;
  subtitleAllCaps: boolean;
  subtitleBoxColor: string;
  subtitleLineColor: string;
  subtitleWordColor: string;
  subtitleOutlineColor: string;
  subtitleOutlineWidth: number;
  subtitleShadowColor: string;
  subtitleShadowOffset: number;
  subtitleMaxWordsPerLine: number;
  musicVolume: number;
  musicFadeIn: number;
  musicFadeOut: number;
  imageZoom: number;
  imagePosition: string;
  enableCache: boolean;
  draftMode: boolean;
}

const loadDraft = (): Partial<StoryboardFormState> | null => {
  try {
    const draft = localStorage.getItem(DRAFT_KEY);
    return draft ? JSON.parse(draft) : null;
  } catch {
    return null;
  }
};

const getInitialState = (): StoryboardFormState => {
  const draft = loadDraft();
  const validQualities = ['low', 'medium', 'high'];
  const draftQuality = draft?.videoQuality && validQualities.includes(draft.videoQuality) ? draft.videoQuality : 'high';

  return {
    topic: draft?.topic || '',
    duration: draft?.duration || 60,
    style: draft?.style || 'hyper-realistic',
    tone: draft?.tone || 'engaging',
    voiceID: draft?.voiceID || 'en-US-TonyNeural',
    voiceName: draft?.voiceName || 'Tony',
    mediaType: draft?.mediaType || 'image',
    backgroundMusicUrl: draft?.backgroundMusicUrl || '',
    backgroundMusicVolume: draft?.backgroundMusicVolume || 5,
    aspectRatio: draft?.aspectRatio || 'instagram-story',
    videoQuality: draftQuality,
    customWidth: draft?.customWidth || 1920,
    customHeight: draft?.customHeight || 1080,
    subtitleLanguage: draft?.subtitleLanguage || 'auto',
    subtitleModel: draft?.subtitleModel || 'default',
    subtitleStyle: draft?.subtitleStyle || 'boxed-word',
    subtitleFontFamily: draft?.subtitleFontFamily || 'Oswald Bold',
    subtitlePosition: draft?.subtitlePosition || 'mid-bottom-center',
    subtitleFontSize: draft?.subtitleFontSize || 140,
    subtitleAllCaps: draft?.subtitleAllCaps ?? false,
    subtitleBoxColor: draft?.subtitleBoxColor || '#000000',
    subtitleLineColor: draft?.subtitleLineColor || '#FFFFFF',
    subtitleWordColor: draft?.subtitleWordColor || '#FFFF00',
    subtitleOutlineColor: draft?.subtitleOutlineColor || '#000000',
    subtitleOutlineWidth: draft?.subtitleOutlineWidth || 8,
    subtitleShadowColor: draft?.subtitleShadowColor || '#000000',
    subtitleShadowOffset: draft?.subtitleShadowOffset || 0,
    subtitleMaxWordsPerLine: draft?.subtitleMaxWordsPerLine || 4,
    musicVolume: draft?.musicVolume || 0.05,
    musicFadeIn: draft?.musicFadeIn || 2,
    musicFadeOut: draft?.musicFadeOut || 2,
    imageZoom: draft?.imageZoom || 2,
    imagePosition: draft?.imagePosition || 'center-center',
    enableCache: draft?.enableCache ?? true,
    draftMode: draft?.draftMode ?? false,
  };
};

export const useStoryboardForm = () => {
  const [formState, setFormState] = useState<StoryboardFormState>(getInitialState);

  // Save draft to localStorage (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(formState));
    }, 500);
    return () => clearTimeout(timer);
  }, [formState]);

  const updateField = <K extends keyof StoryboardFormState>(
    field: K,
    value: StoryboardFormState[K]
  ) => {
    setFormState(prev => ({ ...prev, [field]: value }));
  };

  const estimatedRenderCost = formState.duration * 0.25;
  const canGenerate = formState.topic.length >= 5 && formState.topic.length <= 500;

  return {
    formState,
    updateField,
    estimatedRenderCost,
    canGenerate,
  };
};
