import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mapAspectRatioToModelParameters, getAspectRatioDimensions } from '../aspect-ratio-mapper';

// Mock the logger to prevent console output
vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

describe('mapAspectRatioToModelParameters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('null/undefined handling', () => {
    it('should return empty object for null aspect ratio', () => {
      expect(mapAspectRatioToModelParameters(null, {})).toEqual({});
    });

    it('should return empty object for undefined aspect ratio', () => {
      expect(mapAspectRatioToModelParameters(undefined, {})).toEqual({});
    });

    it('should return empty object for unknown aspect ratio', () => {
      expect(mapAspectRatioToModelParameters('unknown-ratio', {})).toEqual({});
    });
  });

  describe('aspectRatio parameter (Midjourney, FLUX)', () => {
    it('should map HD to 16:9 aspectRatio', () => {
      const schema = { properties: { aspectRatio: { type: 'string' } } };
      const result = mapAspectRatioToModelParameters('hd', schema);
      expect(result.aspectRatio).toBe('16:9');
      expect(result.aspect_ratio).toBe('16:9');
    });

    it('should map squared to 1:1 aspectRatio', () => {
      const schema = { properties: { aspect_ratio: { type: 'string' } } };
      const result = mapAspectRatioToModelParameters('squared', schema);
      expect(result.aspectRatio).toBe('1:1');
    });

    it('should map instagram-story to 9:16', () => {
      const schema = { properties: { aspectRatio: { type: 'string' } } };
      const result = mapAspectRatioToModelParameters('instagram-story', schema);
      expect(result.aspectRatio).toBe('9:16');
    });

    it('should map sd to 4:3', () => {
      const schema = { properties: { aspectRatio: { type: 'string' } } };
      const result = mapAspectRatioToModelParameters('sd', schema);
      expect(result.aspectRatio).toBe('4:3');
    });

    it('should map instagram-feed to 4:5', () => {
      const schema = { properties: { aspectRatio: { type: 'string' } } };
      const result = mapAspectRatioToModelParameters('instagram-feed', schema);
      expect(result.aspectRatio).toBe('4:5');
    });
  });

  describe('image_size parameter (Seedream)', () => {
    it('should map HD to landscape_16_9', () => {
      const schema = { properties: { image_size: { type: 'string' } } };
      const result = mapAspectRatioToModelParameters('hd', schema);
      expect(result.image_size).toBe('landscape_16_9');
    });

    it('should map squared to square', () => {
      const schema = { properties: { image_size: { type: 'string' } } };
      const result = mapAspectRatioToModelParameters('squared', schema);
      expect(result.image_size).toBe('square');
    });

    it('should map instagram-story to portrait_16_9', () => {
      const schema = { properties: { image_size: { type: 'string' } } };
      const result = mapAspectRatioToModelParameters('instagram-story', schema);
      expect(result.image_size).toBe('portrait_16_9');
    });

    it('should map sd to landscape_4_3', () => {
      const schema = { properties: { image_size: { type: 'string' } } };
      const result = mapAspectRatioToModelParameters('sd', schema);
      expect(result.image_size).toBe('landscape_4_3');
    });

    it('should map instagram-feed to portrait_4_5', () => {
      const schema = { properties: { image_size: { type: 'string' } } };
      const result = mapAspectRatioToModelParameters('instagram-feed', schema);
      expect(result.image_size).toBe('portrait_4_5');
    });
  });

  describe('width/height parameters (Runware, legacy)', () => {
    it('should map HD to 1920x1080', () => {
      const schema = { properties: { width: { type: 'number' }, height: { type: 'number' } } };
      const result = mapAspectRatioToModelParameters('hd', schema);
      expect(result.width).toBe(1920);
      expect(result.height).toBe(1080);
    });

    it('should map squared to 1024x1024', () => {
      const schema = { properties: { width: { type: 'number' }, height: { type: 'number' } } };
      const result = mapAspectRatioToModelParameters('squared', schema);
      expect(result.width).toBe(1024);
      expect(result.height).toBe(1024);
    });

    it('should map instagram-story to 1080x1920', () => {
      const schema = { properties: { width: { type: 'number' }, height: { type: 'number' } } };
      const result = mapAspectRatioToModelParameters('instagram-story', schema);
      expect(result.width).toBe(1080);
      expect(result.height).toBe(1920);
    });

    it('should map sd to 1024x768', () => {
      const schema = { properties: { width: { type: 'number' }, height: { type: 'number' } } };
      const result = mapAspectRatioToModelParameters('sd', schema);
      expect(result.width).toBe(1024);
      expect(result.height).toBe(768);
    });

    it('should map instagram-feed to 1080x1350', () => {
      const schema = { properties: { width: { type: 'number' }, height: { type: 'number' } } };
      const result = mapAspectRatioToModelParameters('instagram-feed', schema);
      expect(result.width).toBe(1080);
      expect(result.height).toBe(1350);
    });
  });

  describe('size parameter (single string)', () => {
    it('should map HD to "1920x1080" string', () => {
      const schema = { properties: { size: { type: 'string' } } };
      const result = mapAspectRatioToModelParameters('hd', schema);
      expect(result.size).toBe('1920x1080');
    });

    it('should map squared to "1024x1024" string', () => {
      const schema = { properties: { size: { type: 'string' } } };
      const result = mapAspectRatioToModelParameters('squared', schema);
      expect(result.size).toBe('1024x1024');
    });
  });

  describe('fallback behavior (no recognized parameter)', () => {
    it('should return dimensions when no recognized parameter exists', () => {
      const schema = { properties: { unknown_param: { type: 'string' } } };
      const result = mapAspectRatioToModelParameters('hd', schema);
      expect(result.width).toBe(1920);
      expect(result.height).toBe(1080);
    });

    it('should return dimensions for empty schema', () => {
      const result = mapAspectRatioToModelParameters('squared', {});
      expect(result.width).toBe(1024);
      expect(result.height).toBe(1024);
    });
  });

  describe('full-hd aspect ratio', () => {
    it('should treat full-hd same as hd (16:9)', () => {
      const schema = { properties: { aspectRatio: { type: 'string' } } };
      const result = mapAspectRatioToModelParameters('full-hd', schema);
      expect(result.aspectRatio).toBe('16:9');
    });
  });
});

describe('getAspectRatioDimensions', () => {
  describe('standard aspect ratios', () => {
    it('should return 1920x1080 for hd', () => {
      expect(getAspectRatioDimensions('hd')).toEqual({ width: 1920, height: 1080 });
    });

    it('should return 1920x1080 for full-hd', () => {
      expect(getAspectRatioDimensions('full-hd')).toEqual({ width: 1920, height: 1080 });
    });

    it('should return 1024x768 for sd', () => {
      expect(getAspectRatioDimensions('sd')).toEqual({ width: 1024, height: 768 });
    });

    it('should return 1024x1024 for squared', () => {
      expect(getAspectRatioDimensions('squared')).toEqual({ width: 1024, height: 1024 });
    });

    it('should return 1080x1920 for instagram-story', () => {
      expect(getAspectRatioDimensions('instagram-story')).toEqual({ width: 1080, height: 1920 });
    });

    it('should return 1080x1350 for instagram-feed', () => {
      expect(getAspectRatioDimensions('instagram-feed')).toEqual({ width: 1080, height: 1350 });
    });
  });

  describe('fallback handling', () => {
    it('should return 1920x1080 for null', () => {
      expect(getAspectRatioDimensions(null)).toEqual({ width: 1920, height: 1080 });
    });

    it('should return 1920x1080 for undefined', () => {
      expect(getAspectRatioDimensions(undefined)).toEqual({ width: 1920, height: 1080 });
    });

    it('should return 1920x1080 for unknown ratio', () => {
      expect(getAspectRatioDimensions('unknown-ratio')).toEqual({ width: 1920, height: 1080 });
    });
  });
});
