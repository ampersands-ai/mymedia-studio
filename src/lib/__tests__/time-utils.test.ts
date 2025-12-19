import { describe, it, expect } from 'vitest';
import { formatEstimatedTime } from '../time-utils';

describe('time-utils', () => {
  describe('formatEstimatedTime', () => {
    it('returns null for null input', () => {
      expect(formatEstimatedTime(null)).toBeNull();
    });

    it('returns null for undefined input', () => {
      expect(formatEstimatedTime(undefined)).toBeNull();
    });

    it('formats seconds only for values under 60', () => {
      expect(formatEstimatedTime(0)).toBe('0s');
      expect(formatEstimatedTime(1)).toBe('1s');
      expect(formatEstimatedTime(30)).toBe('30s');
      expect(formatEstimatedTime(59)).toBe('59s');
    });

    it('formats minutes only when no remaining seconds', () => {
      expect(formatEstimatedTime(60)).toBe('1m');
      expect(formatEstimatedTime(120)).toBe('2m');
      expect(formatEstimatedTime(300)).toBe('5m');
      expect(formatEstimatedTime(600)).toBe('10m');
    });

    it('formats combined minutes and seconds', () => {
      expect(formatEstimatedTime(61)).toBe('1m 1s');
      expect(formatEstimatedTime(90)).toBe('1m 30s');
      expect(formatEstimatedTime(125)).toBe('2m 5s');
      expect(formatEstimatedTime(599)).toBe('9m 59s');
    });

    it('handles large values', () => {
      expect(formatEstimatedTime(3600)).toBe('60m');
      expect(formatEstimatedTime(3661)).toBe('61m 1s');
    });

    it('handles edge cases', () => {
      // Zero seconds
      expect(formatEstimatedTime(0)).toBe('0s');
      
      // Exactly one minute
      expect(formatEstimatedTime(60)).toBe('1m');
      
      // Just over one minute
      expect(formatEstimatedTime(61)).toBe('1m 1s');
    });
  });
});
