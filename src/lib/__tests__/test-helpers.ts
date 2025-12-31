/**
 * Shared Test Utilities for /lib Unit Tests
 * Provides mock factories, test data generators, and common testing utilities
 */

import { vi } from 'vitest';

// ============================================
// Mock Factories
// ============================================

/**
 * Create a mock Supabase client for testing
 */
export function createMockSupabaseClient() {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      signInWithPassword: vi.fn().mockResolvedValue({ data: {}, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
    storage: {
      from: vi.fn().mockReturnValue({
        createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: 'https://example.com/signed-url' }, error: null }),
        createSignedUrls: vi.fn().mockResolvedValue({ data: [], error: null }),
        upload: vi.fn().mockResolvedValue({ data: { path: 'test/path' }, error: null }),
        download: vi.fn().mockResolvedValue({ data: new Blob(), error: null }),
        remove: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: {}, error: null }),
    },
  };
}

/**
 * Create a mock logger that captures logs for assertions
 */
export function createMockLogger() {
  const logs: Array<{ level: string; message: string; context?: Record<string, unknown> }> = [];
  
  return {
    logs,
    debug: vi.fn((msg: string, ctx?: Record<string, unknown>) => logs.push({ level: 'debug', message: msg, context: ctx })),
    info: vi.fn((msg: string, ctx?: Record<string, unknown>) => logs.push({ level: 'info', message: msg, context: ctx })),
    warn: vi.fn((msg: string, ctx?: Record<string, unknown>) => logs.push({ level: 'warn', message: msg, context: ctx })),
    error: vi.fn((msg: string, error?: Error, ctx?: Record<string, unknown>) => logs.push({ level: 'error', message: msg, context: ctx })),
    critical: vi.fn((msg: string, error?: Error, ctx?: Record<string, unknown>) => logs.push({ level: 'critical', message: msg, context: ctx })),
    child: vi.fn().mockReturnThis(),
    childWithUser: vi.fn().mockResolvedValue({ logs: [] }),
    startTimer: vi.fn().mockReturnValue({ end: vi.fn().mockReturnValue(100) }),
    clear: () => { logs.length = 0; },
  };
}

// ============================================
// Test Data Generators
// ============================================

/**
 * Create a mock generation object
 */
export function createMockGeneration(overrides: Partial<{
  id: string;
  user_id: string;
  prompt: string;
  status: string;
  type: string;
  output_url: string | null;
  tokens_used: number;
  created_at: string;
  completed_at: string | null;
  model_id: string | null;
  storage_path: string | null;
}> = {}) {
  return {
    id: 'gen-123',
    user_id: 'user-456',
    prompt: 'A beautiful sunset',
    status: 'completed',
    type: 'image',
    output_url: 'https://storage.example.com/output.png',
    tokens_used: 10,
    created_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
    model_id: 'model-abc',
    storage_path: 'user-456/gen-123/output.png',
    ...overrides,
  };
}

/**
 * Create a mock user profile
 */
export function createMockProfile(overrides: Partial<{
  id: string;
  email: string;
  display_name: string | null;
  email_verified: boolean;
  created_at: string;
}> = {}) {
  return {
    id: 'user-456',
    email: 'test@example.com',
    display_name: 'Test User',
    email_verified: true,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Create a mock scene for storyboard tests
 */
export function createMockScene(overrides: Partial<{
  id: string;
  voice_over_text: string;
  image_prompt: string;
  scene_number: number;
  duration: number;
}> = {}) {
  return {
    id: `scene-${Date.now()}`,
    voice_over_text: 'This is the scene narration.',
    image_prompt: 'A cinematic shot of a mountain landscape',
    scene_number: 1,
    duration: 5,
    ...overrides,
  };
}

/**
 * Create a mock storyboard
 */
export function createMockStoryboard(overrides: Partial<{
  id: string;
  user_id: string;
  duration: number;
  estimated_render_cost: number;
  intro_voiceover_text: string;
  original_character_count: number;
}> = {}) {
  return {
    id: `storyboard-${Date.now()}`,
    user_id: 'user-456',
    duration: 30,
    estimated_render_cost: 7.5,
    intro_voiceover_text: 'Welcome to this story.',
    original_character_count: 500,
    ...overrides,
  };
}

// ============================================
// Testing Utilities
// ============================================

/**
 * Wait for async operations to complete
 */
export async function waitFor(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Suppress console output during test execution
 */
export function suppressConsole() {
  const originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    debug: console.debug,
  };
  
  beforeEach(() => {
    console.log = vi.fn();
    console.warn = vi.fn();
    console.error = vi.fn();
    console.debug = vi.fn();
  });
  
  afterEach(() => {
    console.log = originalConsole.log;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
    console.debug = originalConsole.debug;
  });
  
  return originalConsole;
}

/**
 * Mock environment mode for testing
 */
export function mockEnvMode(mode: 'development' | 'production' | 'test') {
  const originalMode = import.meta.env.MODE;
  
  beforeEach(() => {
    (import.meta.env as { MODE: string }).MODE = mode;
    (import.meta.env as { DEV: boolean }).DEV = mode === 'development';
    (import.meta.env as { PROD: boolean }).PROD = mode === 'production';
  });
  
  afterEach(() => {
    (import.meta.env as { MODE: string }).MODE = originalMode;
  });
}

/**
 * Assert that a function throws an error with specific message
 */
export async function expectAsyncThrow(
  fn: () => Promise<unknown>,
  expectedMessage?: string | RegExp
): Promise<Error> {
  try {
    await fn();
    throw new Error('Expected function to throw');
  } catch (error) {
    if (error instanceof Error && error.message === 'Expected function to throw') {
      throw error;
    }
    if (expectedMessage) {
      const actualMessage = error instanceof Error ? error.message : String(error);
      if (expectedMessage instanceof RegExp) {
        if (!expectedMessage.test(actualMessage)) {
          throw new Error(`Expected error message to match ${expectedMessage}, got: ${actualMessage}`);
        }
      } else if (!actualMessage.includes(expectedMessage)) {
        throw new Error(`Expected error message to include "${expectedMessage}", got: ${actualMessage}`);
      }
    }
    return error as Error;
  }
}
