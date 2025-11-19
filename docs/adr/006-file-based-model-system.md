# ADR 006: File-Based Model System

## Status
Accepted (January 2025)

## Context

Previous system used database `input_schema` column for dynamic model loading. This architecture caused several problems:

1. **Schema Drift**: Schema in database could diverge from actual execution logic
2. **Hidden Behavior**: Model-specific transformations scattered across shared provider files
3. **Debug Difficulty**: No single place to understand a model's complete behavior
4. **No Audit Trail**: Schema changes not tracked in version control
5. **Unclear Ownership**: Hard to know where to make changes for a specific model

## Decision

**All models (locked and unlocked) use TypeScript files as the single source of truth.**

### New Architecture

1. **Every model has a `.ts` file** in `src/lib/models/{group}/`
2. **File contains everything:**
   - Schema definition (what UI shows)
   - Validation rules
   - Payload preparation (model-specific transformations)
   - API call logic
   - Polling logic
   - Cost calculation
3. **Database stores ONLY metadata:**
   - Display name
   - Logo URL
   - Is active
   - Is locked
   - File path
4. **No dynamic schema loading from database**

### File Generation

- Admin UI generates files via `write-model-file` edge function
- Files are written to disk (not just stored in database)
- Locked models freeze the file (requires unlock to regenerate)
- Unlocked models can be edited and regenerated from Admin UI

### Execution Flow

```
User clicks Generate
  ↓
executeGeneration() called
  ↓
ModelRouter.executeModelGeneration()
  ↓
Import model's .ts file
  ↓
Call file's execute() function
  ↓
File handles everything internally
```

## Benefits

### Single Source of Truth
- File defines EVERYTHING about the model
- No hidden logic in shared providers
- Read the file, understand the model

### Audit Trail
- All changes tracked in Git
- Diff shows exactly what changed
- Can revert to previous versions

### Isolation
- Each model is independent
- Changes to one model don't affect others
- No shared execution logic to break

### Transparency
- Clear what each model does
- Easy to debug issues
- New developers can understand quickly

### Production Stability
- Locked models can't change accidentally
- Unlocked models can be iterated safely
- Clear distinction between stable and experimental

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