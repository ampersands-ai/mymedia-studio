/**
 * Tests for GenerationDialog component
 * Ensures generation workflow UI behaves correctly
 */

import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders, userEvent } from '@/components/__tests__/test-utils';
import { GenerationDialog } from '../GenerationDialog';
import type { GenerationState } from '@/hooks/useGenerationState';
import type { TemplatePreview } from '@/types/templates';

// Mock the child components
vi.mock('../GenerationConsole', () => ({
  GenerationConsole: ({ generationState }: { generationState: GenerationState }) => (
    <div data-testid="generation-console">
      {generationState.currentOutput && <div>Output: {generationState.currentOutput}</div>}
    </div>
  ),
}));

vi.mock('@/components/onboarding/TokenCostPreview', () => ({
  TokenCostPreview: ({ baseCost, totalCost, userTokens }: { baseCost: number; totalCost: number; userTokens: number }) => (
    <div data-testid="token-cost-preview">
      Cost: {baseCost} / {totalCost} | Balance: {userTokens}
    </div>
  ),
}));

// Factory for mock TemplatePreview
function createMockTemplatePreview(overrides: Partial<TemplatePreview> = {}): TemplatePreview {
  return {
    id: 'test-template',
    name: 'Test Template',
    description: 'A test template for generation',
    category: 'test-category',
    thumbnail_url: 'https://example.com/thumb.jpg',
    before_image_url: null,
    after_image_url: null,
    is_active: true,
    display_order: 1,
    estimated_time_seconds: 90,
    user_input_fields: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    primary_model_record_id: 'model-record-123',
    primary_model_id: 'test-model',
    primaryContentType: 'image',
    estimatedBaseCost: 5,
    template_type: 'workflow',
    ...overrides,
  };
}

describe('GenerationDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    selectedTemplate: createMockTemplatePreview(),
    prompt: '',
    onPromptChange: vi.fn(),
    onGenerate: vi.fn(),
    isGenerating: false,
    isPolling: false,
    userTokens: 100,
    generationState: {
      currentOutput: null,
      selectedTemplate: null,
    } as GenerationState,
    onDownload: vi.fn(),
    onViewHistory: vi.fn(),
  };

  describe('Template Display', () => {
    it('displays template name and description', () => {
      renderWithProviders(<GenerationDialog {...defaultProps} />);

      expect(screen.getByText('Test Template')).toBeInTheDocument();
      expect(screen.getByText('A test template for generation')).toBeInTheDocument();
    });

    it('displays estimated time when available', () => {
      renderWithProviders(<GenerationDialog {...defaultProps} />);

      // 90 seconds = 1m 30s
      expect(screen.getByText(/Estimated time:/)).toBeInTheDocument();
      expect(screen.getByText(/1m 30s/)).toBeInTheDocument();
    });

    it('does not display estimated time when null', () => {
      const props = {
        ...defaultProps,
        selectedTemplate: createMockTemplatePreview({
          estimated_time_seconds: null,
        }),
      };

      renderWithProviders(<GenerationDialog {...props} />);

      expect(screen.queryByText(/Estimated time:/)).not.toBeInTheDocument();
    });

    it('shows default description when template has none', () => {
      const props = {
        ...defaultProps,
        selectedTemplate: createMockTemplatePreview({
          description: null,
        }),
      };

      renderWithProviders(<GenerationDialog {...props} />);

      expect(screen.getByText('Enter your prompt to generate content')).toBeInTheDocument();
    });
  });

  describe('Prompt Input', () => {
    it('renders textarea with placeholder', () => {
      renderWithProviders(<GenerationDialog {...defaultProps} />);

      const textarea = screen.getByPlaceholderText('Describe what you want to create...');
      expect(textarea).toBeInTheDocument();
    });

    it('calls onPromptChange when user types', async () => {
      const onPromptChange = vi.fn();
      const user = userEvent.setup();

      renderWithProviders(
        <GenerationDialog {...defaultProps} onPromptChange={onPromptChange} />
      );

      const textarea = screen.getByPlaceholderText('Describe what you want to create...');
      await user.type(textarea, 'test prompt');

      // Should be called for each character typed
      expect(onPromptChange).toHaveBeenCalled();
    });

    it('displays current prompt value', () => {
      renderWithProviders(<GenerationDialog {...defaultProps} prompt="existing prompt" />);

      const textarea = screen.getByPlaceholderText('Describe what you want to create...') as HTMLTextAreaElement;
      expect(textarea.value).toBe('existing prompt');
    });

    it('disables textarea while generating', () => {
      renderWithProviders(<GenerationDialog {...defaultProps} isGenerating={true} />);

      const textarea = screen.getByPlaceholderText('Describe what you want to create...');
      expect(textarea).toBeDisabled();
    });

    it('hides textarea while polling', () => {
      renderWithProviders(<GenerationDialog {...defaultProps} isPolling={true} />);

      const textarea = screen.queryByPlaceholderText('Describe what you want to create...');
      expect(textarea).not.toBeInTheDocument();
    });
  });

  describe('Generate Button', () => {
    it('is disabled when prompt is empty', () => {
      renderWithProviders(<GenerationDialog {...defaultProps} prompt="" />);

      const generateButton = screen.getByRole('button', { name: /Generate/ });
      expect(generateButton).toBeDisabled();
    });

    it('is disabled when prompt is only whitespace', () => {
      renderWithProviders(<GenerationDialog {...defaultProps} prompt="   " />);

      const generateButton = screen.getByRole('button', { name: /Generate/ });
      expect(generateButton).toBeDisabled();
    });

    it('is enabled when prompt has content', () => {
      renderWithProviders(<GenerationDialog {...defaultProps} prompt="test prompt" />);

      const generateButton = screen.getByRole('button', { name: /Generate/ });
      expect(generateButton).not.toBeDisabled();
    });

    it('is disabled while generating', () => {
      renderWithProviders(
        <GenerationDialog {...defaultProps} prompt="test" isGenerating={true} />
      );

      const generateButton = screen.getByRole('button', { name: /Generating/ });
      expect(generateButton).toBeDisabled();
    });

    it('is hidden while polling', () => {
      renderWithProviders(
        <GenerationDialog {...defaultProps} prompt="test" isPolling={true} />
      );

      const generateButton = screen.queryByRole('button', { name: /Generate/ });
      expect(generateButton).not.toBeInTheDocument();
    });

    it('shows "Generating..." when isGenerating is true', () => {
      renderWithProviders(
        <GenerationDialog {...defaultProps} prompt="test" isGenerating={true} />
      );

      expect(screen.getByText(/Generating.../)).toBeInTheDocument();
    });

    it('calls onGenerate when clicked', async () => {
      const onGenerate = vi.fn().mockResolvedValue(undefined);
      const user = userEvent.setup();

      renderWithProviders(
        <GenerationDialog {...defaultProps} prompt="test prompt" onGenerate={onGenerate} />
      );

      const generateButton = screen.getByRole('button', { name: /Generate/ });
      await user.click(generateButton);

      expect(onGenerate).toHaveBeenCalledTimes(1);
    });
  });

  describe('Cancel Button', () => {
    it('calls onOpenChange(false) when clicked', async () => {
      const onOpenChange = vi.fn();
      const user = userEvent.setup();

      renderWithProviders(
        <GenerationDialog {...defaultProps} onOpenChange={onOpenChange} />
      );

      const cancelButton = screen.getByRole('button', { name: /Cancel/ });
      await user.click(cancelButton);

      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('is disabled while generating', () => {
      renderWithProviders(
        <GenerationDialog {...defaultProps} isGenerating={true} />
      );

      const cancelButton = screen.getByRole('button', { name: /Cancel/ });
      expect(cancelButton).toBeDisabled();
    });

    it('is hidden while polling', () => {
      renderWithProviders(
        <GenerationDialog {...defaultProps} isPolling={true} />
      );

      const cancelButton = screen.queryByRole('button', { name: /Cancel/ });
      expect(cancelButton).not.toBeInTheDocument();
    });
  });

  describe('Token Cost Preview', () => {
    it('displays token cost preview with template base cost', () => {
      renderWithProviders(<GenerationDialog {...defaultProps} />);

      const preview = screen.getByTestId('token-cost-preview');
      expect(preview).toHaveTextContent('Cost: 5 / 5');
    });

    it('displays user token balance', () => {
      renderWithProviders(<GenerationDialog {...defaultProps} userTokens={100} />);

      const preview = screen.getByTestId('token-cost-preview');
      expect(preview).toHaveTextContent('Balance: 100');
    });

    it('uses default cost of 2 when template has no cost', () => {
      const props = {
        ...defaultProps,
        selectedTemplate: createMockTemplatePreview({
          estimatedBaseCost: undefined as unknown as number,
        }),
      };

      renderWithProviders(<GenerationDialog {...props} />);

      const preview = screen.getByTestId('token-cost-preview');
      expect(preview).toHaveTextContent('Cost: 2 / 2');
    });
  });

  describe('Generation Console', () => {
    it('renders GenerationConsole component', () => {
      renderWithProviders(<GenerationDialog {...defaultProps} />);

      expect(screen.getByTestId('generation-console')).toBeInTheDocument();
    });

    it('passes generationState to console', () => {
      const generationState = {
        currentOutput: 'https://example.com/output.jpg',
        selectedTemplate: null,
      } as GenerationState;

      renderWithProviders(
        <GenerationDialog {...defaultProps} generationState={generationState} />
      );

      expect(screen.getByText('Output: https://example.com/output.jpg')).toBeInTheDocument();
    });
  });

  describe('Polling State', () => {
    it('hides prompt input when isPolling is true', () => {
      renderWithProviders(<GenerationDialog {...defaultProps} isPolling={true} />);

      // Prompt input should be hidden during polling
      expect(screen.queryByPlaceholderText('Describe what you want to create...')).not.toBeInTheDocument();
    });

    it('shows prompt input when isPolling is false', () => {
      renderWithProviders(<GenerationDialog {...defaultProps} isPolling={false} />);

      // Prompt input should be visible
      expect(screen.getByPlaceholderText('Describe what you want to create...')).toBeInTheDocument();
    });
  });

  describe('Output Visibility', () => {
    it('hides prompt input when output is available', () => {
      const generationState = {
        currentOutput: 'https://example.com/output.jpg',
        selectedTemplate: null,
      } as GenerationState;

      renderWithProviders(
        <GenerationDialog {...defaultProps} generationState={generationState} />
      );

      // Prompt input should be hidden
      expect(screen.queryByPlaceholderText('Describe what you want to create...')).not.toBeInTheDocument();
    });

    it('hides prompt input when polling', () => {
      renderWithProviders(<GenerationDialog {...defaultProps} isPolling={true} />);

      // Prompt input should be hidden during polling
      expect(screen.queryByPlaceholderText('Describe what you want to create...')).not.toBeInTheDocument();
    });

    it('shows prompt input when no output and not polling', () => {
      renderWithProviders(
        <GenerationDialog
          {...defaultProps}
          generationState={{ currentOutput: null, selectedTemplate: null } as GenerationState}
          isPolling={false}
        />
      );

      expect(screen.getByPlaceholderText('Describe what you want to create...')).toBeInTheDocument();
    });
  });

  describe('Dialog State', () => {
    it('renders when open is true', () => {
      renderWithProviders(<GenerationDialog {...defaultProps} open={true} />);

      expect(screen.getByText('Test Template')).toBeInTheDocument();
    });

    it('does not render when open is false', () => {
      const { container } = renderWithProviders(
        <GenerationDialog {...defaultProps} open={false} />
      );

      // Dialog content should not be visible
      expect(container.querySelector('[role="dialog"]')).not.toBeInTheDocument();
    });
  });
});
