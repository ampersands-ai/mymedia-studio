import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/components/__tests__/test-utils';
import { TurnstileWidget } from '../TurnstileWidget';

// Mock the Turnstile script loading
const mockTurnstileRender = vi.fn().mockReturnValue('widget-id');
const mockTurnstileRemove = vi.fn();
const mockTurnstileReset = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  
  // Setup global turnstile mock
  (window as unknown as { turnstile: unknown }).turnstile = {
    render: mockTurnstileRender,
    remove: mockTurnstileRemove,
    reset: mockTurnstileReset,
  };
});

describe('TurnstileWidget', () => {
  it('renders the widget container', () => {
    const onVerify = vi.fn();
    renderWithProviders(<TurnstileWidget onVerify={onVerify} />);
    
    // Should render a container div
    const container = document.querySelector('[class*="turnstile"]');
    expect(container).toBeTruthy();
  });

  it('calls onVerify when verification succeeds', async () => {
    const onVerify = vi.fn();
    
    // Mock turnstile to call the callback
    mockTurnstileRender.mockImplementation((container, options) => {
      // Simulate successful verification after a short delay
      setTimeout(() => {
        options.callback?.('test-token');
      }, 10);
      return 'widget-id';
    });
    
    renderWithProviders(<TurnstileWidget onVerify={onVerify} />);
    
    await waitFor(() => {
      expect(onVerify).toHaveBeenCalledWith('test-token');
    });
  });

  it('calls onError when verification fails', async () => {
    const onVerify = vi.fn();
    const onError = vi.fn();
    
    mockTurnstileRender.mockImplementation((container, options) => {
      setTimeout(() => {
        options['error-callback']?.('error-code');
      }, 10);
      return 'widget-id';
    });
    
    renderWithProviders(
      <TurnstileWidget onVerify={onVerify} onError={onError} />
    );
    
    await waitFor(() => {
      expect(onError).toHaveBeenCalled();
    });
  });

  it('calls onExpire when token expires', async () => {
    const onVerify = vi.fn();
    const onExpire = vi.fn();
    
    mockTurnstileRender.mockImplementation((container, options) => {
      setTimeout(() => {
        options['expired-callback']?.();
      }, 10);
      return 'widget-id';
    });
    
    renderWithProviders(
      <TurnstileWidget onVerify={onVerify} onExpire={onExpire} />
    );
    
    await waitFor(() => {
      expect(onExpire).toHaveBeenCalled();
    });
  });

  it('cleans up widget on unmount', () => {
    const onVerify = vi.fn();
    const { unmount } = renderWithProviders(
      <TurnstileWidget onVerify={onVerify} />
    );
    
    unmount();
    
    expect(mockTurnstileRemove).toHaveBeenCalled();
  });

  it('accepts custom className', () => {
    const onVerify = vi.fn();
    renderWithProviders(
      <TurnstileWidget onVerify={onVerify} className="custom-class" />
    );
    
    const container = document.querySelector('.custom-class');
    expect(container).toBeTruthy();
  });
});
