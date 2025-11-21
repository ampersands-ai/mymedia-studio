# Architecture: Single Source of Truth for AI Models

## Decision: TypeScript Registry as Single Source of Truth

As of this migration, the platform uses **TypeScript model files in `src/lib/models/locked/`** as the single source of truth for all AI model metadata and execution logic.

## Before: Confusing Dual-Source Architecture

Previously, the system had two conflicting sources for model information:

### 1. TypeScript Registry Files (`src/lib/models/locked/`)
- **Contains**: Execution logic + metadata
- **Used by**: Main application for actual AI generation
- **Examples**:
  - `prompt_to_video/Google_Veo_3_1_HQ.ts`
  - `prompt_to_image/runware_flux_1_1_pro.ts`
- **Characteristics**:
  - Static TypeScript files
  - Contains `MODEL_CONFIG` and `generate()` function
  - Cannot be edited at runtime

### 2. Database Table (`ai_models`)
- **Contains**: Metadata copy only (NO execution logic)
- **Used by**: Some admin tools (ModelAlerts, testing pages, templates)
- **Problem**: Edits to database had NO EFFECT on actual generation

### The Problem

The `/admin/models-db` page allowed editing the database, which gave a **false impression of control**:
- Admins could edit model metadata in the database
- But the main app IGNORED those changes
- Changes didn't affect actual AI generation
- Created confusion and inconsistency

## After: Single Source of Truth

### What Changed

**Removed:**
- `/admin/models-db` page (990 lines) - confusing database-backed admin UI
- `useAIModelsDB` hooks - database CRUD operations
- All database queries to `ai_models` table in admin components

**Updated Components to Use Registry:**
1. `AdminDashboard.tsx` - Model counts from registry
2. `ModelAlerts.tsx` - Model list from registry
3. `ComprehensiveModelTestPage.tsx` - Model list from registry
4. `Templates.tsx` - Model costs from registry
5. `TemplateFormDialog.tsx` - Model selection from registry
6. `WorkflowTestDialog.tsx` - Model details from registry

### How to Read Models Now

**Old Pattern (Database):**
```typescript
const { data, error } = await supabase
  .from("ai_models")
  .select("id, model_name")
  .order("model_name");
```

**New Pattern (Registry):**
```typescript
import { getAllModels } from "@/lib/models/registry";

const allModels = getAllModels();
const models = allModels.map(m => ({
  id: m.MODEL_CONFIG.modelId,
  model_name: m.MODEL_CONFIG.modelName,
  provider: m.MODEL_CONFIG.provider,
  // ... other fields
})).sort((a, b) => a.model_name.localeCompare(b.model_name));
```

## Registry Structure

Each model file in `src/lib/models/locked/` contains:

```typescript
export const MODEL_CONFIG = {
  recordId: "unique-uuid",
  modelId: "provider:model-name",
  modelName: "Human Readable Name",
  provider: "runware" | "kie_ai" | "elevenlabs" | ...,
  contentType: "image" | "video" | "audio",
  isActive: true,
  baseTokenCost: 100,
  estimatedTimeSeconds: 30,
  inputSchema: { /* JSON Schema */ },
  // ... other configuration
};

export async function generate(params) {
  // Execution logic
}
```

## Benefits of Single Source

1. **✅ No Confusion** - Only one place to look for model configuration
2. **✅ Consistency** - What you see is what you get
3. **✅ Type Safety** - TypeScript catches errors at compile time
4. **✅ Version Control** - Changes tracked in git, not database
5. **✅ Clearer Admin** - Admin tools show actual system state
6. **✅ Easier Testing** - Predictable behavior from static files

## Accessing Models in Code

### Get All Models
```typescript
import { getAllModels } from "@/lib/models/registry";

const allModels = getAllModels();
// Returns: Array of model exports with MODEL_CONFIG and generate()
```

### Filter Models
```typescript
const activeModels = getAllModels()
  .filter(m => m.MODEL_CONFIG.isActive);

const videoModels = getAllModels()
  .filter(m => m.MODEL_CONFIG.contentType === 'video');
```

### Find Specific Model
```typescript
const model = getAllModels()
  .find(m => m.MODEL_CONFIG.modelId === 'runware:flux-1.1-pro');
```

## What About Schema Editing?

**Note for ComprehensiveModelTestPage:**

The schema editing functionality in `ComprehensiveModelTestPage.tsx` still attempts to update the database. This functionality is **currently ineffective** because:
- The registry reads from static TypeScript files
- Database edits don't affect the registry
- The main app ignores database changes

**Options for future:**
1. Remove schema editing UI entirely
2. Build a system to generate/update TypeScript files programmatically
3. Accept that schema editing only works for truly "unlocked" models (if any exist)

For now, the schema editing code remains but has no effect on actual generation.

## Database Table Status

The `ai_models` database table still exists but is **no longer used** by the application for:
- Model selection
- Model metadata
- Generation execution

It may be safely dropped or kept for historical purposes.

## Migration Summary

**Files Modified:**
- `src/pages/admin/AdminDashboard.tsx` ✅
- `src/pages/admin/ModelAlerts.tsx` ✅
- `src/pages/admin/ComprehensiveModelTestPage.tsx` ✅
- `src/pages/Templates.tsx` ✅
- `src/components/admin/TemplateFormDialog.tsx` ✅
- `src/components/admin/WorkflowTestDialog.tsx` ✅

**Files Deleted:**
- `src/pages/admin/AIModelsDB.tsx` (990 lines) ❌
- `src/hooks/useAIModelsDB.tsx` ❌

**Routes Removed:**
- `/admin/models-db` from `App.tsx` ❌

**Navigation Updated:**
- Removed duplicate "AI Models (Database)" link from `AdminLayout.tsx` ✅
- Renamed "AI Models (Registry)" to just "AI Models" ✅

## Future Considerations

1. **Model Addition**: New models must be added as TypeScript files in `src/lib/models/locked/`
2. **Model Updates**: Model configuration changes require code changes and deployment
3. **Dynamic Models**: If truly dynamic models are needed, consider a hybrid approach with clear separation
4. **Database Cleanup**: The `ai_models` table can be dropped after verifying no other code depends on it

## Related Documentation

- [API Keys Configuration](./API_KEYS_CONFIGURATION.md) - How API keys are routed by provider
- [Comprehensive Code Review](./COMPREHENSIVE_CODE_REVIEW.md) - Security audit findings
