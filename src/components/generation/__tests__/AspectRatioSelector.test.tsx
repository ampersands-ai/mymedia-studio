import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/dom';
import { renderWithProviders, userEvent } from '@/components/__tests__/test-utils';
import { AspectRatioSelector } from '../AspectRatioSelector';

describe('AspectRatioSelector', () => {
  const defaultProps = {
    selectedRatio: 1, // 1:1
    onRatioChange: vi.fn(),
  };

  it('renders with default value selected', () => {
    renderWithProviders(<AspectRatioSelector {...defaultProps} />);
    
    // Should show the current selection - 1:1 button should exist
    expect(screen.getByRole('button', { name: '1:1' })).toBeDefined();
  });

  it('calls onRatioChange when a new ratio is selected', async () => {
    const onRatioChange = vi.fn();
    const user = userEvent.setup();
    
    renderWithProviders(
      <AspectRatioSelector selectedRatio={1} onRatioChange={onRatioChange} />
    );
    
    // Click on a different ratio option (16:9 = 16/9 ≈ 1.778)
    const option = screen.getByRole('button', { name: '16:9' });
    await user.click(option);
    
    expect(onRatioChange).toHaveBeenCalledWith(16 / 9);
  });

  it('displays common aspect ratios', () => {
    renderWithProviders(<AspectRatioSelector {...defaultProps} />);
    
    // Check for common ratios
    expect(screen.getByRole('button', { name: '1:1' })).toBeDefined();
    expect(screen.getByRole('button', { name: '16:9' })).toBeDefined();
    expect(screen.getByRole('button', { name: '9:16' })).toBeDefined();
    expect(screen.getByRole('button', { name: '4:3' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Free' })).toBeDefined();
  });

  it('highlights the selected ratio with default variant', () => {
    renderWithProviders(
      <AspectRatioSelector selectedRatio={16 / 9} onRatioChange={vi.fn()} />
    );
    
    // The selected option should have default variant (not outline)
    const selectedButton = screen.getByRole('button', { name: '16:9' });
    // Default variant buttons don't have outline class
    expect(selectedButton.className).not.toContain('outline');
  });

  it('handles free crop selection (null ratio)', async () => {
    const onRatioChange = vi.fn();
    const user = userEvent.setup();
    
    renderWithProviders(
      <AspectRatioSelector selectedRatio={1} onRatioChange={onRatioChange} />
    );
    
    // Click on Free option
    const freeButton = screen.getByRole('button', { name: 'Free' });
    await user.click(freeButton);
    
    expect(onRatioChange).toHaveBeenCalledWith(null);
  });

  it('shows label for aspect ratio section', () => {
    renderWithProviders(<AspectRatioSelector {...defaultProps} />);
    
    expect(screen.getByText('Aspect Ratio')).toBeDefined();
  });

  it('handles portrait ratios', async () => {
    const onRatioChange = vi.fn();
    const user = userEvent.setup();
    
    renderWithProviders(
      <AspectRatioSelector selectedRatio={1} onRatioChange={onRatioChange} />
    );
    
    // Click on 9:16 (portrait)
    const portraitButton = screen.getByRole('button', { name: '9:16' });
    await user.click(portraitButton);
    
    expect(onRatioChange).toHaveBeenCalledWith(9 / 16);
  });
});
