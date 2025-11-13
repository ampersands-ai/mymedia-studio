# HTTP Client Migration Guide

## Overview

The centralized HTTP client (`supabase/functions/_shared/http-client.ts`) provides:
- ✅ Automatic retry with exponential backoff
- ✅ Request timeout protection
- ✅ Circuit breaker integration
- ✅ Structured logging with request correlation
- ✅ Standardized error handling
- ✅ Pre-configured clients for common services

---

## Quick Start

### Basic Usage

```typescript
import { EdgeLogger } from '../_shared/edge-logger.ts';
import { HttpClients } from '../_shared/http-client.ts';

// In your edge function
const logger = new EdgeLogger('my-function', requestId, supabase, true);

// Create a generic HTTP client
const httpClient = HttpClients.createGenericClient(logger);

// Make requests
const data = await httpClient.get<ResponseType>('https://api.example.com/data');
```

### Using Pre-configured Clients

```typescript
// For Lovable AI Gateway
const aiClient = HttpClients.createLovableAIClient(logger);
const response = await aiClient.post('/v1/chat/completions', payload);

// For KieAI
const kieClient = HttpClients.createKieAIClient(logger);
const task = await kieClient.post('/api/v1/jobs/create', taskData);

// For Shotstack
const shotstackClient = HttpClients.createShotstackClient(logger);
const render = await shotstackClient.post('/v1/render', renderConfig);
```

---

## Migration Examples

### Before: Raw fetch()
```typescript
// ❌ OLD WAY - Manual timeout, no retry, poor error handling
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 30000);

try {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    signal: controller.signal
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  
  const result = await response.json();
  console.log('Success:', result);
} catch (error) {
  console.error('Request failed:', error);
  throw error;
} finally {
  clearTimeout(timeoutId);
}
```

### After: Using HttpClient
```typescript
// ✅ NEW WAY - Automatic retry, timeout, circuit breaker, structured logging
const httpClient = HttpClients.createGenericClient(logger);

const result = await httpClient.post<ResponseType>(url, data, {
  context: { userId: user.id, operation: 'create_task' }
});

// That's it! Retries, timeouts, circuit breaker, and logging are automatic
```

---

## Available Pre-configured Clients

### 1. Lovable AI Client
```typescript
const client = HttpClients.createLovableAIClient(logger);
```
- **Timeout**: 120 seconds
- **Retries**: 2
- **Auth**: Automatic (uses LOVABLE_API_KEY)
- **Use for**: AI chat completions, embeddings

### 2. KieAI Client
```typescript
const client = HttpClients.createKieAIClient(logger);
```
- **Timeout**: 600 seconds (10 minutes)
- **Retries**: 2
- **Auth**: Automatic (uses KIE_AI_API_KEY)
- **Use for**: Image/video generation tasks

### 3. Shotstack Client
```typescript
const client = HttpClients.createShotstackClient(logger);
```
- **Timeout**: 30 seconds
- **Retries**: 3
- **Auth**: Automatic (uses SHOTSTACK_API_KEY)
- **Use for**: Video rendering, status checks

### 4. Pixabay Client
```typescript
const client = HttpClients.createPixabayClient(logger);
```
- **Timeout**: 15 seconds
- **Retries**: 3
- **Use for**: Stock image search

### 5. Pexels Client
```typescript
const client = HttpClients.createPexelsClient(logger);
```
- **Timeout**: 15 seconds
- **Retries**: 3
- **Auth**: Automatic (uses PEXELS_API_KEY)
- **Use for**: Stock video search

### 6. ElevenLabs Client
```typescript
const client = HttpClients.createElevenLabsClient(logger);
```
- **Timeout**: 60 seconds
- **Retries**: 2
- **Auth**: Automatic (uses ELEVENLABS_API_KEY)
- **Use for**: Text-to-speech generation

### 7. Runware Client
```typescript
const client = HttpClients.createRunwareClient(logger);
```
- **Timeout**: 60 seconds
- **Retries**: 3
- **Auth**: Automatic (uses RUNWARE_API_KEY)
- **Use for**: Synchronous image generation

---

## Advanced Usage

### Custom Configuration
```typescript
import { HttpClient } from '../_shared/http-client.ts';

const customClient = new HttpClient(logger, {
  timeout: 60000,           // 60 seconds
  maxRetries: 5,            // Retry up to 5 times
  retryDelay: 2000,         // Start with 2 second delay
  exponentialBackoff: true, // Double delay each retry
  retryableStatuses: [429, 500, 502, 503, 504],
  headers: {
    'X-Custom-Header': 'value',
  },
});
```

### Per-Request Overrides
```typescript
// Override timeout for a specific request
const data = await httpClient.post(url, payload, {
  timeout: 120000,  // 2 minutes for this request only
  maxRetries: 1,    // Only retry once
  context: { userId: user.id }
});
```

### Skip Circuit Breaker
```typescript
// For critical requests that should never be blocked
const data = await httpClient.post(url, payload, {
  skipCircuitBreaker: true
});
```

### Download Binary Content
```typescript
const { data, contentType } = await httpClient.downloadBinary(imageUrl, {
  context: { operation: 'download_preview' }
});

// data is Uint8Array, contentType is MIME type
```

### HEAD Requests
```typescript
// Check if URL is accessible without downloading
const response = await httpClient.head(voiceoverUrl);
if (response.ok) {
  console.log('URL is accessible');
}
```

---

## Migration Checklist

### For Each Function

- [ ] Import EdgeLogger and HttpClients
- [ ] Create EdgeLogger instance with requestId
- [ ] Replace raw fetch() with appropriate HttpClient
- [ ] Add context to requests (userId, operation, etc.)
- [ ] Remove manual timeout/retry logic
- [ ] Remove manual error handling (let client handle it)
- [ ] Test the function thoroughly

### Example Migration

```typescript
// Before
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  const supabase = createClient(url, key);
  
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      console.error('API failed:', response.status);
      throw new Error('API request failed');
    }
    
    const result = await response.json();
    console.log('Success');
    return new Response(JSON.stringify(result));
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: 'Failed' }), { status: 500 });
  }
});
```

```typescript
// After
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { EdgeLogger } from '../_shared/edge-logger.ts';
import { HttpClients } from '../_shared/http-client.ts';

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();
  const supabase = createClient(url, key);
  const logger = new EdgeLogger('my-function', requestId, supabase, true);
  
  try {
    const httpClient = HttpClients.createGenericClient(logger);
    
    const result = await httpClient.post<ResultType>(apiUrl, data, {
      context: { operation: 'process_data' }
    });
    
    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    logger.error('Request failed', error);
    return new Response(
      JSON.stringify({ error: error.message }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
```

---

## Benefits

### Before Migration
- ❌ Manual timeout handling in every function
- ❌ Inconsistent retry logic (some functions retry, others don't)
- ❌ No circuit breaker protection
- ❌ Unstructured error logging
- ❌ Difficult to debug API issues
- ❌ Code duplication (70+ implementations)

### After Migration
- ✅ Automatic timeout with configurable limits
- ✅ Consistent exponential backoff retry
- ✅ Circuit breaker prevents cascading failures
- ✅ Structured logging with request correlation
- ✅ Easy to debug with requestId tracking
- ✅ Single source of truth (maintainable)

---

## Priority Migration Order

### Phase 1 (Week 1) - Critical Webhooks
1. ✅ `enhance-prompt` - DONE
2. `kie-ai-webhook` - Many KieAI API calls
3. `dodo-webhook-v2` - PostHog tracking
4. `approve-voiceover` - Shotstack, Pixabay, Pexels calls

### Phase 2 (Week 2) - Generation Functions
5. `generate-content` - Lovable AI calls
6. `generate-storyboard` - Lovable AI calls
7. `process-video-job` - ElevenLabs, Shotstack calls
8. `generate-content-sync` - Runware calls

### Phase 3 (Week 3) - Utility Functions
9. All remaining functions with fetch() calls

---

## Testing

### Test Each Migrated Function

1. **Success Path**: Verify normal requests work
2. **Timeout**: Set short timeout and verify handling
3. **Retry**: Simulate 5xx errors, verify retries
4. **Circuit Breaker**: Make 5+ failing requests, verify circuit opens
5. **Logging**: Check logs for structured format with requestId

### Example Test Script

```typescript
// Test timeout handling
const client = new HttpClient(logger, { timeout: 1000 });
try {
  await client.get('https://httpbin.org/delay/5');
  console.log('❌ Should have timed out');
} catch (error) {
  console.log('✅ Timeout handled:', error.message);
}

// Test retry
const client2 = new HttpClient(logger, { maxRetries: 3 });
try {
  await client2.get('https://httpbin.org/status/500');
  console.log('❌ Should have failed');
} catch (error) {
  console.log('✅ Retried and failed correctly');
}
```

---

## Troubleshooting

### Issue: Circuit breaker opens too quickly
**Solution**: Increase threshold in client config
```typescript
const client = new HttpClient(logger, {
  circuitBreaker: new CircuitBreaker(10, 60000) // 10 failures, 60s timeout
});
```

### Issue: Requests timing out
**Solution**: Increase timeout for specific endpoints
```typescript
const result = await client.post(url, data, { timeout: 120000 });
```

### Issue: Too many retries
**Solution**: Reduce maxRetries
```typescript
const client = new HttpClient(logger, { maxRetries: 1 });
```

---

## Next Steps

1. Review this guide
2. Start with Phase 1 functions
3. Test thoroughly after each migration
4. Monitor logs for any issues
5. Report any bugs or improvements needed

**Questions?** Review the code in `supabase/functions/_shared/http-client.ts` for full API documentation.
