import { describe, it, expect } from 'vitest';
import { validateScenesComplete, hasInsufficientCredits } from '../storyboard-validation';
import { createMockScene } from './test-helpers';

describe('validateScenesComplete', () => {
  describe('valid scenes', () => {
    it('should validate a single complete scene', () => {
      const scenes = [createMockScene()];
      const result = validateScenesComplete(scenes);
      expect(result.isValid).toBe(true);
      expect(result.incompleteScene).toBeUndefined();
    });

    it('should validate multiple complete scenes', () => {
      const scenes = [
        createMockScene({ order_number: 1 }),
        createMockScene({ order_number: 2 }),
        createMockScene({ order_number: 3 }),
      ];
      const result = validateScenesComplete(scenes);
      expect(result.isValid).toBe(true);
      expect(result.incompleteScene).toBeUndefined();
    });

    it('should validate empty array', () => {
      const result = validateScenesComplete([]);
      expect(result.isValid).toBe(true);
      expect(result.incompleteScene).toBeUndefined();
    });
  });

  describe('missing voice_over_text', () => {
    it('should detect scene without voice_over_text', () => {
      const scenes = [createMockScene({ voice_over_text: '' })];
      const result = validateScenesComplete(scenes);
      expect(result.isValid).toBe(false);
      expect(result.incompleteScene).toBeDefined();
    });

    it('should find first incomplete scene in array', () => {
      const scenes = [
        createMockScene({ order_number: 1 }),
        createMockScene({ order_number: 2, voice_over_text: '' }),
        createMockScene({ order_number: 3 }),
      ];
      const result = validateScenesComplete(scenes);
      expect(result.isValid).toBe(false);
      expect(result.incompleteScene?.order_number).toBe(2);
    });

    it('should detect null voice_over_text', () => {
      const scenes = [createMockScene({ voice_over_text: null as unknown as string })];
      const result = validateScenesComplete(scenes);
      expect(result.isValid).toBe(false);
    });

    it('should detect undefined voice_over_text', () => {
      const scenes = [createMockScene({ voice_over_text: undefined as unknown as string })];
      const result = validateScenesComplete(scenes);
      expect(result.isValid).toBe(false);
    });
  });

  describe('missing image_prompt', () => {
    it('should detect scene without image_prompt', () => {
      const scenes = [createMockScene({ image_prompt: '' })];
      const result = validateScenesComplete(scenes);
      expect(result.isValid).toBe(false);
      expect(result.incompleteScene).toBeDefined();
    });

    it('should find scene with missing image_prompt', () => {
      const scenes = [
        createMockScene({ order_number: 1 }),
        createMockScene({ order_number: 2 }),
        createMockScene({ order_number: 3, image_prompt: '' }),
      ];
      const result = validateScenesComplete(scenes);
      expect(result.isValid).toBe(false);
      expect(result.incompleteScene?.order_number).toBe(3);
    });

    it('should detect null image_prompt', () => {
      const scenes = [createMockScene({ image_prompt: null as unknown as string })];
      const result = validateScenesComplete(scenes);
      expect(result.isValid).toBe(false);
    });
  });

  describe('both fields missing', () => {
    it('should detect scene with both fields missing', () => {
      const scenes = [createMockScene({ voice_over_text: '', image_prompt: '' })];
      const result = validateScenesComplete(scenes);
      expect(result.isValid).toBe(false);
      expect(result.incompleteScene).toBeDefined();
    });
  });
});

describe('hasInsufficientCredits', () => {
  describe('sufficient credits', () => {
    it('should return false when balance equals cost', () => {
      expect(hasInsufficientCredits(10, 10)).toBe(false);
    });

    it('should return false when balance exceeds cost', () => {
      expect(hasInsufficientCredits(100, 10)).toBe(false);
    });

    it('should return false for zero cost', () => {
      expect(hasInsufficientCredits(0, 0)).toBe(false);
    });

    it('should return false for large balance', () => {
      expect(hasInsufficientCredits(10000, 50)).toBe(false);
    });
  });

  describe('insufficient credits', () => {
    it('should return true when balance is below cost', () => {
      expect(hasInsufficientCredits(5, 10)).toBe(true);
    });

    it('should return true when balance is zero', () => {
      expect(hasInsufficientCredits(0, 10)).toBe(true);
    });

    it('should return true for fractional difference', () => {
      expect(hasInsufficientCredits(9.5, 10)).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle negative balance', () => {
      expect(hasInsufficientCredits(-10, 10)).toBe(true);
    });

    it('should handle negative cost (unexpected but possible)', () => {
      expect(hasInsufficientCredits(10, -5)).toBe(false);
    });

    it('should handle very small differences', () => {
      expect(hasInsufficientCredits(9.999999, 10)).toBe(true);
    });

    it('should handle floating point precision', () => {
      // 0.1 + 0.2 !== 0.3 in JavaScript
      expect(hasInsufficientCredits(0.1 + 0.2, 0.3)).toBe(false);
    });
  });
});
