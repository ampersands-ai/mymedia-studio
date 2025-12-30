import { describe, it, expect } from 'vitest';
import { 
  getDisplayableParameters, 
  getDisplayableParametersString 
} from './parameterDisplayFilter';

describe('parameterDisplayFilter', () => {
  describe('getDisplayableParameters', () => {
    it('returns empty array for null settings', () => {
      expect(getDisplayableParameters(null, null)).toEqual([]);
    });

    it('returns empty array for undefined settings', () => {
      expect(getDisplayableParameters(undefined, null)).toEqual([]);
    });

    it('returns empty array for empty settings object', () => {
      expect(getDisplayableParameters({}, null)).toEqual([]);
    });

    it('filters out system parameters', () => {
      const settings = {
        prompt: 'test prompt',
        _webhook_token: 'secret',
        resolution: '1080p',
        userId: 'user-123',
        aspect_ratio: '16:9'
      };
      const result = getDisplayableParameters(settings, null);
      
      // System params should be filtered
      expect(result.find(p => p.key === 'prompt')).toBeUndefined();
      expect(result.find(p => p.key === '_webhook_token')).toBeUndefined();
      expect(result.find(p => p.key === 'userId')).toBeUndefined();
      
      // Valid params should be present
      expect(result.find(p => p.key === 'resolution')).toBeDefined();
      expect(result.find(p => p.key === 'aspect_ratio')).toBeDefined();
    });

    it('filters out common hidden parameters when no schema', () => {
      const settings = {
        seed: 12345,
        guidance_scale: 7.5,
        aspect_ratio: '16:9',
        duration: '5s'
      };
      const result = getDisplayableParameters(settings, null);
      
      // Common hidden params filtered
      expect(result.find(p => p.key === 'seed')).toBeUndefined();
      expect(result.find(p => p.key === 'guidance_scale')).toBeUndefined();
      
      // Valid params present
      expect(result.find(p => p.key === 'aspect_ratio')).toBeDefined();
      expect(result.find(p => p.key === 'duration')).toBeDefined();
    });

    it('formats labels correctly (snake_case to Title Case)', () => {
      const settings = { 
        aspect_ratio: '16:9', 
        output_format: 'PNG',
        video_length: '10s'
      };
      const result = getDisplayableParameters(settings, null);
      
      expect(result.find(p => p.key === 'aspect_ratio')?.label).toBe('Aspect Ratio');
      expect(result.find(p => p.key === 'output_format')?.label).toBe('Output Format');
      expect(result.find(p => p.key === 'video_length')?.label).toBe('Video Length');
    });

    it('formats boolean values as Yes/No', () => {
      const settings = { 
        enable_audio: true, 
        disable_watermark: false 
      };
      const result = getDisplayableParameters(settings, null);
      
      expect(result.find(p => p.key === 'enable_audio')?.value).toBe('Yes');
      expect(result.find(p => p.key === 'disable_watermark')?.value).toBe('No');
    });

    it('formats number values as strings', () => {
      const settings = { 
        width: 1920, 
        height: 1080,
        fps: 30
      };
      const result = getDisplayableParameters(settings, null);
      
      expect(result.find(p => p.key === 'width')?.value).toBe('1920');
      expect(result.find(p => p.key === 'height')?.value).toBe('1080');
      expect(result.find(p => p.key === 'fps')?.value).toBe('30');
    });

    it('filters out URL values', () => {
      const settings = { 
        callback_url: 'https://example.com/callback',
        source_image: 'data:image/png;base64,abc123',
        resolution: '4K'
      };
      const result = getDisplayableParameters(settings, null);
      
      // URLs filtered out by formatValue
      expect(result.find(p => p.key === 'callback_url')).toBeUndefined();
      expect(result.find(p => p.key === 'source_image')).toBeUndefined();
      
      // Non-URL present
      expect(result.find(p => p.key === 'resolution')).toBeDefined();
    });

    it('filters out very long string values', () => {
      const settings = { 
        description: 'A'.repeat(100),
        short_desc: 'Short description',
        resolution: 'HD'
      };
      const result = getDisplayableParameters(settings, null);
      
      // Long string filtered
      expect(result.find(p => p.key === 'description')).toBeUndefined();
      
      // Short strings present
      expect(result.find(p => p.key === 'short_desc')).toBeDefined();
      expect(result.find(p => p.key === 'resolution')).toBeDefined();
    });

    it('filters out arrays and objects', () => {
      const settings = { 
        tags: ['tag1', 'tag2'],
        config: { nested: 'value' },
        resolution: '1080p'
      };
      const result = getDisplayableParameters(settings, null);
      
      expect(result.find(p => p.key === 'tags')).toBeUndefined();
      expect(result.find(p => p.key === 'config')).toBeUndefined();
      expect(result.find(p => p.key === 'resolution')).toBeDefined();
    });

    it('respects maxParams option', () => {
      const settings = { 
        param1: 'value1',
        param2: 'value2',
        param3: 'value3',
        param4: 'value4',
        param5: 'value5'
      };
      const result = getDisplayableParameters(settings, null, { maxParams: 3 });
      
      expect(result.length).toBe(3);
    });

    it('respects showHidden option for admin use', () => {
      const settings = { 
        seed: 12345,
        guidance_scale: 7.5,
        aspect_ratio: '16:9'
      };
      
      // Without showHidden - filters common hidden
      const normalResult = getDisplayableParameters(settings, null);
      expect(normalResult.find(p => p.key === 'seed')).toBeUndefined();
      
      // With showHidden - shows all
      const adminResult = getDisplayableParameters(settings, null, { showHidden: true });
      expect(adminResult.find(p => p.key === 'seed')).toBeDefined();
    });
  });

  describe('getDisplayableParametersString', () => {
    it('returns null for empty settings', () => {
      expect(getDisplayableParametersString(null, null)).toBeNull();
      expect(getDisplayableParametersString({}, null)).toBeNull();
    });

    it('returns formatted string with bullet separator', () => {
      const settings = { 
        aspect_ratio: '16:9', 
        duration: '5s' 
      };
      const result = getDisplayableParametersString(settings, null);
      
      expect(result).toContain('Aspect Ratio: 16:9');
      expect(result).toContain('Duration: 5s');
      expect(result).toContain(' • ');
    });

    it('returns null when all parameters are filtered', () => {
      const settings = { 
        prompt: 'hidden',
        _webhook_token: 'hidden',
        userId: 'hidden'
      };
      const result = getDisplayableParametersString(settings, null);
      
      expect(result).toBeNull();
    });
  });
});
