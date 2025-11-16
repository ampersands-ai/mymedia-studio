import { useCallback } from 'react';

interface DraftData {
  prompt: string;
  timestamp: number;
  page: string;
  additionalData?: Record<string, any>;
}

export const useDraftPersistence = (page: string) => {
  const STORAGE_KEY = `draft_${page}`;
  const EXPIRY_HOURS = 24;

  const saveDraft = useCallback((data: Omit<DraftData, 'timestamp' | 'page'>) => {
    const draft: DraftData = {
      ...data,
      timestamp: Date.now(),
      page,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  }, [page, STORAGE_KEY]);

  const loadDraft = useCallback((): DraftData | null => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    try {
      const draft: DraftData = JSON.parse(stored);
      const age = Date.now() - draft.timestamp;
      const maxAge = EXPIRY_HOURS * 60 * 60 * 1000;

      if (age > maxAge) {
        clearDraft();
        return null;
      }

      return draft;
    } catch {
      return null;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [STORAGE_KEY]);

  const clearDraft = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
  }, [STORAGE_KEY]);

  return { saveDraft, loadDraft, clearDraft };
};
