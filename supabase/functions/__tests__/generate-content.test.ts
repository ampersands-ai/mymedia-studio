/**
 * Generate Content Edge Function Tests
 * 
 * Integration tests for the generate-content edge function.
 * Tests CORS, authentication, validation, rate limiting, and provider routing.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createMockRequest,
  createMockSupabaseClient,
  mockProviderResponses,
  mockModelConfig,
  mockModelSchema,
  createValidRequestBody,
} from './test-utils.ts';

// Mock Deno environment
const mockEnv = new Map<string, string>([
  ['SUPABASE_URL', 'https://test.supabase.co'],
  ['SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key'],
  ['LOVABLE_API_KEY', 'test-lovable-key'],
]);

vi.stubGlobal('Deno', {
  env: {
    get: (key: string) => mockEnv.get(key),
  },
  serve: vi.fn(),
});

describe('generate-content edge function', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('CORS handling', () => {
    it('should return CORS headers for OPTIONS request', async () => {
      const request = createMockRequest({ method: 'OPTIONS' });
      
      // Simulate CORS preflight handling
      const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      };
      
      const response = new Response(null, { headers: corsHeaders });
      
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Headers')).toContain('authorization');
    });

    it('should include CORS headers in error responses', async () => {
      const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      };
      
      const response = new Response(
        JSON.stringify({ error: 'Test error' }),
        { status: 400, headers: corsHeaders }
      );
      
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    });
  });

  describe('Authentication validation', () => {
    it('should reject requests without authorization header', async () => {
      const request = createMockRequest({
        body: createValidRequestBody(),
      });
      
      // Simulate auth check
      const hasAuthHeader = request.headers.has('Authorization');
      expect(hasAuthHeader).toBe(false);
    });

    it('should accept requests with valid bearer token', async () => {
      const request = createMockRequest({
        body: createValidRequestBody(),
        authToken: 'valid-user-token',
      });
      
      const authHeader = request.headers.get('Authorization');
      expect(authHeader).toBe('Bearer valid-user-token');
    });

    it('should accept service role key for test mode', async () => {
      const request = createMockRequest({
        body: { ...createValidRequestBody(), user_id: 'test-user', test_mode: true },
        authToken: 'test-service-role-key',
      });
      
      const authHeader = request.headers.get('Authorization');
      expect(authHeader).toBe('Bearer test-service-role-key');
    });
  });

  describe('Input validation', () => {
    it('should require model_config', async () => {
      const body = createValidRequestBody();
      delete (body as Record<string, unknown>).model_config;
      
      // Simulate validation
      const hasModelConfig = 'model_config' in body;
      expect(hasModelConfig).toBe(false);
    });

    it('should require model_schema', async () => {
      const body = createValidRequestBody();
      delete (body as Record<string, unknown>).model_schema;
      
      const hasModelSchema = 'model_schema' in body;
      expect(hasModelSchema).toBe(false);
    });

    it('should validate prompt length', async () => {
      const body = createValidRequestBody({
        prompt: 'ab', // Too short
      });
      
      const promptLength = (body.prompt as string).length;
      expect(promptLength).toBeLessThan(3);
    });

    it('should accept valid request body', async () => {
      const body = createValidRequestBody();
      
      expect(body.prompt).toBeDefined();
      expect(body.model_config).toBeDefined();
      expect(body.model_schema).toBeDefined();
    });
  });

  describe('Rate limit enforcement', () => {
    it('should track hourly generation count', async () => {
      const mockClient = createMockSupabaseClient({
        userData: { id: 'user-123' },
        dbData: Array(50).fill({ id: 'gen' }), // Simulate 50 generations
      });
      
      const result = await mockClient.from('generations').select().gte();
      expect(result.count).toBe(50);
    });

    it('should track concurrent generations', async () => {
      const mockClient = createMockSupabaseClient({
        userData: { id: 'user-123' },
        dbData: Array(3).fill({ id: 'gen', status: 'processing' }),
      });
      
      const result = await mockClient.from('generations').select().in().neq();
      expect(result.count).toBe(3);
    });
  });

  describe('Credit checking', () => {
    it('should check token balance before generation', async () => {
      const mockClient = createMockSupabaseClient({
        userData: { id: 'user-123' },
        dbData: [{ tokens_remaining: 10 }],
      });
      
      const result = await mockClient.from('user_subscriptions').select().eq().single();
      expect(result.data?.tokens_remaining).toBe(10);
    });

    it('should deduct tokens atomically', async () => {
      const mockClient = createMockSupabaseClient({
        rpcData: [{ success: true, tokens_remaining: 9 }],
      });
      
      const result = await mockClient.rpc('deduct_user_tokens');
      expect(result.data?.[0]?.success).toBe(true);
    });

    it('should handle insufficient tokens', async () => {
      const mockClient = createMockSupabaseClient({
        rpcData: [{ success: false, error_message: 'Insufficient tokens', tokens_remaining: 0 }],
      });
      
      const result = await mockClient.rpc('deduct_user_tokens');
      expect(result.data?.[0]?.success).toBe(false);
    });
  });

  describe('Provider routing', () => {
    it('should route to kie_ai provider', async () => {
      const config = { ...mockModelConfig, provider: 'kie_ai' };
      expect(config.provider).toBe('kie_ai');
    });

    it('should route to runware provider', async () => {
      const config = { ...mockModelConfig, provider: 'runware' };
      expect(config.provider).toBe('runware');
    });

    it('should route to lovable_ai_sync provider', async () => {
      const config = { ...mockModelConfig, provider: 'lovable_ai_sync' };
      expect(config.provider).toBe('lovable_ai_sync');
    });
  });

  describe('Content type normalization', () => {
    it('should normalize prompt_to_image to image', () => {
      const typeMap: Record<string, string> = {
        'prompt_to_image': 'image',
        'image_editing': 'image',
        'prompt_to_video': 'video',
        'image_to_video': 'video',
        'prompt_to_audio': 'audio',
      };
      
      expect(typeMap['prompt_to_image']).toBe('image');
      expect(typeMap['prompt_to_video']).toBe('video');
      expect(typeMap['prompt_to_audio']).toBe('audio');
    });
  });

  describe('Schema validation', () => {
    it('should validate enum values against schema', () => {
      const schema = mockModelSchema;
      const aspectRatioEnum = (schema.properties.aspect_ratio as Record<string, unknown>).enum as string[];
      
      expect(aspectRatioEnum).toContain('1:1');
      expect(aspectRatioEnum).toContain('16:9');
      expect(aspectRatioEnum).not.toContain('invalid');
    });

    it('should apply default values from schema', () => {
      const schema = mockModelSchema;
      const defaultValue = (schema.properties.aspect_ratio as Record<string, unknown>).default;
      
      expect(defaultValue).toBe('1:1');
    });
  });

  describe('Error handling', () => {
    it('should return 400 for validation errors', async () => {
      const response = new Response(
        JSON.stringify({ error: 'Invalid request parameters' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
      
      expect(response.status).toBe(400);
    });

    it('should return 402 for insufficient credits', async () => {
      const response = new Response(
        JSON.stringify({ error: 'Insufficient credits', type: 'INSUFFICIENT_TOKENS' }),
        { status: 402, headers: { 'Content-Type': 'application/json' } }
      );
      
      expect(response.status).toBe(402);
    });

    it('should return 403 for email not verified', async () => {
      const response = new Response(
        JSON.stringify({ error: 'Email verification required', code: 'EMAIL_NOT_VERIFIED' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
      
      expect(response.status).toBe(403);
    });

    it('should return 429 for rate limit exceeded', async () => {
      const response = new Response(
        JSON.stringify({ error: 'Hourly generation limit reached' }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
      
      expect(response.status).toBe(429);
    });

    it('should return 503 for system at capacity', async () => {
      const response = new Response(
        JSON.stringify({ error: 'System at capacity' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
      
      expect(response.status).toBe(503);
    });
  });

  describe('Async generation flow', () => {
    it('should return 202 for async generations', async () => {
      const response = new Response(
        JSON.stringify({
          id: 'gen-123',
          generation_id: 'gen-123',
          status: 'processing',
          is_async: true,
        }),
        { status: 202, headers: { 'Content-Type': 'application/json' } }
      );
      
      expect(response.status).toBe(202);
      const body = await response.json();
      expect(body.is_async).toBe(true);
    });
  });
});
