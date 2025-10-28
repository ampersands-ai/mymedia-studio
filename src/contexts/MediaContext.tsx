import { createContext, useContext, type ReactNode } from 'react';
import { type MediaContextValue } from '@/lib/media/types';

/**
 * Media Context - Dependency Injection for Buckets
 * Prevents hardcoding bucket names across the app
 */

const defaultValue: MediaContextValue = {
  buckets: {
    userContent: 'generated-content',
    templates: 'template-assets',
    voicePreviews: 'voice-previews',
  },
};

const MediaContext = createContext<MediaContextValue>(defaultValue);

export function MediaProvider({ children }: { children: ReactNode }) {
  return (
    <MediaContext.Provider value={defaultValue}>
      {children}
    </MediaContext.Provider>
  );
}

export function useMediaContext() {
  const context = useContext(MediaContext);
  if (!context) {
    throw new Error('useMediaContext must be used within MediaProvider');
  }
  return context;
}
