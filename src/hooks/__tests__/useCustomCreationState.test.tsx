import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCustomCreationState } from '../useCustomCreationState';

// Mock dependencies
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/lib/state-persistence', () => ({
  saveCriticalId: vi.fn(),
  loadCriticalId: vi.fn(() => null),
  clearCriticalId: vi.fn(),
  verifyGeneration: vi.fn(() => Promise.resolve({ exists: false, verified: true })),
}));

describe('useCustomCreationState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useCustomCreationState());

      expect(result.current.state.prompt).toBe('');
      expect(result.current.state.selectedModel).toBeNull();
      expect(result.current.state.selectedGroup).toBe('prompt_to_image');
      expect(result.current.state.modelParameters).toEqual({});
      expect(result.current.state.localGenerating).toBe(false);
      expect(result.current.state.generatedOutput).toBeNull();
    });

    it('should load persisted state from localStorage', () => {
      const storedState = {
        selectedGroup: 'prompt_to_video',
        selectedModel: 'test-model',
        prompt: 'persisted prompt',
        modelParameters: { quality: 'HD' },
        timestamp: Date.now(),
        version: '1.1',
      };
      localStorage.setItem('customCreation_state', JSON.stringify(storedState));

      const { result } = renderHook(() => useCustomCreationState());

      expect(result.current.state.selectedGroup).toBe('prompt_to_video');
      expect(result.current.state.selectedModel).toBe('test-model');
      expect(result.current.state.prompt).toBe('persisted prompt');
      expect(result.current.state.modelParameters).toEqual({ quality: 'HD' });
    });

    it('should ignore expired state', () => {
      const expiredState = {
        selectedGroup: 'prompt_to_video',
        selectedModel: 'old-model',
        prompt: 'old prompt',
        modelParameters: {},
        timestamp: Date.now() - (8 * 24 * 60 * 60 * 1000), // 8 days ago
        version: '1.1',
      };
      localStorage.setItem('customCreation_state', JSON.stringify(expiredState));

      const { result } = renderHook(() => useCustomCreationState());

      expect(result.current.state.selectedGroup).toBe('prompt_to_image');
      expect(result.current.state.selectedModel).toBeNull();
    });

    it('should ignore state with version mismatch', () => {
      const oldVersionState = {
        selectedGroup: 'prompt_to_video',
        selectedModel: 'old-model',
        prompt: 'old prompt',
        modelParameters: {},
        timestamp: Date.now(),
        version: '1.0', // Old version
      };
      localStorage.setItem('customCreation_state', JSON.stringify(oldVersionState));

      const { result } = renderHook(() => useCustomCreationState());

      expect(result.current.state.selectedGroup).toBe('prompt_to_image');
    });
  });

  describe('state updates', () => {
    it('should update state with partial updates', () => {
      const { result } = renderHook(() => useCustomCreationState());

      act(() => {
        result.current.updateState({ prompt: 'new prompt', localGenerating: true });
      });

      expect(result.current.state.prompt).toBe('new prompt');
      expect(result.current.state.localGenerating).toBe(true);
      expect(result.current.state.selectedGroup).toBe('prompt_to_image'); // Unchanged
    });

    it('should update prompt and reset generateCaption', () => {
      const { result } = renderHook(() => useCustomCreationState());

      act(() => {
        result.current.updateState({ generateCaption: true });
      });

      expect(result.current.state.generateCaption).toBe(true);

      act(() => {
        result.current.setPrompt('updated prompt');
      });

      expect(result.current.state.prompt).toBe('updated prompt');
      expect(result.current.state.generateCaption).toBe(false);
    });

    it('should update selected model', () => {
      const { result } = renderHook(() => useCustomCreationState());

      act(() => {
        result.current.setSelectedModel('new-model');
      });

      expect(result.current.state.selectedModel).toBe('new-model');
    });

    it('should update selected group and clear model', () => {
      const { result } = renderHook(() => useCustomCreationState());

      act(() => {
        result.current.setSelectedModel('some-model');
        result.current.updateState({ prompt: 'some prompt' });
      });

      expect(result.current.state.selectedModel).toBe('some-model');

      act(() => {
        result.current.setSelectedGroup('prompt_to_video');
      });

      expect(result.current.state.selectedGroup).toBe('prompt_to_video');
      expect(result.current.state.selectedModel).toBeNull();
      expect(result.current.state.prompt).toBe('');
    });
  });

  describe('reset functions', () => {
    it('should reset all state except group and model', () => {
      const { result } = renderHook(() => useCustomCreationState());

      act(() => {
        result.current.updateState({
          prompt: 'test prompt',
          selectedModel: 'test-model',
          selectedGroup: 'prompt_to_video',
          generatedOutput: 'https://example.com/output.png',
          localGenerating: true,
        });
      });

      act(() => {
        result.current.resetState();
      });

      expect(result.current.state.prompt).toBe('');
      expect(result.current.state.selectedGroup).toBe('prompt_to_video'); // Preserved
      expect(result.current.state.selectedModel).toBe('test-model'); // Preserved
      expect(result.current.state.generatedOutput).toBeNull();
      expect(result.current.state.localGenerating).toBe(false);
    });

    it('should reset generation state only', () => {
      const { result } = renderHook(() => useCustomCreationState());

      act(() => {
        result.current.updateState({
          prompt: 'test prompt',
          selectedModel: 'test-model',
          generatedOutput: 'https://example.com/output.png',
          pollingGenerationId: 'gen-123',
          localGenerating: true,
        });
      });

      act(() => {
        result.current.resetGenerationState();
      });

      expect(result.current.state.prompt).toBe('test prompt'); // Preserved
      expect(result.current.state.selectedModel).toBe('test-model'); // Preserved
      expect(result.current.state.generatedOutput).toBeNull();
      expect(result.current.state.pollingGenerationId).toBeNull();
      expect(result.current.state.localGenerating).toBe(false);
    });
  });

  describe('persistence', () => {
    it('should persist state to localStorage on changes', async () => {
      const { result } = renderHook(() => useCustomCreationState());

      act(() => {
        result.current.updateState({ prompt: 'saved prompt' });
      });

      // Wait for useEffect to run
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      const stored = localStorage.getItem('customCreation_state');
      expect(stored).not.toBeNull();
      
      const parsed = JSON.parse(stored!);
      expect(parsed.prompt).toBe('saved prompt');
      expect(parsed.version).toBe('1.1');
    });
  });

  describe('model change protection', () => {
    it('should not clear outputs during active generation', () => {
      const { result } = renderHook(() => useCustomCreationState());

      act(() => {
        result.current.updateState({
          selectedModel: 'model-1',
          localGenerating: true,
          generatedOutput: 'https://example.com/output.png',
        });
      });

      act(() => {
        result.current.setSelectedModel('model-2');
      });

      expect(result.current.state.selectedModel).toBe('model-2');
      expect(result.current.state.generatedOutput).toBe('https://example.com/output.png'); // Preserved
    });

    it('should not clear outputs if they exist', () => {
      const { result } = renderHook(() => useCustomCreationState());

      act(() => {
        result.current.updateState({
          selectedModel: 'model-1',
          generatedOutput: 'https://example.com/output.png',
          generatedOutputs: [{ id: 'gen-1', storage_path: 'path', output_index: 0 }],
        });
      });

      act(() => {
        result.current.setSelectedModel('model-2');
      });

      expect(result.current.state.generatedOutput).toBe('https://example.com/output.png'); // Preserved
    });
  });

  describe('group change protection', () => {
    it('should not clear outputs during active generation when group changes', () => {
      const { result } = renderHook(() => useCustomCreationState());

      act(() => {
        result.current.updateState({
          selectedGroup: 'prompt_to_image',
          localGenerating: true,
          generatedOutput: 'https://example.com/output.png',
        });
      });

      act(() => {
        result.current.setSelectedGroup('prompt_to_video');
      });

      expect(result.current.state.selectedGroup).toBe('prompt_to_video');
      expect(result.current.state.generatedOutput).toBe('https://example.com/output.png'); // Preserved
    });
  });
});
