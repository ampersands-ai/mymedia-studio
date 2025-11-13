# Week 4 Plan: Additional Edge Function Hardening

## Objective
Continue the refactoring effort from Week 3 by hardening additional edge functions with Zod validation, type safety, and structured error handling.

## Status: 🔄 IN PROGRESS

---

## Target Edge Functions

### Priority 1: Generate Content Sync (498 lines)
**File:** `supabase/functions/generate-content-sync/index.ts`

**Issues Found:**
- ❌ `any` type on line 45 (user variable)
- ❌ `any` type on line 97 (model variable)
- ❌ No Zod validation for request body
- ❌ Manual JSON parsing without validation

**Refactoring Plan:**
1. Add type definitions (EdgeFunctionUser, Model)
2. Implement Zod schema for sync generation requests
3. Remove `any` types with proper interfaces
4. Enhance error handling with validation
5. Maintain exact same API contract

**Similar to:** generate-content (already completed)

---

### Priority 2: Process Video Job (Large file)
**File:** `supabase/functions/process-video-job/index.ts`

**Issues Found:**
- ❌ `any` type on line 337 (errorDetails)
- Potential for better error handling structure

**Refactoring Plan:**
1. Create ErrorDetails interface
2. Add Zod validation for API responses
3. Enhance error logging structure

---

### Priority 3: Approve Voiceover (Large file)
**File:** `supabase/functions/approve-voiceover/index.ts`

**Issues Found:**
- ❌ Multiple `any` types (lines 588, 625, 767, 821)
- Complex Shotstack JSON building without types
- Caption asset type coercion

**Refactoring Plan:**
1. Create Shotstack API interfaces
2. Type caption clip structure
3. Type video edit configuration
4. Add runtime validation

---

### Priority 4: Other Edge Functions
**Files with `any` types:**
- `generate-suno-mp4/index.ts` (line 223)
- `json2video-webhook/index.ts` (line 84)
- `kie-ai-webhook/index.ts` (line 403)
- `rate-limiter/index.ts` (line 185)

**Refactoring Strategy:**
- Review each `any` usage
- Create appropriate interfaces
- Add validation where needed
- Document why `any` is used if unavoidable

---

## Week 4 Success Criteria

- [ ] Zero `any` types in generate-content-sync
- [ ] Zod validation added to sync generation
- [ ] Type safety verified in process-video-job
- [ ] Shotstack types defined in approve-voiceover
- [ ] All refactored functions deployed successfully
- [ ] No breaking changes to APIs
- [ ] Documentation updated

---

## Refactoring Patterns (From Week 3)

### 1. Type Definitions
```typescript
interface EdgeFunctionUser {
  id: string;
  email?: string;
}

interface Model {
  id: string;
  record_id: string;
  provider: string;
  content_type: string;
  // ... other fields
}
```

### 2. Zod Validation
```typescript
import { z } from "zod";

const RequestSchema = z.object({
  model_id: z.string().optional(),
  model_record_id: z.string().optional(),
  prompt: z.string(),
  // ... other fields
});

type Request = z.infer<typeof RequestSchema>;
```

### 3. Error Handling
```typescript
try {
  const validated = RequestSchema.parse(requestBody);
} catch (zodError: unknown) {
  logger.error('Validation failed', zodError);
  return new Response(
    JSON.stringify({ 
      error: 'Invalid request',
      details: zodError instanceof Error ? zodError.message : 'Validation error'
    }),
    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
```

---

## Timeline

**Session 1 (Current):** generate-content-sync refactoring
**Session 2:** process-video-job and smaller edge functions
**Session 3:** approve-voiceover (complex Shotstack types)
**Session 4:** Testing and documentation

**Target Completion:** 2-3 working days

---

## Notes

- Maintain backward compatibility at all times
- Deploy incrementally to catch issues early
- Keep git commits focused and small
- Test each function after refactoring
- Update WEEK_4_COMPLETION.md as we progress
