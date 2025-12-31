import { describe, it, expect } from 'vitest';
import {
  countCharacters,
  getInitialEstimate,
  calculateRenderCost,
} from '../storyboard-cost-utils';
import { createMockStoryboard, createMockScene } from './test-helpers';

describe('countCharacters', () => {
  describe('basic counting', () => {
    it('should count characters in simple string', () => {
      expect(countCharacters('hello')).toBe(5);
    });

    it('should count characters in longer text', () => {
      expect(countCharacters('This is a longer text with more characters.')).toBe(44);
    });

    it('should count spaces as characters', () => {
      expect(countCharacters('a b c')).toBe(5);
    });
  });

  describe('trimming behavior', () => {
    it('should trim leading whitespace', () => {
      expect(countCharacters('   hello')).toBe(5);
    });

    it('should trim trailing whitespace', () => {
      expect(countCharacters('hello   ')).toBe(5);
    });

    it('should trim both leading and trailing whitespace', () => {
      expect(countCharacters('   hello   ')).toBe(5);
    });

    it('should NOT trim internal whitespace', () => {
      expect(countCharacters('   hello world   ')).toBe(11);
    });
  });

  describe('edge cases', () => {
    it('should return 0 for empty string', () => {
      expect(countCharacters('')).toBe(0);
    });

    it('should return 0 for whitespace-only string', () => {
      expect(countCharacters('   ')).toBe(0);
    });

    it('should return 0 for null/undefined', () => {
      expect(countCharacters(null as unknown as string)).toBe(0);
      expect(countCharacters(undefined as unknown as string)).toBe(0);
    });

    it('should handle special characters', () => {
      expect(countCharacters('héllo 🌍')).toBe(8);
    });

    it('should handle newlines', () => {
      expect(countCharacters('hello\nworld')).toBe(11);
    });
  });
});

describe('getInitialEstimate', () => {
  describe('valid estimates', () => {
    it('should return estimated_render_cost when valid', () => {
      const storyboard = createMockStoryboard({ estimated_render_cost: 10, duration: 40 });
      expect(getInitialEstimate(storyboard)).toBe(10);
    });

    it('should return estimate for reasonable values', () => {
      const storyboard = createMockStoryboard({ estimated_render_cost: 25, duration: 100 });
      expect(getInitialEstimate(storyboard)).toBe(25);
    });
  });

  describe('invalid estimates - use expected estimate', () => {
    it('should use expected estimate when rawEstimate is 0', () => {
      const storyboard = createMockStoryboard({ estimated_render_cost: 0, duration: 40 });
      // expectedEstimate = 40 * 0.25 = 10
      expect(getInitialEstimate(storyboard)).toBe(10);
    });

    it('should use expected estimate when rawEstimate is negative', () => {
      const storyboard = createMockStoryboard({ estimated_render_cost: -5, duration: 40 });
      expect(getInitialEstimate(storyboard)).toBe(10);
    });

    it('should use expected estimate when rawEstimate is NaN', () => {
      const storyboard = createMockStoryboard({ estimated_render_cost: NaN, duration: 40 });
      expect(getInitialEstimate(storyboard)).toBe(10);
    });

    it('should use expected estimate when rawEstimate is Infinity', () => {
      const storyboard = createMockStoryboard({ estimated_render_cost: Infinity, duration: 40 });
      expect(getInitialEstimate(storyboard)).toBe(10);
    });

    it('should use expected estimate when rawEstimate is too high (10x expected)', () => {
      const storyboard = createMockStoryboard({ estimated_render_cost: 1000, duration: 40 });
      // expectedEstimate = 40 * 0.25 = 10
      // rawEstimate 1000 > max(100, 10 * 10) = 100, so use expected
      expect(getInitialEstimate(storyboard)).toBe(10);
    });
  });

  describe('edge cases', () => {
    it('should handle null storyboard values', () => {
      const storyboard = { ...createMockStoryboard(), estimated_render_cost: null as unknown as number };
      // Falls back to expectedEstimate
      expect(getInitialEstimate(storyboard)).toBe(7.5); // 30 * 0.25
    });

    it('should handle undefined duration', () => {
      const storyboard = { ...createMockStoryboard(), duration: undefined as unknown as number };
      // duration || 0 = 0, so expectedEstimate = 0
      expect(getInitialEstimate(storyboard)).toBe(7.5);
    });

    it('should handle zero duration', () => {
      const storyboard = createMockStoryboard({ duration: 0, estimated_render_cost: 0 });
      // expectedEstimate = 0, rawEstimate = 0 is invalid, returns 0
      expect(getInitialEstimate(storyboard)).toBe(0);
    });
  });
});

describe('calculateRenderCost', () => {
  describe('no character changes', () => {
    it('should return initial estimate when characters unchanged', () => {
      const storyboard = createMockStoryboard({
        intro_voiceover_text: 'Hello world',
        original_character_count: 11, // 'Hello world'.length
      });
      const scenes = [] as ReturnType<typeof createMockScene>[];
      const result = calculateRenderCost(storyboard, scenes, 10);
      expect(result.cost).toBe(10);
      expect(result.charDifference).toBe(0);
    });

    it('should handle small changes (< 100 chars)', () => {
      const storyboard = createMockStoryboard({
        intro_voiceover_text: 'Hello world', // 11 chars
        original_character_count: 50,
      });
      const scenes = [] as ReturnType<typeof createMockScene>[];
      const result = calculateRenderCost(storyboard, scenes, 10);
      // charDifference = 11 - 50 = -39 (not enough to trigger reduction)
      expect(result.cost).toBe(10);
      expect(result.charDifference).toBe(-39);
    });
  });

  describe('character increase (script grew)', () => {
    it('should add 0.25 credits per 100 chars increased', () => {
      const storyboard = createMockStoryboard({
        intro_voiceover_text: 'A'.repeat(200), // 200 chars
        original_character_count: 0,
      });
      const scenes = [] as ReturnType<typeof createMockScene>[];
      const result = calculateRenderCost(storyboard, scenes, 10);
      // charDifference = 200 - 0 = 200
      // additionalChunks = floor(200/100) = 2
      // cost = 10 + (2 * 0.25) = 10.5
      expect(result.cost).toBe(10.5);
      expect(result.charDifference).toBe(200);
    });

    it('should handle partial chunks (150 chars = 1 chunk)', () => {
      const storyboard = createMockStoryboard({
        intro_voiceover_text: 'A'.repeat(150),
        original_character_count: 0,
      });
      const scenes = [] as ReturnType<typeof createMockScene>[];
      const result = calculateRenderCost(storyboard, scenes, 10);
      // charDifference = 150, additionalChunks = floor(150/100) = 1
      expect(result.cost).toBe(10.25);
    });

    it('should include scene voiceover text', () => {
      const storyboard = createMockStoryboard({
        intro_voiceover_text: 'A'.repeat(50),
        original_character_count: 0,
      });
      const scenes = [
        createMockScene({ voice_over_text: 'B'.repeat(100) }),
        createMockScene({ voice_over_text: 'C'.repeat(100) }),
      ];
      const result = calculateRenderCost(storyboard, scenes, 10);
      // total = 50 + 100 + 100 = 250
      // charDifference = 250, additionalChunks = floor(250/100) = 2
      expect(result.cost).toBe(10.5);
      expect(result.charDifference).toBe(250);
    });
  });

  describe('character decrease (script shrunk)', () => {
    it('should reduce 0.25 credits per 100 chars decreased', () => {
      const storyboard = createMockStoryboard({
        intro_voiceover_text: '',
        original_character_count: 200,
      });
      const scenes = [] as ReturnType<typeof createMockScene>[];
      const result = calculateRenderCost(storyboard, scenes, 10);
      // charDifference = 0 - 200 = -200
      // reducedChunks = floor(200/100) = 2
      // cost = 10 - (2 * 0.25) = 9.5
      expect(result.cost).toBe(9.5);
      expect(result.charDifference).toBe(-200);
    });

    it('should not go below 0 cost', () => {
      const storyboard = createMockStoryboard({
        intro_voiceover_text: '',
        original_character_count: 10000,
      });
      const scenes = [] as ReturnType<typeof createMockScene>[];
      const result = calculateRenderCost(storyboard, scenes, 5);
      // charDifference = -10000, reducedChunks = 100
      // cost = 5 - (100 * 0.25) = -20 -> clamped to 0
      expect(result.cost).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle null intro_voiceover_text', () => {
      const storyboard = {
        ...createMockStoryboard(),
        intro_voiceover_text: null as unknown as string,
        original_character_count: 0,
      };
      const scenes = [] as ReturnType<typeof createMockScene>[];
      const result = calculateRenderCost(storyboard, scenes, 10);
      expect(result.cost).toBe(10);
    });

    it('should handle null voice_over_text in scenes', () => {
      const storyboard = createMockStoryboard({
        intro_voiceover_text: '',
        original_character_count: 0,
      });
      const scenes = [
        createMockScene({ voice_over_text: null as unknown as string }),
      ];
      const result = calculateRenderCost(storyboard, scenes, 10);
      expect(result.cost).toBe(10);
    });

    it('should use currentTotalChars as fallback for missing original_character_count', () => {
      const storyboard = createMockStoryboard({
        intro_voiceover_text: 'Hello',
      });
      // Remove original_character_count to test fallback
      delete (storyboard as Record<string, unknown>).original_character_count;
      
      const scenes = [] as ReturnType<typeof createMockScene>[];
      const result = calculateRenderCost(storyboard, scenes, 10);
      // Should use currentTotalChars (5) as original, so difference = 0
      expect(result.charDifference).toBe(0);
      expect(result.cost).toBe(10);
    });
  });
});
