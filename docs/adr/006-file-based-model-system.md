# ADR 006: Physical File-Based Model System (Complete Isolation)

## Status
Accepted (January 2025) - **Updated: Full Isolation Architecture**

## Context

Previous system had multiple issues:
1. **Schema Drift**: Database schema diverged from execution logic
2. **Hidden Behavior**: Shared provider files created dependencies
3. **Debug Difficulty**: No single place to understand model behavior
4. **No Audit Trail**: Changes not tracked in version control
5. **Dynamic Imports**: Files stored in database, not as physical files

## Decision

**COMPLETE ISOLATION: Each model is a physical `.ts` file with ZERO shared logic.**

### Core Principles

1. **Physical files ONLY** - No database storage of code
2. **Zero shared logic** - Each file is 100% independent
3. **Direct execution** - No routers, no middleware
4. **Git trackable** - All changes visible in version control
5. **Immutable when locked** - Lock protection in Admin UI

### Architecture

```
src/lib/models/locked/
├── index.ts (Registry - maps IDs to modules)
├── ModelFileGenerator.ts (Utility to generate files)
├── image_editing/
│   ├── ChatGPT_4o_Image.ts
│   ├── Recraft_Crisp_Upscale.ts
│   └── ... (all image editing models)
├── prompt_to_image/
│   ├── ChatGPT_4o_Image.ts
│   └── ... (all prompt-to-image models)
├── prompt_to_video/
│   └── ... (all prompt-to-video models)
├── image_to_video/
│   └... (all image-to-video models)
└── prompt_to_audio/
    └── ... (all prompt-to-audio models)
```

### Each File Contains (100% Isolated)

```typescript
// src/lib/models/locked/{group}/{ModelName}.ts

export const MODEL_CONFIG = { /* frozen config */ };
export const SCHEMA = { /* frozen schema */ };
export function validate(inputs) { /* validation */ }
export function preparePayload(inputs) { /* payload prep */ }
export function calculateCost(inputs) { /* cost calc */ }
export async function execute(params) {
  // Complete generation flow:
  // - Validate inputs
  // - Calculate cost
  // - Create DB record
  // - Call provider API (inlined)
  // - Update DB with response
  // - Start polling
  // - Return generation ID
}
```

### Execution Flow (Direct - No Routing)

```
User clicks Generate
  ↓
executeGeneration() called
  ↓
Import from registry: getModelModule(record_id)
  ↓
Direct call: modelModule.execute(params)
  ↓
Model file handles EVERYTHING internally
  ↓
Returns generation ID
```

### NO LONGER USED

- ❌ `ModelRouter.ts` (deleted - no routing)
- ❌ `locked_file_contents` column (database doesn't store code)
- ❌ Dynamic imports from database
- ❌ Shared provider files for locked models

## Benefits

### Complete Isolation
- Zero dependencies between models
- Changes to one model never affect others
- Each file is fully self-contained

### Git Trackable
- All model changes visible in commits
- Can diff any change
- Easy rollback to previous versions

### Direct Execution
- No routing layers
- No shared logic to break
- UI → File → API (simple path)

### Production Stability
- Locked files are immutable
- Admin UI enforces lock protection
- Can't accidentally break production models

### Debugging Simplicity
- Read one file, understand everything
- No hidden logic in providers
- Clear error messages

## Consequences

### Positive

1. **Eliminates 404 errors** - Files always exist after generation
2. **Clear model behavior** - No surprises from shared logic
3. **Easy debugging** - Everything in one file
4. **Git-trackable changes** - Version control for models
5. **Production reliability** - Locked files prevent accidental changes

### Negative

1. **Code duplication** - Each file has its own API call logic
2. **More files to manage** - One file per model
3. **Initial migration effort** - Need to generate files for all existing models

### Mitigation

- Accept duplication as cost of isolation (worth it for clarity)
- Use code generation (`generateModelFile.ts`) to maintain consistency
- Document file structure clearly in README
- Create migration script to generate all files at once

## Implementation Details

### File Structure

```
src/lib/models/
├── prompt_to_video/
│   ├── Google_Veo_3_1_Fast.ts
│   ├── Google_Veo_3_1_HQ.ts
│   └── ...
├── prompt_to_image/
│   └── ...
├── image_to_video/
│   └── ...
└── README.md
```

### File Template

Each generated file contains:

```typescript
// Header with metadata
// MODEL_CONFIG (frozen configuration)
// SCHEMA (frozen UI inputs)
// validate() function
// preparePayload() function (model-specific transformations)
// calculateCost() function
// callProviderAPI() function (inlined API logic)
// pollForResult() function (inlined polling logic)
// execute() function (main entry point)
```

### Lock Protection

- Locked models have `isLocked: true` in MODEL_CONFIG
- File header shows lock status and locked-by user
- Admin UI prevents editing locked models without unlocking first

## Migration Path

1. Create `write-model-file` edge function
2. Update `generateModelFile.ts` to inline all logic
3. Update `ModelFormDialog.tsx` to call edge function on save
4. Run migration script to generate files for all existing models
5. Update `useModelSchema.ts` to only use files (no DB fallback)
6. Update `ModelRouter.ts` to simplify error handling
7. Update `executeGeneration.ts` to route all models through files
8. Remove model-specific logic from providers
9. Update documentation

## Success Criteria

✅ All models have `.ts` files on disk
✅ Admin UI generates/regenerates files correctly
✅ Locked models cannot be edited without unlocking
✅ All generations work (locked and unlocked models)
✅ Database `input_schema` column is unused
✅ Clear error messages when files are missing
✅ Documentation updated

## References

- `src/lib/models/generateModelFile.ts` - File generation logic
- `src/lib/models/ModelRouter.ts` - File execution router
- `src/hooks/useModelSchema.ts` - Schema loading from files
- `supabase/functions/write-model-file/` - Edge function for file writing