# Architecture: Single Source of Truth for AI Models

## Decision: TypeScript Registry as Single Source of Truth

The platform uses **TypeScript model files in `src/lib/models/locked/`** as the single source of truth for all AI model metadata and execution logic.

## Architecture: Registry-Only System

The system has ONE source for model information:

### TypeScript Registry Files (`src/lib/models/locked/`)
- **Contains**: Complete execution logic + metadata
- **Used by**: All parts of the application
- **Examples**:
  - `prompt_to_video/Google_Veo_3_1_HQ.ts`
  - `prompt_to_image/runware_flux_1_1_pro.ts`
- **Characteristics**:
  - Static TypeScript files
  - Contains `MODEL_CONFIG` and `generate()` function
  - Version controlled in Git
  - Type-safe at compile time

## Registry Architecture

### What Was Removed

**Removed:**
- Database-backed model management
- Dual-source confusion
- Runtime model editing capabilities

**Updated Components to Use Registry:**
1. `AdminDashboard.tsx` - Model counts from registry
2. `ModelAlerts.tsx` - Model list from registry
3. `ComprehensiveModelTestPage.tsx` - Model list from registry
4. `Templates.tsx` - Model costs from registry
5. `TemplateFormDialog.tsx` - Model selection from registry
6. `WorkflowTestDialog.tsx` - Model details from registry

### How to Read Models

**Registry Pattern:**
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

## Model Editing

All model changes must be made by:
1. Editing the TypeScript file in `src/lib/models/locked/`
2. Committing changes to version control
3. Deploying the updated code

There is no runtime editing capability by design. This ensures:
- Type safety
- Version control
- Predictable behavior
- No configuration drift

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
