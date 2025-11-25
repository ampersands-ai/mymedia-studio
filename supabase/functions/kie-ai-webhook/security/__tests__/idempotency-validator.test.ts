/**
 * Unit tests for Idempotency Validator (Security Layer 4)
 */

import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { validateIdempotency } from "../idempotency-validator.ts";
import type { GenerationRecord } from "../../../_shared/database-types.ts";

// Mock Supabase client
const createMockSupabase = (existingEvent: Record<string, unknown> | null = null, insertError: Record<string, unknown> | null = null) => ({
  from: () => ({
    select: () => ({
      eq: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: existingEvent, error: null })
        })
      })
    }),
    insert: async () => ({ data: null, error: insertError })
  })
});

Deno.test("Idempotency Validator - first webhook (no duplicate)", async () => {
  // Setup
  const mockSupabase = createMockSupabase(null);
  const generation = { id: 'gen-123', user_id: 'user-456' } as unknown as GenerationRecord;

  // Execute
  const result = await validateIdempotency('task-123', 'completed', generation, mockSupabase as any);
  
  // Assert
  assertEquals(result.success, true);
  assertEquals(result.isDuplicate, false);
});

Deno.test("Idempotency Validator - duplicate webhook detected", async () => {
  // Setup
  const existingEvent = { id: 'event-999' };
  const mockSupabase = createMockSupabase(existingEvent);
  const generation = { id: 'gen-123', user_id: 'user-456' } as unknown as GenerationRecord;

  // Execute
  const result = await validateIdempotency('task-123', 'completed', generation, mockSupabase as any);
  
  // Assert
  assertEquals(result.success, true);
  assertEquals(result.isDuplicate, true);
  assertEquals(result.error, 'Webhook already processed');
});

Deno.test("Idempotency Validator - different callback types are unique", async () => {
  // Setup
  const mockSupabase = createMockSupabase(null);
  const generation = { id: 'gen-123', user_id: 'user-456' } as unknown as GenerationRecord;

  // Execute - Test with different callback types
  const result1 = await validateIdempotency('task-123', 'completed', generation, mockSupabase as any);
  const result2 = await validateIdempotency('task-123', 'progress', generation, mockSupabase as any);
  
  // Assert - Both should be treated as unique
  assertEquals(result1.isDuplicate, false);
  assertEquals(result2.isDuplicate, false);
});

Deno.test("Idempotency Validator - handles insert errors gracefully", async () => {
  // Setup
  const insertError = { message: 'Database error' };
  const mockSupabase = createMockSupabase(null, insertError);
  const generation = { id: 'gen-123', user_id: 'user-456' } as unknown as GenerationRecord;

  // Execute - Should not throw, idempotency is nice-to-have
  const result = await validateIdempotency('task-123', 'completed', generation, mockSupabase as any);
  
  // Assert - Should still succeed
  assertEquals(result.success, true);
  assertEquals(result.isDuplicate, false);
});
