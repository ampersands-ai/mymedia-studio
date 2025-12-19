import { describe, it, expect, vi, beforeEach } from 'vitest';
import { extractStoragePath } from '../storage-utils';

// Mock the supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    storage: {
      from: vi.fn().mockReturnValue({
        createSignedUrl: vi.fn().mockResolvedValue({ 
          data: { signedUrl: 'https://example.com/signed' }, 
          error: null 
        }),
      }),
    },
  },
}));

// Mock the logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('storage-utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('extractStoragePath', () => {
    it('returns empty string for null input', () => {
      expect(extractStoragePath(null)).toBe('');
    });

    it('returns empty string for empty string input', () => {
      expect(extractStoragePath('')).toBe('');
    });

    it('handles simple path strings', () => {
      expect(extractStoragePath('path/to/file.jpg')).toBe('path/to/file.jpg');
    });

    it('removes leading slashes from paths', () => {
      expect(extractStoragePath('/path/to/file.jpg')).toBe('path/to/file.jpg');
      expect(extractStoragePath('///path/to/file.jpg')).toBe('path/to/file.jpg');
    });

    it('removes query parameters from paths', () => {
      expect(extractStoragePath('path/to/file.jpg?token=abc')).toBe('path/to/file.jpg');
    });

    it('extracts path from generated-content bucket URLs', () => {
      const url = 'https://example.supabase.co/storage/v1/object/public/generated-content/user-123/image.jpg';
      expect(extractStoragePath(url)).toBe('user-123/image.jpg');
    });

    it('extracts path from object/public URLs', () => {
      const url = 'https://example.supabase.co/storage/v1/object/public/bucket-name/path/to/file.jpg';
      expect(extractStoragePath(url)).toBe('path/to/file.jpg');
    });

    it('handles URLs with query parameters', () => {
      const url = 'https://example.supabase.co/storage/v1/object/public/generated-content/file.jpg?token=abc123';
      expect(extractStoragePath(url)).toBe('file.jpg');
    });

    it('handles malformed URLs gracefully', () => {
      // Should not throw, should return cleaned path
      const result = extractStoragePath('not-a-valid-url');
      expect(typeof result).toBe('string');
    });

    it('handles deeply nested paths', () => {
      const url = 'https://example.com/storage/generated-content/a/b/c/d/file.jpg';
      const result = extractStoragePath(url);
      expect(result).toContain('file.jpg');
    });

    it('preserves file extensions', () => {
      expect(extractStoragePath('image.png')).toBe('image.png');
      expect(extractStoragePath('video.mp4')).toBe('video.mp4');
      expect(extractStoragePath('audio.mp3')).toBe('audio.mp3');
    });
  });
});
