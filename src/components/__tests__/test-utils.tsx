/**
 * Shared test utilities for React component testing
 * Provides wrapped render function with all necessary providers
 */

import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { Toaster } from '@/components/ui/sonner';

/**
 * Mock auth context value for testing
 */
interface MockAuthContext {
  user: { id: string; email: string } | null;
  session: { access_token: string } | null;
  loading: boolean;
}

const defaultMockAuth: MockAuthContext = {
  user: null,
  session: null,
  loading: false,
};

/**
 * Create a fresh QueryClient for each test
 */
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  mockAuth?: Partial<MockAuthContext>;
  initialRoute?: string;
}

/**
 * Custom render function that wraps components with all necessary providers
 */
export function renderWithProviders(
  ui: React.ReactElement,
  options: CustomRenderOptions = {}
) {
  const { mockAuth = {}, initialRoute = '/', ...renderOptions } = options;

  const queryClient = createTestQueryClient();
  const authValue = { ...defaultMockAuth, ...mockAuth };

  // Set initial route if needed
  if (initialRoute !== '/') {
    window.history.pushState({}, 'Test page', initialRoute);
  }

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          {children}
          <Toaster />
        </BrowserRouter>
      </QueryClientProvider>
    );
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient,
    authValue,
  };
}

/**
 * Mock Supabase client for testing
 */
export const mockSupabase = {
  auth: {
    getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
  },
  from: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
      order: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    }),
    insert: vi.fn().mockReturnValue({
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
    }),
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
    delete: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  }),
  functions: {
    invoke: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
  storage: {
    from: vi.fn().mockReturnValue({
      upload: vi.fn().mockResolvedValue({ data: { path: 'test-path' }, error: null }),
      getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/test.jpg' } }),
      createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: 'https://example.com/signed' }, error: null }),
    }),
  },
  channel: vi.fn().mockReturnValue({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
  }),
};

/**
 * Wait for async operations to complete
 */
export async function waitForAsync(ms = 0) {
  await new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create a mock generation object
 */
export function createMockGeneration(overrides = {}) {
  return {
    id: 'test-generation-id',
    user_id: 'test-user-id',
    prompt: 'Test prompt',
    status: 'pending',
    type: 'image',
    tokens_used: 5,
    created_at: new Date().toISOString(),
    output_url: null,
    model_id: 'test-model',
    ...overrides,
  };
}

/**
 * Create a mock model object
 */
export function createMockModel(overrides = {}) {
  return {
    id: 'test-model-id',
    model_name: 'Test Model',
    model_id: 'test-model',
    provider: 'test-provider',
    content_type: 'image',
    is_active: true,
    token_cost: 5,
    estimated_time_seconds: 30,
    ...overrides,
  };
}

/**
 * Create a mock user object
 */
export function createMockUser(overrides = {}) {
  return {
    id: 'test-user-id',
    email: 'test@example.com',
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

// Re-export everything from testing-library
export { render, userEvent };
