# Template Usage Guide

This guide explains how to use the standardized templates for hooks and edge functions to ensure consistency, type safety, and best practices across the codebase.

## Overview

The templates provide a standardized foundation with:
- ✅ **Type Safety**: Zod validation for inputs/outputs
- ✅ **Error Handling**: Structured error handling with AppError classes
- ✅ **Logging**: Comprehensive structured logging with request IDs
- ✅ **Performance**: Automatic timing and performance metrics
- ✅ **Testing**: Easy to test with clear contracts
- ✅ **Documentation**: JSDoc comments and usage examples

## File Locations

- **Central Types**: `src/types/index.ts`
- **Hook Template**: `docs/templates/hook-template.ts`
- **Edge Function Template**: `docs/templates/edge-function-template.ts`

---

## Using the Hook Template

### Step 1: Copy the Template

```bash
cp docs/templates/hook-template.ts src/hooks/useYourFeature.ts
```

### Step 2: Replace Placeholders

Search and replace in your new file:

| Placeholder | Replace With | Example |
|------------|--------------|---------|
| `Feature` | Your feature name | `Generation` |
| `feature` | Lowercase feature name | `generation` |
| `useFeature` | Your hook name | `useGeneration` |
| `'features'` | Your table name | `'generations'` |

### Step 3: Define Your Schemas

Update the Zod schemas with your actual data structure:

```typescript
const GenerationInputSchema = z.object({
  prompt: z.string().min(1, "Prompt is required"),
  model: z.enum(['gpt-4', 'claude-3']),
  temperature: z.number().min(0).max(1).default(0.7),
  max_tokens: z.number().positive().optional(),
});

const GenerationOutputSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  prompt: z.string(),
  result: z.string(),
  status: z.enum(['pending', 'completed', 'failed']),
  created_at: z.string(),
  updated_at: z.string(),
});
```

### Step 4: Update Query Logic

Replace the query logic with your actual implementation:

```typescript
const { data, error } = await supabase
  .from('generations')
  .select('*')
  .eq('user_id', user.id)
  .order('created_at', { ascending: false });
```

### Step 5: Customize Return Interface

Add or remove methods based on your needs:

```typescript
return {
  data,
  isLoading,
  error,
  refetch,
  createGeneration: createMutation.mutate,
  cancelGeneration: cancelMutation.mutate, // Custom method
  isCreating: createMutation.isPending,
};
```

### Complete Example

```typescript
// src/hooks/useGeneration.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { logger, generateRequestId, PerformanceTimer } from "@/lib/logger";
import { handleError } from "@/lib/errors";

const GenerationInputSchema = z.object({
  prompt: z.string().min(1),
  model: z.string(),
});

const GenerationOutputSchema = z.object({
  id: z.string().uuid(),
  prompt: z.string(),
  result: z.string(),
  status: z.string(),
  created_at: z.string(),
});

export type GenerationInput = z.infer<typeof GenerationInputSchema>;
export type GenerationOutput = z.infer<typeof GenerationOutputSchema>;

export function useGeneration() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const requestId = generateRequestId();
  const hookLogger = logger.child({ hook: 'useGeneration', requestId });

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['generations'],
    queryFn: async () => {
      const timer = new PerformanceTimer('fetch-generations', { requestId });
      
      try {
        hookLogger.info('Fetching generations');
        
        const { data, error } = await supabase
          .from('generations')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;

        const validated = z.array(GenerationOutputSchema).parse(data);
        timer.end({ count: validated.length });
        
        return validated;
      } catch (error) {
        const appError = handleError(error, { operation: 'fetch-generations', requestId });
        hookLogger.error('Failed to fetch', error as Error);
        throw appError;
      }
    },
  });

  const createMutation = useMutation({
    mutationFn: async (input: GenerationInput) => {
      const timer = new PerformanceTimer('create-generation', { requestId });
      
      try {
        const validated = GenerationInputSchema.parse(input);
        hookLogger.info('Creating generation');
        
        const { data, error } = await supabase
          .from('generations')
          .insert(validated)
          .select()
          .single();

        if (error) throw error;

        const result = GenerationOutputSchema.parse(data);
        timer.end({ generationId: result.id });
        
        return result;
      } catch (error) {
        const appError = handleError(error, { operation: 'create-generation', requestId });
        hookLogger.error('Failed to create', error as Error);
        throw appError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['generations'] });
      toast({ title: "Generation created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create", description: error.message, variant: "destructive" });
    },
  });

  return {
    data,
    isLoading,
    error: error as Error | null,
    refetch: async () => { await refetch(); },
    createGeneration: createMutation.mutate,
    isCreating: createMutation.isPending,
  };
}
```

---

## Using the Edge Function Template

### Step 1: Create Function Directory

```bash
mkdir -p supabase/functions/your-function-name
cp docs/templates/edge-function-template.ts supabase/functions/your-function-name/index.ts
```

### Step 2: Replace Function Name

Search and replace `'your-function-name'` with your actual function name.

### Step 3: Define Environment Variables

Add any additional environment variables you need:

```typescript
const EnvSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1), // Your custom env var
  MAX_RETRIES: z.string().transform(Number).default('3'),
});
```

### Step 4: Define Request Schema

Update the request body schema:

```typescript
const RequestBodySchema = z.object({
  prompt: z.string().min(1),
  model: z.enum(['gpt-4', 'claude-3']),
  temperature: z.number().min(0).max(1).default(0.7),
});
```

### Step 5: Implement Business Logic

Replace the placeholder business logic:

```typescript
// Your business logic
logger.info('Generating content', { 
  model: body.model,
  promptLength: body.prompt.length,
});

// Call external API
const response = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: body.model,
    messages: [{ role: 'user', content: body.prompt }],
    temperature: body.temperature,
  }),
});

if (!response.ok) {
  throw new Error(`OpenAI API error: ${response.statusText}`);
}

const aiResult = await response.json();

// Store result in database
const { data, error } = await supabase
  .from('generations')
  .insert({
    user_id: user.id,
    prompt: body.prompt,
    result: aiResult.choices[0].message.content,
    model: body.model,
    status: 'completed',
  })
  .select()
  .single();

if (error) throw error;

const result = {
  id: data.id,
  result: data.result,
  tokensUsed: aiResult.usage.total_tokens,
};
```

### Step 6: Configure Function

Add to `supabase/config.toml`:

```toml
[functions.your-function-name]
verify_jwt = true  # Set to false if public
```

### Step 7: Add Secrets (if needed)

If your function uses API keys, add them as secrets in the Lovable backend settings.

---

## Best Practices

### 1. Always Validate Inputs

```typescript
// ✅ Good
const input = InputSchema.parse(rawInput);

// ❌ Bad
const input = rawInput as Input;
```

### 2. Use Structured Logging

```typescript
// ✅ Good
logger.info('Operation completed', { 
  duration, 
  resultCount: data.length 
});

// ❌ Bad
console.log('Done!');
```

### 3. Handle Errors Properly

```typescript
// ✅ Good
try {
  const result = await operation();
  return result;
} catch (error) {
  const appError = handleError(error, { operation: 'name', context });
  logger.error('Operation failed', error as Error);
  throw appError;
}

// ❌ Bad
try {
  return await operation();
} catch (e) {
  console.error(e);
  throw e;
}
```

### 4. Add Performance Timing

```typescript
// ✅ Good
const timer = new PerformanceTimer('operation-name', { requestId });
// ... do work ...
timer.end({ resultCount: data.length });

// ❌ Bad
const start = Date.now();
// ... do work ...
console.log('Took', Date.now() - start);
```

### 5. Use Type Guards

```typescript
// ✅ Good
if (isUUID(value)) {
  // TypeScript knows value is UUID here
}

// ❌ Bad
if (typeof value === 'string') {
  // Could be any string
}
```

---

## Testing Your Implementation

### Hook Testing

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { useGeneration } from './useGeneration';

describe('useGeneration', () => {
  it('should fetch generations successfully', async () => {
    const { result } = renderHook(() => useGeneration());
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    
    expect(result.current.data).toBeDefined();
    expect(result.current.error).toBeNull();
  });
});
```

### Edge Function Testing

Use the Supabase CLI or test with curl:

```bash
curl -X POST https://your-project.supabase.co/functions/v1/your-function-name \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "test", "model": "gpt-4"}'
```

---

## Checklist

Before committing your new hook or edge function:

- [ ] Copied template to correct location
- [ ] Replaced all placeholders
- [ ] Defined Zod schemas for inputs/outputs
- [ ] Implemented business logic
- [ ] Added comprehensive logging
- [ ] Added error handling
- [ ] Added performance timing
- [ ] Added JSDoc comments
- [ ] Tested locally
- [ ] Updated any related documentation

---

## Next Steps

Once you've created hooks and edge functions using these templates:

1. Run validation: `npm run validate:edge-functions`
2. Check types: `npm run type-check` (when implemented)
3. Run tests: `npm test` (when implemented)
4. Review logs in development
5. Monitor performance metrics

## Support

For questions or issues with the templates:
- Review existing implementations in the codebase
- Check the improvement plan in `docs/CODEBASE_AUDIT_2025.md`
- Consult the ADR documents in `docs/adr/`
