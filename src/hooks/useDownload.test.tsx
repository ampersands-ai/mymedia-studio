import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDownload } from './useDownload';

// Mock dependencies
vi.mock('@/lib/logger', () => ({
  logger: { 
    info: vi.fn(), 
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  }
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(() => 'toast-id'),
  }
}));

vi.mock('@/lib/media/downloadManager', () => ({
  DownloadManager: {
    download: vi.fn(),
    batchDownload: vi.fn(),
  }
}));

describe('useDownload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with idle state', () => {
    const { result } = renderHook(() => useDownload());
    
    expect(result.current.isDownloading).toBe(false);
    expect(result.current.progress).toBe(0);
  });

  it('provides download function', () => {
    const { result } = renderHook(() => useDownload());
    
    expect(typeof result.current.download).toBe('function');
  });

  it('provides batchDownload function', () => {
    const { result } = renderHook(() => useDownload());
    
    expect(typeof result.current.batchDownload).toBe('function');
  });

  it('sets isDownloading to true during download', async () => {
    const { DownloadManager } = await import('@/lib/media/downloadManager');
    
    // Make download hang to check loading state
    let resolveDownload: () => void = () => {};
    (DownloadManager.download as ReturnType<typeof vi.fn>).mockImplementation(
      () => new Promise<void>((resolve) => { resolveDownload = resolve; })
    );
    
    const { result } = renderHook(() => useDownload());
    
    // Start download (don't await)
    act(() => {
      result.current.download('https://example.com/file.jpg', 'file.jpg');
    });
    
    // Check loading state
    expect(result.current.isDownloading).toBe(true);
    
    // Resolve and cleanup
    await act(async () => {
      resolveDownload!();
    });
  });

  it('resets state after successful download', async () => {
    const { DownloadManager } = await import('@/lib/media/downloadManager');
    (DownloadManager.download as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    
    const { result } = renderHook(() => useDownload());
    
    await act(async () => {
      await result.current.download('https://example.com/file.jpg', 'file.jpg');
    });
    
    expect(result.current.isDownloading).toBe(false);
    expect(result.current.progress).toBe(0);
  });

  it('resets state after failed download', async () => {
    const { DownloadManager } = await import('@/lib/media/downloadManager');
    (DownloadManager.download as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Download failed')
    );
    
    const { result } = renderHook(() => useDownload());
    
    await act(async () => {
      try {
        await result.current.download('https://example.com/file.jpg', 'file.jpg');
      } catch {
        // Expected to throw
      }
    });
    
    expect(result.current.isDownloading).toBe(false);
    expect(result.current.progress).toBe(0);
  });

  it('calls DownloadManager.download with correct arguments', async () => {
    const { DownloadManager } = await import('@/lib/media/downloadManager');
    (DownloadManager.download as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    
    const { result } = renderHook(() => useDownload());
    
    await act(async () => {
      await result.current.download('https://example.com/file.jpg', 'myfile.jpg');
    });
    
    expect(DownloadManager.download).toHaveBeenCalledWith(
      'https://example.com/file.jpg',
      'myfile.jpg',
      expect.any(Function)
    );
  });

  it('calls DownloadManager.batchDownload with correct arguments', async () => {
    const { DownloadManager } = await import('@/lib/media/downloadManager');
    (DownloadManager.batchDownload as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    
    const { result } = renderHook(() => useDownload());
    const items = [
      { url: 'https://example.com/file1.jpg', filename: 'file1.jpg' },
      { url: 'https://example.com/file2.jpg', filename: 'file2.jpg' },
    ];
    
    await act(async () => {
      await result.current.batchDownload(items);
    });
    
    expect(DownloadManager.batchDownload).toHaveBeenCalledWith(items);
  });

  it('shows error toast on download failure', async () => {
    const { DownloadManager } = await import('@/lib/media/downloadManager');
    const { toast } = await import('sonner');
    
    (DownloadManager.download as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Network error')
    );
    
    const { result } = renderHook(() => useDownload());
    
    await act(async () => {
      try {
        await result.current.download('https://example.com/file.jpg', 'file.jpg');
      } catch {
        // Expected to throw
      }
    });
    
    expect(toast.error).toHaveBeenCalled();
  });
});
