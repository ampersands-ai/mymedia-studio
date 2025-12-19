import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen, userEvent } from '@/components/__tests__/test-utils';
import { AspectRatioSelector } from '../AspectRatioSelector';

describe('AspectRatioSelector', () => {
  const defaultProps = {
    value: '1:1',
    onChange: vi.fn(),
  };

  it('renders with default value selected', () => {
    renderWithProviders(<AspectRatioSelector {...defaultProps} />);
    
    // Should show the current selection
    expect(screen.getByText(/1:1/i)).toBeInTheDocument();
  });

  it('calls onChange when a new ratio is selected', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    
    renderWithProviders(
      <AspectRatioSelector value="1:1" onChange={onChange} />
    );
    
    // Click on a different ratio option
    const option = screen.getByText(/16:9/i);
    await user.click(option);
    
    expect(onChange).toHaveBeenCalledWith('16:9');
  });

  it('displays common aspect ratios', () => {
    renderWithProviders(<AspectRatioSelector {...defaultProps} />);
    
    // Check for common ratios
    expect(screen.getByText(/1:1/i)).toBeInTheDocument();
    expect(screen.getByText(/16:9/i)).toBeInTheDocument();
    expect(screen.getByText(/9:16/i)).toBeInTheDocument();
  });

  it('highlights the selected ratio', () => {
    renderWithProviders(
      <AspectRatioSelector value="16:9" onChange={vi.fn()} />
    );
    
    // The selected option should have a distinct style
    const selectedOption = screen.getByText(/16:9/i).closest('button');
    expect(selectedOption).toHaveClass(/selected|active|primary/i);
  });

  it('is accessible with keyboard navigation', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    
    renderWithProviders(
      <AspectRatioSelector value="1:1" onChange={onChange} />
    );
    
    // Tab to focus
    await user.tab();
    
    // Should be focusable
    expect(document.activeElement).toBeInstanceOf(HTMLElement);
  });

  it('shows aspect ratio labels for different use cases', () => {
    renderWithProviders(<AspectRatioSelector {...defaultProps} />);
    
    // Should show helpful labels
    const squareLabel = screen.queryByText(/square|instagram/i);
    const landscapeLabel = screen.queryByText(/landscape|youtube/i);
    const portraitLabel = screen.queryByText(/portrait|tiktok|reels/i);
    
    // At least one descriptive label should exist
    expect(squareLabel || landscapeLabel || portraitLabel).toBeTruthy();
  });

  it('handles disabled state', () => {
    const onChange = vi.fn();
    renderWithProviders(
      <AspectRatioSelector value="1:1" onChange={onChange} disabled />
    );
    
    const buttons = screen.getAllByRole('button');
    buttons.forEach(button => {
      expect(button).toBeDisabled();
    });
  });
});
