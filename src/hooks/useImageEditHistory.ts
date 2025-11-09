import { useState, useCallback } from 'react';

export interface ImageHistoryEntry {
  id: string;
  timestamp: number;
  blob: Blob;
  url: string;
  editType: 'original' | 'cropped' | 'filtered' | 'text-overlay' | 'effects' | 'template';
  description: string;
}

export function useImageEditHistory() {
  const [history, setHistory] = useState<ImageHistoryEntry[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);

  const addToHistory = useCallback((entry: Omit<ImageHistoryEntry, 'id' | 'timestamp'>) => {
    const newEntry: ImageHistoryEntry = {
      ...entry,
      id: `history-${Date.now()}`,
      timestamp: Date.now(),
    };

    setHistory(prev => {
      // Remove any entries after current index (branching)
      const newHistory = prev.slice(0, currentIndex + 1);
      return [...newHistory, newEntry];
    });
    
    setCurrentIndex(prev => prev + 1);
  }, [currentIndex]);

  const goToHistoryEntry = useCallback((index: number) => {
    if (index >= 0 && index < history.length) {
      setCurrentIndex(index);
      return history[index];
    }
    return null;
  }, [history]);

  const undo = useCallback(() => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      return history[newIndex];
    }
    return null;
  }, [currentIndex, history]);

  const redo = useCallback(() => {
    if (currentIndex < history.length - 1) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      return history[newIndex];
    }
    return null;
  }, [currentIndex, history]);

  const clearHistory = useCallback(() => {
    // Clean up blob URLs
    history.forEach(entry => {
      if (entry.url.startsWith('blob:')) {
        URL.revokeObjectURL(entry.url);
      }
    });
    setHistory([]);
    setCurrentIndex(-1);
  }, [history]);

  const getCurrentEntry = useCallback(() => {
    if (currentIndex >= 0 && currentIndex < history.length) {
      return history[currentIndex];
    }
    return null;
  }, [currentIndex, history]);

  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < history.length - 1;

  return {
    history,
    currentIndex,
    addToHistory,
    goToHistoryEntry,
    undo,
    redo,
    clearHistory,
    getCurrentEntry,
    canUndo,
    canRedo,
  };
}
