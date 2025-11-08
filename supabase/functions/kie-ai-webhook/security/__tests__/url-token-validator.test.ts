/**
 * Unit tests for URL Token Validator (Security Layer 1)
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { validateUrlToken } from "../url-token-validator.ts";

Deno.test("URL Token Validator - valid token", () => {
  // Setup
  Deno.env.set('KIE_WEBHOOK_URL_TOKEN', 'test-token-123');
  const url = new URL('https://example.com/webhook?token=test-token-123');
  
  // Execute
  const result = validateUrlToken(url);
  
  // Assert
  assertEquals(result.success, true);
  assertEquals(result.error, undefined);
  assertEquals(result.shouldReturn404, undefined);
});

Deno.test("URL Token Validator - missing token", () => {
  // Setup
  Deno.env.set('KIE_WEBHOOK_URL_TOKEN', 'test-token-123');
  const url = new URL('https://example.com/webhook');
  
  // Execute
  const result = validateUrlToken(url);
  
  // Assert
  assertEquals(result.success, false);
  assertExists(result.error);
  assertEquals(result.shouldReturn404, true);
});

Deno.test("URL Token Validator - invalid token", () => {
  // Setup
  Deno.env.set('KIE_WEBHOOK_URL_TOKEN', 'test-token-123');
  const url = new URL('https://example.com/webhook?token=wrong-token');
  
  // Execute
  const result = validateUrlToken(url);
  
  // Assert
  assertEquals(result.success, false);
  assertEquals(result.error, 'Invalid or missing URL token');
  assertEquals(result.shouldReturn404, true);
});

Deno.test("URL Token Validator - empty token", () => {
  // Setup
  Deno.env.set('KIE_WEBHOOK_URL_TOKEN', 'test-token-123');
  const url = new URL('https://example.com/webhook?token=');
  
  // Execute
  const result = validateUrlToken(url);
  
  // Assert
  assertEquals(result.success, false);
  assertEquals(result.shouldReturn404, true);
});
