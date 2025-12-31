import { describe, it, expect } from 'vitest';
import { cn } from '../utils';

describe('cn (className utility)', () => {
  describe('basic functionality', () => {
    it('should merge simple class names', () => {
      expect(cn('foo', 'bar')).toBe('foo bar');
    });

    it('should handle single class name', () => {
      expect(cn('foo')).toBe('foo');
    });

    it('should handle empty inputs', () => {
      expect(cn()).toBe('');
      expect(cn('')).toBe('');
    });
  });

  describe('conditional classes', () => {
    it('should filter out falsy values', () => {
      expect(cn('foo', false, 'bar')).toBe('foo bar');
      expect(cn('foo', null, 'bar')).toBe('foo bar');
      expect(cn('foo', undefined, 'bar')).toBe('foo bar');
      expect(cn('foo', 0 && 'baz', 'bar')).toBe('foo bar');
    });

    it('should handle conditional class objects', () => {
      expect(cn({ foo: true, bar: false })).toBe('foo');
      expect(cn({ foo: true, bar: true })).toBe('foo bar');
      expect(cn({ foo: false, bar: false })).toBe('');
    });

    it('should handle mixed conditional inputs', () => {
      expect(cn('base', { active: true, disabled: false }, 'extra')).toBe('base active extra');
    });
  });

  describe('tailwind merge behavior', () => {
    it('should merge conflicting tailwind classes (last wins)', () => {
      expect(cn('p-4', 'p-6')).toBe('p-6');
      expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
      expect(cn('bg-white', 'bg-black')).toBe('bg-black');
    });

    it('should keep non-conflicting tailwind classes', () => {
      expect(cn('p-4', 'm-4')).toBe('p-4 m-4');
      expect(cn('text-red-500', 'bg-blue-500')).toBe('text-red-500 bg-blue-500');
    });

    it('should handle responsive prefixes', () => {
      expect(cn('p-4', 'md:p-6')).toBe('p-4 md:p-6');
      expect(cn('md:p-4', 'md:p-6')).toBe('md:p-6');
    });

    it('should handle state prefixes', () => {
      expect(cn('hover:bg-red-500', 'hover:bg-blue-500')).toBe('hover:bg-blue-500');
      expect(cn('bg-red-500', 'hover:bg-blue-500')).toBe('bg-red-500 hover:bg-blue-500');
    });
  });

  describe('array inputs', () => {
    it('should handle array of class names', () => {
      expect(cn(['foo', 'bar'])).toBe('foo bar');
      expect(cn(['foo', 'bar'], 'baz')).toBe('foo bar baz');
    });

    it('should handle nested arrays', () => {
      expect(cn(['foo', ['bar', 'baz']])).toBe('foo bar baz');
    });

    it('should handle arrays with conditionals', () => {
      expect(cn(['foo', false && 'bar', 'baz'])).toBe('foo baz');
    });
  });

  describe('edge cases', () => {
    it('should handle whitespace in class names', () => {
      expect(cn('  foo  ', '  bar  ')).toBe('foo bar');
    });

    it('should deduplicate identical classes', () => {
      expect(cn('foo', 'foo')).toBe('foo');
    });

    it('should handle complex real-world example', () => {
      const isActive = true;
      const isDisabled = false;
      const result = cn(
        'btn',
        'px-4 py-2',
        {
          'bg-primary text-white': isActive,
          'bg-gray-300 cursor-not-allowed': isDisabled,
        },
        isActive && 'shadow-lg',
        'hover:opacity-90'
      );
      expect(result).toBe('btn px-4 py-2 bg-primary text-white shadow-lg hover:opacity-90');
    });
  });
});
