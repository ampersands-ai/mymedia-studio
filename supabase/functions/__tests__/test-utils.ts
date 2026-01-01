/**
 * Edge Function Test Utilities
 * 
 * Provides mock utilities for testing edge functions in isolation.
 */

/**
 * Create a mock Request object with proper headers
 */
export function createMockRequest(options: {
  method?: string;
  body?: Record<string, unknown>;
  authToken?: string;
  headers?: Record<string, string>;
}): Request {
  const { method = 'POST', body, authToken, headers = {} } = options;
  
  const requestHeaders = new Headers({
    'Content-Type': 'application/json',
    ...headers,
  });
  
  if (authToken) {
    requestHeaders.set('Authorization', `Bearer ${authToken}`);
  }
  
  return new Request('http://localhost/test', {
    method,
    headers: requestHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * Mock Supabase client with chainable methods
 */
export function createMockSupabaseClient(overrides?: {
  userData?: { id: string; email?: string };
  authError?: Error;
  dbData?: Record<string, unknown>[];
  dbError?: Error;
  rpcData?: unknown;
  rpcError?: Error;
}) {
  const mockSelect = () => ({
    eq: () => ({
      single: async () => ({
        data: overrides?.dbData?.[0] ?? null,
        error: overrides?.dbError ?? null,
      }),
      select: async () => ({
        data: overrides?.dbData ?? [],
        error: overrides?.dbError ?? null,
      }),
    }),
    single: async () => ({
      data: overrides?.dbData?.[0] ?? null,
      error: overrides?.dbError ?? null,
    }),
    gte: () => ({
      count: overrides?.dbData?.length ?? 0,
    }),
    in: () => ({
      neq: () => ({
        count: overrides?.dbData?.length ?? 0,
      }),
    }),
  });

  const mockInsert = () => ({
    select: () => ({
      single: async () => ({
        data: overrides?.dbData?.[0] ?? { id: 'mock-id' },
        error: overrides?.dbError ?? null,
      }),
    }),
  });

  const mockUpdate = () => ({
    eq: () => ({
      select: async () => ({
        data: overrides?.dbData ?? [],
        error: overrides?.dbError ?? null,
      }),
    }),
  });

  return {
    auth: {
      getUser: async () => ({
        data: overrides?.userData ? { user: overrides.userData } : null,
        error: overrides?.authError ?? null,
      }),
    },
    from: () => ({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
    }),
    rpc: async () => ({
      data: overrides?.rpcData ?? [{ success: true, tokens_remaining: 100 }],
      error: overrides?.rpcError ?? null,
    }),
    functions: {
      invoke: async () => ({ data: null, error: null }),
    },
    storage: {
      from: () => ({
        getPublicUrl: () => ({ data: { publicUrl: 'https://mock.url/file' } }),
        upload: async () => ({ data: { path: 'mock/path' }, error: null }),
        list: async () => ({ data: [], error: null }),
      }),
    },
  };
}

/**
 * Mock provider responses
 */
export const mockProviderResponses = {
  kieAi: {
    success: {
      metadata: { task_id: 'kie-task-123' },
      status: 'processing',
    },
    failure: {
      error: 'Provider error',
    },
  },
  runware: {
    success: {
      output_data: new Uint8Array([0, 1, 2, 3]),
      file_extension: 'png',
      file_size: 1024,
    },
    failure: {
      error: 'Runware API error',
    },
  },
  lovableAi: {
    success: {
      output_data: new Uint8Array([0, 1, 2, 3]),
      file_extension: 'png',
      file_size: 2048,
    },
    failure: {
      error: 'Lovable AI error',
    },
  },
};

/**
 * Mock model config for testing
 */
export const mockModelConfig = {
  modelId: 'test-model',
  recordId: 'test-record-123',
  provider: 'runware',
  contentType: 'prompt_to_image',
  baseCreditCost: 1,
  estimatedTimeSeconds: 30,
  costMultipliers: {},
  apiEndpoint: null,
  payloadStructure: 'wrapper',
};

/**
 * Mock model schema for testing
 */
export const mockModelSchema = {
  type: 'object',
  properties: {
    prompt: {
      type: 'string',
      maxLength: 5000,
      renderer: 'prompt',
    },
    aspect_ratio: {
      type: 'string',
      enum: ['1:1', '16:9', '9:16'],
      default: '1:1',
    },
  },
  required: ['prompt'],
};

/**
 * Assert response has expected status and headers
 */
export async function assertResponse(
  response: Response,
  expectedStatus: number,
  expectedBodyContains?: string
): Promise<Record<string, unknown>> {
  const body = await response.json();
  
  if (response.status !== expectedStatus) {
    throw new Error(
      `Expected status ${expectedStatus}, got ${response.status}. Body: ${JSON.stringify(body)}`
    );
  }
  
  if (expectedBodyContains && !JSON.stringify(body).includes(expectedBodyContains)) {
    throw new Error(
      `Expected body to contain "${expectedBodyContains}". Body: ${JSON.stringify(body)}`
    );
  }
  
  return body;
}

/**
 * Create a complete valid request body for generate-content
 */
export function createValidRequestBody(overrides?: Partial<{
  prompt: string;
  model_config: Record<string, unknown>;
  model_schema: Record<string, unknown>;
  custom_parameters: Record<string, unknown>;
}>): Record<string, unknown> {
  return {
    prompt: 'A beautiful sunset over the ocean',
    model_config: mockModelConfig,
    model_schema: mockModelSchema,
    custom_parameters: {},
    ...overrides,
  };
}
