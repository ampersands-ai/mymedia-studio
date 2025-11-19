# AI Model Files

This directory contains TypeScript files for **ALL AI models** (locked and unlocked).

## Philosophy

**Every model = One .ts file**

Each file is the complete, isolated definition of the model's behavior:
- What UI inputs to show
- How to validate those inputs  
- How to transform them into API payloads
- How to call the provider API
- How to poll for results
- How to calculate costs

**Database is just a catalog** - it stores metadata like display name, logo, and which group the model belongs to. The `.ts` file is the source of truth for behavior.

## Directory Structure

```
src/lib/models/
├── prompt_to_video/          # Text-to-video models
│   ├── Google_Veo_3_1_Fast.ts
│   ├── Google_Veo_3_1_HQ.ts
│   └── ...
├── prompt_to_image/          # Text-to-image models
│   └── ...
├── image_to_video/           # Image-to-video models
│   └── ...
├── prompt_to_audio/          # Audio generation models
│   └── ...
├── image_editing/            # Image editing models
│   └── ...
├── generateModelFile.ts      # Template for generating model files
└── README.md                 # This file
```

## File Lifecycle

### Creating a Model

1. Admin opens Admin UI → Models → Create Model
2. Admin fills in model details (name, provider, schema, etc.)
3. Admin clicks "Save"
4. System generates `.ts` file via `generateModelFile.ts`
5. Edge function writes file to disk
6. Database stores metadata + file path
7. Model is ready to use

### Editing a Model

**Unlocked models:**
1. Admin opens model in Admin UI
2. Admin edits schema or settings
3. Admin clicks "Save"
4. System regenerates `.ts` file with new schema
5. File is written to disk
6. Model updated

**Locked models:**
1. Admin must click "Unlock" first
2. Then follow unlocked model flow
3. Optionally click "Lock" again to freeze

### Locking a Model

**Purpose:** Freeze a model's behavior for production use

1. Admin clicks "Lock" on model
2. System generates final `.ts` file with current schema
3. File is marked as locked in header
4. Database sets `is_locked: true`
5. Admin UI prevents edits without unlocking

**Benefits:**
- Production stability (can't accidentally change)
- Clear audit trail (Git shows when locked)
- Testing isolation (lock after validation)

## File Structure

Each model file contains:

```typescript
/**
 * Model metadata header
 * - Generated timestamp
 * - Lock status
 * - Locked by user (if locked)
 */

import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import type { ExecuteGenerationParams } from "@/lib/generation/executeGeneration";

// ============================================================================
// MODEL CONFIGURATION (frozen at generation time)
// ============================================================================
export const MODEL_CONFIG = { /* ... */ };

// ============================================================================
// FROZEN SCHEMA (defines UI inputs)
// ============================================================================
export const SCHEMA = { /* JSON Schema */ };

// ============================================================================
// VALIDATION (check user inputs)
// ============================================================================
export function validate(inputs: Record<string, any>): { valid: boolean; error?: string } {
  // Required field checks
}

// ============================================================================
// PREPARE PAYLOAD (model-specific transformations)
// ============================================================================
export function preparePayload(inputs: Record<string, any>): Record<string, any> {
  // Transform inputs for provider API
  // Example: Merge startFrame + endFrame → imageUrls for Veo3
}

// ============================================================================
// CALCULATE COST (apply multipliers)
// ============================================================================
export function calculateCost(inputs: Record<string, any>): number {
  // Base cost + multipliers
}

// ============================================================================
// CALL PROVIDER API (inlined - no shared code)
// ============================================================================
async function callProviderAPI(payload: Record<string, any>, generationId: string): Promise<string> {
  // Make API call to provider
}

// ============================================================================
// POLL FOR RESULT (inlined - no shared code)
// ============================================================================
async function pollForResult(generationId: string, startPollingFn: (id: string) => void): Promise<void> {
  // Start polling
}

// ============================================================================
// MAIN EXECUTION FUNCTION (entry point)
// ============================================================================
export async function execute(params: ExecuteGenerationParams): Promise<string> {
  // 1. Build inputs
  // 2. Validate
  // 3. Calculate cost
  // 4. Prepare payload
  // 5. Create DB record
  // 6. Call API
  // 7. Start polling
  // 8. Return generation ID
}
```

## DO NOT EDIT FILES MANUALLY

Files are auto-generated from the Admin UI. Manual edits will be:
- **Overwritten** when model is saved in Admin UI
- **Lost** on next deployment
- **Not tracked** properly in database

To make changes:
1. Go to Admin UI → Models
2. Find the model
3. Unlock if locked
4. Click Edit
5. Make changes
6. Click Save
7. System regenerates file

## How It Works

### UI Rendering

```
ModelSelector.tsx
  ↓
useModelSchema() hook
  ↓
import(`@/lib/models/${model.locked_file_path}`)
  ↓
Get SCHEMA export
  ↓
Render UI inputs based on schema
```

### Generation Execution

```
User clicks Generate
  ↓
executeGeneration()
  ↓
ModelRouter.executeModelGeneration()
  ↓
import(`@/lib/models/${model.locked_file_path}`)
  ↓
Call execute() function
  ↓
File handles everything:
  - Validation
  - Payload prep
  - API call
  - Polling
```

## Troubleshooting

### Error: "Model file not found"

**Cause:** File doesn't exist on disk

**Fix:**
1. Go to Admin UI → Models
2. Find the model
3. Click Edit
4. Click Save
5. System regenerates file

### Error: "Model file missing SCHEMA export"

**Cause:** File is corrupt or incomplete

**Fix:** Same as above - regenerate file

### Error: "Model missing locked_file_path"

**Cause:** Database record is missing file path

**Fix:**
1. Go to Admin UI → Models  
2. Edit and save the model
3. System adds file path to database

## Migration Notes

**January 2025:** Transitioned from database `input_schema` to file-based system

- All models now use `.ts` files
- Database `input_schema` column deprecated (kept for history)
- All execution logic moved from shared providers to model files
- Migration script generated files for all existing models

See `docs/adr/006-file-based-model-system.md` for full details.