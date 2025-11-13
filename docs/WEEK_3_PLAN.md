# Week 3: Edge Function Hardening - Implementation Plan

## Overview
Refactor 3 critical edge functions to use Zod validation, structured error handling, and comprehensive logging following established patterns.

**Edge Functions to Refactor:**
1. 🔄 `workflow-executor` - Orchestrates multi-step workflow execution
2. 🔄 `generate-caption` - Generates social media captions and hashtags
3. 🔄 `generate-content` - Core generation pipeline (479 lines)

---

## Current Issues Identified

### 1. workflow-executor/index.ts (208 lines)
**Issues:**
- Uses deprecated `serve` from "std/http/server.ts" instead of `Deno.serve()`
- Uses `any` types (line 69, 72)
- Manual error handling without Zod validation
- No input validation schemas
- Uses `createClient` from "supabase" instead of correct import

**Lines with `any`:**
- Line 69: `const steps = workflow.workflow_steps as any[];`
- Line 72: `const totalSteps = steps.length;`

### 2. generate-caption/index.ts (183 lines)
**Issues:**
- No Zod validation for input parameters
- Basic error handling with console.log
- No structured logging
- Missing RequestID tracking
- No retry logic for AI failures

### 3. generate-content/index.ts (479 lines)
**Issues:**
- Multiple `any` types throughout (lines 60, 122-124, 318, 320, 387-389, etc.)
- Complex logic without type safety
- Manual validation instead of Zod schemas
- Uses EdgeLogger but could be more consistent

**Lines with `any`:**
- Line 60: `let user: any;`
- Lines 122-124: `let model: any;`, `let template: any`, `let parameters: any`
- Line 318: `parameters: Record<string, any>`
- Line 387: `function normalizeParameterKeys(params: Record<string, any>)`

---

## Refactoring Strategy

### Phase 1: Update Deprecated Patterns (All Functions)

#### Fix workflow-executor imports:
```typescript
// ❌ OLD - Deprecated
import { serve } from "std/http/server.ts";
import { createClient } from "supabase";

// ✅ NEW - Modern Deno
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  // ... handler
});
```

### Phase 2: Add Zod Schemas

#### Create shared schemas file:
`supabase/functions/_shared/schemas.ts`

```typescript
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// Workflow Executor Schemas
export const WorkflowExecutorRequestSchema = z.object({
  workflow_template_id: z.string().uuid(),
  user_inputs: z.record(z.unknown()),
});

export const WorkflowStepSchema = z.object({
  step_number: z.number().int().positive(),
  step_name: z.string(),
  model_id: z.string().optional(),
  model_record_id: z.string().uuid().optional(),
  prompt_template: z.string(),
  parameters: z.record(z.unknown()).optional(),
  input_mappings: z.record(z.string()).optional(),
});

// Generate Caption Schemas
export const GenerateCaptionRequestSchema = z.object({
  generation_id: z.string().uuid().optional(),
  video_job_id: z.string().uuid().optional(),
  prompt: z.string().min(1),
  content_type: z.enum(['image', 'video']),
  model_name: z.string().optional(),
}).refine(
  (data) => data.generation_id || data.video_job_id,
  { message: "Either generation_id or video_job_id is required" }
);

export const CaptionResponseSchema = z.object({
  caption: z.string().min(50).regex(/[.!?]$/),
  hashtags: z.array(z.string().startsWith('#')).length(15),
});

// Generate Content Schemas
export const GenerateContentRequestSchema = z.object({
  template_id: z.string().uuid().optional(),
  model_id: z.string().optional(),
  model_record_id: z.string().uuid().optional(),
  prompt: z.string().optional(),
  custom_parameters: z.record(z.unknown()).default({}),
  enhance_prompt: z.boolean().default(false),
  enhancement_provider: z.enum(['lovable_ai', 'openai']).default('lovable_ai'),
  workflow_execution_id: z.string().uuid().optional(),
  workflow_step_number: z.number().int().positive().optional(),
  user_id: z.string().uuid().optional(),
  test_mode: z.boolean().default(false),
}).refine(
  (data) => {
    const hasTemplate = Boolean(data.template_id);
    const hasModel = Boolean(data.model_id || data.model_record_id);
    return (hasTemplate && !hasModel) || (!hasTemplate && hasModel);
  },
  { message: "Must provide either template_id or model_id/model_record_id, not both" }
);

export const ModelSchema = z.object({
  id: z.string(),
  record_id: z.string().uuid(),
  provider: z.string(),
  base_token_cost: z.number().nonnegative(),
  input_schema: z.object({
    properties: z.record(z.unknown()),
    required: z.array(z.string()).optional(),
  }).optional(),
  is_active: z.boolean(),
});

export const TemplateSchema = z.object({
  id: z.string().uuid(),
  preset_parameters: z.record(z.unknown()).optional(),
  enhancement_instruction: z.string().nullable().optional(),
  ai_models: ModelSchema,
});
```

### Phase 3: Implement Structured Error Types

```typescript
// Add to _shared/error-handler.ts or create new file
export class WorkflowError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'WorkflowError';
  }
}

export class CaptionGenerationError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'CaptionGenerationError';
  }
}

export class ContentGenerationError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ContentGenerationError';
  }
}
```

### Phase 4: Replace `any` Types

#### workflow-executor:
```typescript
// Before
const steps = workflow.workflow_steps as any[];

// After
const steps = WorkflowStepSchema.array().parse(workflow.workflow_steps);
```

#### generate-content:
```typescript
// Before
let user: any;
let model: any;
let template: any = null;
let parameters: any = {};

// After
let user: { id: string };
let model: z.infer<typeof ModelSchema>;
let template: z.infer<typeof TemplateSchema> | null = null;
let parameters: Record<string, unknown> = {};
```

---

## Implementation Schedule

### Day 1: Shared Schemas & Error Types (2 hours)
1. Create `_shared/schemas.ts` with all Zod schemas
2. Add custom error classes
3. Update imports in existing shared utilities

### Day 2: Refactor workflow-executor (4 hours)
1. Update imports (Deno.serve, correct Supabase import)
2. Add Zod input validation
3. Replace `any` types with proper schemas
4. Enhance error handling with structured errors
5. Test workflow execution flow

### Day 3: Refactor generate-caption (3 hours)
1. Add Zod validation for request body
2. Add structured logging with EdgeLogger
3. Implement retry logic for AI failures
4. Add request ID tracking
5. Test caption generation

### Day 4: Refactor generate-content (6 hours)
1. Add comprehensive Zod schemas
2. Replace all `any` types
3. Refactor validation logic to use Zod
4. Improve error handling
5. Add missing logging
6. Test all generation paths (template, custom, workflow)

### Day 5: Integration Testing & Documentation (3 hours)
1. Test all 3 functions end-to-end
2. Verify error scenarios
3. Check logging output
4. Update function documentation
5. Create Week 3 completion report

---

## Success Criteria

### Code Quality:
- ✅ Zero `any` types in all 3 functions
- ✅ Zod validation for all inputs
- ✅ Structured error handling throughout
- ✅ Modern Deno patterns (Deno.serve)
- ✅ Correct Supabase imports
- ✅ Request ID tracking in all logs

### Functionality:
- ✅ All functions maintain existing behavior
- ✅ Improved error messages
- ✅ Proper validation feedback
- ✅ No breaking changes to API contracts

### Testing:
- ✅ Each function tested in isolation
- ✅ Integration tests pass
- ✅ Error paths validated
- ✅ Logging output verified

---

## Risk Mitigation

1. **Breaking Changes:**
   - Keep existing API contracts
   - Add validation without changing response formats
   - Test thoroughly before deployment

2. **Large File Complexity:**
   - Break generate-content refactor into smaller chunks
   - Test each section independently
   - Use feature flags if needed

3. **Performance:**
   - Monitor validation overhead
   - Use efficient Zod parsing
   - Cache schema validations where possible

---

## Deliverables

1. **Refactored Edge Functions:**
   - workflow-executor/index.ts
   - generate-caption/index.ts
   - generate-content/index.ts

2. **Shared Utilities:**
   - _shared/schemas.ts (new)
   - Updated error types

3. **Documentation:**
   - Updated function docs
   - API contract documentation
   - Week 3 completion report

4. **Testing Report:**
   - Test coverage
   - Performance benchmarks
   - Known issues/limitations

---

## Next Steps After Week 3

- **Week 4:** Refactor remaining high-priority edge functions
- **Week 5-6:** Type safety cleanup across all edge functions
- **Week 7:** Comprehensive testing infrastructure
