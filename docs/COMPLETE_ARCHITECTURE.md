# ARTIFIO.AI - Complete System Architecture

**Version**: 2.0 (Registry-Based Architecture)
**Last Updated**: 2025-01-20
**Status**: Production

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Technology Stack](#technology-stack)
3. [Architecture Principles](#architecture-principles)
4. [Model Registry System](#model-registry-system)
5. [Database Schema](#database-schema)
6. [Frontend Architecture](#frontend-architecture)
7. [Backend Architecture](#backend-architecture)
8. [Authentication & Authorization](#authentication--authorization)
9. [Content Generation Flow](#content-generation-flow)
10. [Payment System](#payment-system)
11. [Admin Systems](#admin-systems)
12. [Deployment & Infrastructure](#deployment--infrastructure)
13. [API Reference](#api-reference)
14. [Security](#security)
15. [Performance](#performance)
16. [Monitoring & Logging](#monitoring--logging)
17. [Development Workflow](#development-workflow)

---

## System Overview

### What is ARTIFIO.AI?

ARTIFIO.AI is a **multi-modal AI content generation platform** that provides:
- **Text-to-Image** generation (FLUX, Imagen, Ideogram, Midjourney, etc.)
- **Text-to-Video** generation (Sora, Veo, Kling, Runway, etc.)
- **Image-to-Video** generation
- **Image Editing** (upscaling, background removal, remixing)
- **Audio/Music** generation (ElevenLabs, Suno)
- **Workflow orchestration** (multi-step generation pipelines)
- **Storyboard creation** (automated video production)

### Core Value Propositions

1. **70+ AI Models** in one platform
2. **Registry-based architecture** - TypeScript files as single source of truth
3. **Credit-based pricing** - unified pricing across all models
4. **Workflow automation** - chain models together
5. **Admin control** - complete model management via UI

### User Types

1. **End Users** - Create content, manage credits, view history
2. **Admins** - Manage models, users, credits, monitor system
3. **System** - Automated jobs, webhooks, polling

---

## Technology Stack

### Frontend

```yaml
Framework: React 18 + TypeScript
Build Tool: Vite
Routing: React Router v6
UI Library: shadcn/ui (Radix UI + Tailwind CSS)
State Management:
  - React Query (@tanstack/query) for server state
  - React Context for auth and media
Styling: Tailwind CSS
Icons: Lucide React
Forms: React Hook Form + Zod validation
Notifications: Sonner
File Upload: Custom components with ImageUploader
```

### Backend

```yaml
Platform: Supabase
Database: PostgreSQL 15+
Edge Functions: Deno TypeScript
Real-time: Supabase Realtime (WebSocket)
Storage: Supabase Storage (S3-compatible)
Auth: Supabase Auth (JWT-based)
Row-Level Security: PostgreSQL RLS policies
```

### AI Model Providers

```yaml
Primary Providers:
  - kie_ai: Largest provider (Kling, Veo, Sora, Grok, etc.)
  - runware: Fast execution (FLUX, Stable Diffusion, upscaling)
  - lovable_ai_sync: Synchronous generations

Integrations:
  - RESTful APIs with provider-specific formats
  - Webhook callbacks for async operations
  - Polling for status checks
```

### DevOps

```yaml
Version Control: Git
CI/CD: GitHub Actions (via Lovable)
Hosting: Vercel/Netlify (frontend) + Supabase (backend)
Environment Management: .env files
Monitoring: Supabase Dashboard + Custom logging
Error Tracking: Custom error logging to database
```

---

## Architecture Principles

### 1. Registry-Based Model Management

**Principle**: TypeScript files are the single source of truth for all model metadata.

```
src/lib/models/locked/
├── prompt_to_image/
│   ├── FLUX_1_Pro.ts
│   ├── Google_Imagen_4.ts
│   └── index.ts
├── prompt_to_video/
│   ├── Sora_2.ts
│   └── index.ts
└── index.ts (main registry)
```

**Benefits**:
- ✅ Version controlled
- ✅ Type-safe
- ✅ No database sync issues
- ✅ Code review for model changes
- ✅ Easy rollback

### 2. ADR-Driven Architecture

All major decisions documented in `docs/architecture/`:
- **ADR-001**: Authentication Strategy
- **ADR-002**: Credit System Design
- **ADR-003**: Content Storage Strategy
- **ADR-006**: Physical File-Based Model System
- **ADR-007**: Direct Model Execution via Registry

### 3. Separation of Concerns

```
Frontend (React)
  ↓ API Calls
Edge Functions (Deno)
  ↓ Database + AI APIs
Database (PostgreSQL) + AI Providers
```

### 4. Security First

- Row-Level Security on all tables
- JWT authentication
- API key encryption
- Rate limiting
- Input validation
- XSS/SQL injection prevention

---

## Model Registry System

### Architecture Overview

```
┌─────────────────────────────────────────────────┐
│  TypeScript Model Files (.ts)                   │
│  src/lib/models/locked/[category]/[Model].ts    │
│  • MODEL_CONFIG (metadata)                      │
│  • SCHEMA (input parameters)                    │
│  • execute() (execution logic)                  │
│  • validate() (input validation)                │
│  • calculateCost() (credit calculation)         │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│  Model Registry (index.ts)                      │
│  • RECORD_ID_REGISTRY                           │
│  • MODEL_REGISTRY                               │
│  • getAllModels()                               │
│  • getModel(recordId)                           │
│  • getModelsByContentType()                     │
└─────────────────┬───────────────────────────────┘
                  │
        ┌─────────┴──────────┐
        ▼                    ▼
┌───────────────┐   ┌────────────────┐
│  Frontend UI  │   │  Admin Console │
│  • Model      │   │  • View models │
│    selection  │   │  • Edit models │
│  • Form       │   │  • Lock models │
│    rendering  │   │  • Generate    │
│  • Cost calc  │   │    scripts     │
└───────────────┘   └────────────────┘
```

### Model File Structure

Every model file follows this template:

```typescript
// src/lib/models/locked/[category]/[ModelName].ts

import { getGenerationType } from '@/lib/models/registry';
import { supabase } from "@/integrations/supabase/client";
import type { ExecuteGenerationParams } from "@/lib/generation/executeGeneration";
import { reserveCredits } from "@/lib/models/creditDeduction";

// 1. MODEL_CONFIG - All metadata
export const MODEL_CONFIG = {
  // Core identification
  modelId: "provider/model-name",
  recordId: "uuid-v4-here",
  modelName: "Display Name",
  provider: "kie_ai",
  contentType: "prompt_to_image",

  // Pricing
  baseCreditCost: 1.0,
  costMultipliers: {},
  defaultOutputs: 1,

  // Performance
  estimatedTimeSeconds: 30,

  // API config
  apiEndpoint: "/api/v1/endpoint",
  payloadStructure: "wrapper",
  maxImages: 0,

  // UI metadata
  isActive: true,
  logoUrl: "/logos/provider.svg",
  modelFamily: "FLUX",
  variantName: "Pro",
  displayOrderInFamily: 1,

  // Lock system
  isLocked: false,
  lockedFilePath: "src/lib/models/locked/[category]/[ModelName].ts"
} as const;

// 2. SCHEMA - Input parameter definition
export const SCHEMA = {
  type: "object",
  properties: {
    positivePrompt: {
      type: "string",
      description: "What to generate",
      required: true
    },
    aspectRatio: {
      type: "string",
      enum: ["1:1", "16:9", "9:16"],
      default: "1:1"
    }
  }
};

// 3. execute() - Generation logic
export async function execute(params: ExecuteGenerationParams): Promise<string> {
  const { prompt, modelParameters, userId, startPolling } = params;

  // Validate inputs
  const validation = validate({ positivePrompt: prompt, ...modelParameters });
  if (!validation.valid) throw new Error(validation.error);

  // Calculate and reserve credits
  const cost = calculateCost({ positivePrompt: prompt, ...modelParameters });
  await reserveCredits(userId, cost);

  // Insert generation record
  const { data: gen, error } = await supabase.from("generations").insert({
    user_id: userId,
    model_id: MODEL_CONFIG.modelId,
    model_record_id: MODEL_CONFIG.recordId,
    type: getGenerationType(MODEL_CONFIG.contentType),
    prompt,
    tokens_used: cost,
    status: "pending",
    settings: modelParameters
  }).select().single();

  if (error || !gen) throw new Error(`Failed: ${error?.message}`);

  // Call AI provider API
  const response = await fetch(MODEL_CONFIG.apiEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      // Provider-specific payload
    })
  });

  // Start polling if async
  if (startPolling) {
    startPolling(gen.id);
  }

  return gen.id;
}

// 4. validate() - Input validation
export function validate(inputs: Record<string, any>): { valid: boolean; error?: string } {
  if (!inputs.positivePrompt || inputs.positivePrompt.length < 3) {
    return { valid: false, error: "Prompt must be at least 3 characters" };
  }
  return { valid: true };
}

// 5. calculateCost() - Credit calculation
export function calculateCost(inputs: Record<string, any>): number {
  let cost = MODEL_CONFIG.baseCreditCost;

  // Apply multipliers
  if (inputs.aspectRatio === "16:9") {
    cost *= 1.5;
  }

  return cost;
}
```

### Registry Structure

```typescript
// src/lib/models/locked/index.ts

import * as PromptToImage from './prompt_to_image';
import * as PromptToVideo from './prompt_to_video';
import * as ImageToVideo from './image_to_video';
import * as ImageEditing from './image_editing';
import * as PromptToAudio from './prompt_to_audio';

// Record ID → Model Module mapping
export const RECORD_ID_REGISTRY: Record<string, ModelModule> = {
  "100@1": PromptToImage.FLUX_1_Pro,
  "uuid-here": PromptToVideo.Sora_2,
  // ... all 70 models
};

// Model ID → Model Module mapping
export const MODEL_REGISTRY: Record<string, ModelModule> = {
  "runware:100@1": PromptToImage.FLUX_1_Pro,
  "sora-2": PromptToVideo.Sora_2,
  // ... all 70 models
};

// Helper functions
export function getAllModels(): ModelModule[] {
  return Object.values(RECORD_ID_REGISTRY);
}

export function getModel(recordId: string): ModelModule | undefined {
  return RECORD_ID_REGISTRY[recordId];
}

export function getModelsByContentType(type: string): ModelModule[] {
  return getAllModels().filter(m => m.MODEL_CONFIG.contentType === type);
}
```

### Admin Model Management

**UI**: `/admin/ai-models`

**Workflow**:
1. **View Models** - Reads from registry, displays in table
2. **Edit Model** - Opens form, queues changes
3. **Download Script** - Generates Node.js migration script
4. **Run Script** - User runs `node update-models.cjs` locally
5. **Commit** - User commits changes to git
6. **Deploy** - Changes take effect on next deploy

**Lock Feature**:
- Locked models (🔒) cannot be edited via admin
- Prevents accidental production model changes
- Unlock via downloaded script

**Script Generation** (`src/lib/admin/modelFileEditor.ts`):
```typescript
generateModelUpdateScript(updates) // Updates existing models
generateNewModelScript(model)      // Creates new model file
generateLockToggleScript(id, lock) // Locks/unlocks model
```

---

## Database Schema

### Core Tables

#### `users` (via Supabase Auth)
```sql
users
├── id (uuid, PK)
├── email (text)
├── created_at (timestamp)
└── metadata (jsonb)
```

#### `user_credits`
```sql
user_credits
├── id (uuid, PK)
├── user_id (uuid, FK → users.id)
├── credits (numeric, default: 100)
├── credits_purchased (numeric, default: 0)
├── last_updated (timestamp)
└── RLS: Users can only see their own credits
```

#### `generations`
```sql
generations
├── id (uuid, PK)
├── user_id (uuid, FK → users.id)
├── model_id (text)                    -- e.g., "runware:100@1"
├── model_record_id (text)             -- UUID from model registry
├── type (text)                        -- 'image', 'video', 'audio', 'text'
├── prompt (text)
├── negative_prompt (text, nullable)
├── settings (jsonb)                   -- Model-specific parameters
├── status (text)                      -- 'pending', 'processing', 'completed', 'failed'
├── tokens_used (numeric)              -- Credits consumed
├── output_url (text, nullable)        -- S3/Supabase Storage URL
├── output_urls (jsonb, nullable)      -- For multiple outputs
├── error_message (text, nullable)
├── job_id (text, nullable)            -- External provider job ID
├── polling_started_at (timestamp)
├── completed_at (timestamp)
├── created_at (timestamp)
├── expires_at (timestamp)             -- Auto-cleanup after 30 days
└── RLS: Users can only see their own generations
```

#### `workflows`
```sql
workflows
├── id (uuid, PK)
├── user_id (uuid, FK → users.id)
├── name (text)
├── description (text)
├── steps (jsonb)                      -- Array of step definitions
│   └── [
│        {
│          "id": "step-1",
│          "model_record_id": "uuid",
│          "parameters": {...},
│          "uses_output_from": null
│        }
│      ]
├── is_active (boolean)
├── created_at (timestamp)
├── updated_at (timestamp)
└── RLS: Users can only manage their own workflows
```

#### `workflow_executions`
```sql
workflow_executions
├── id (uuid, PK)
├── workflow_id (uuid, FK → workflows.id)
├── user_id (uuid, FK → users.id)
├── status (text)                      -- 'running', 'completed', 'failed'
├── current_step (text)
├── step_results (jsonb)               -- Outputs from each step
├── total_credits_used (numeric)
├── error_message (text, nullable)
├── started_at (timestamp)
├── completed_at (timestamp)
└── RLS: Users can only see their own executions
```

#### `storyboards`
```sql
storyboards
├── id (uuid, PK)
├── user_id (uuid, FK → users.id)
├── title (text)
├── description (text)
├── scenes (jsonb)                     -- Array of scene definitions
│   └── [
│        {
│          "id": "scene-1",
│          "duration": 5,
│          "prompt": "...",
│          "generation_id": "uuid",
│          "status": "completed"
│        }
│      ]
├── video_url (text, nullable)         -- Final rendered video
├── status (text)                      -- 'draft', 'generating', 'completed'
├── total_credits_used (numeric)
├── created_at (timestamp)
├── updated_at (timestamp)
└── RLS: Users can only manage their own storyboards
```

#### `credit_transactions`
```sql
credit_transactions
├── id (uuid, PK)
├── user_id (uuid, FK → users.id)
├── amount (numeric)                   -- Positive for purchases, negative for usage
├── transaction_type (text)            -- 'purchase', 'generation', 'refund', 'bonus'
├── description (text)
├── generation_id (uuid, nullable)     -- FK → generations.id
├── payment_id (text, nullable)        -- External payment provider ID
├── created_at (timestamp)
└── RLS: Users can only see their own transactions
```

#### `shared_content`
```sql
shared_content
├── id (uuid, PK)
├── generation_id (uuid, FK → generations.id)
├── user_id (uuid, FK → users.id)
├── share_token (text, unique)         -- Public share link token
├── view_count (integer, default: 0)
├── is_active (boolean, default: true)
├── created_at (timestamp)
├── expires_at (timestamp, nullable)
└── RLS: No restrictions on shared content (public)
```

#### `api_keys_vault`
```sql
api_keys_vault
├── id (uuid, PK)
├── provider (text, unique)            -- 'kie_ai', 'runware', etc.
├── encrypted_key (text)               -- AES-encrypted API key
├── is_active (boolean)
├── last_used (timestamp)
├── created_at (timestamp)
└── RLS: Only accessible via Edge Functions (service role)
```

#### `error_logs`
```sql
error_logs
├── id (uuid, PK)
├── user_id (uuid, nullable)
├── error_type (text)
├── error_message (text)
├── stack_trace (text, nullable)
├── context (jsonb)
├── severity (text)                    -- 'low', 'medium', 'high', 'critical'
├── resolved (boolean, default: false)
├── created_at (timestamp)
└── RLS: Admins only
```

### Database Functions

#### `reserve_credits(user_id, amount)`
```sql
-- Atomically deduct credits and prevent overdraft
CREATE OR REPLACE FUNCTION reserve_credits(
  p_user_id uuid,
  p_amount numeric
) RETURNS boolean AS $$
BEGIN
  UPDATE user_credits
  SET credits = credits - p_amount,
      last_updated = NOW()
  WHERE user_id = p_user_id
    AND credits >= p_amount;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### `refund_credits(user_id, amount, reason)`
```sql
-- Refund credits for failed generations
CREATE OR REPLACE FUNCTION refund_credits(
  p_user_id uuid,
  p_amount numeric,
  p_reason text
) RETURNS void AS $$
BEGIN
  UPDATE user_credits
  SET credits = credits + p_amount,
      last_updated = NOW()
  WHERE user_id = p_user_id;

  INSERT INTO credit_transactions (user_id, amount, transaction_type, description)
  VALUES (p_user_id, p_amount, 'refund', p_reason);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Row-Level Security (RLS) Policies

All tables have RLS enabled with policies like:

```sql
-- generations table
CREATE POLICY "Users can view own generations"
  ON generations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own generations"
  ON generations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admin override
CREATE POLICY "Admins can view all"
  ON generations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );
```

---

## Frontend Architecture

### Directory Structure

```
src/
├── components/
│   ├── ui/                           -- shadcn/ui components
│   ├── admin/                        -- Admin-specific components
│   │   ├── ModelFormDialog.tsx
│   │   ├── SchemaBuilder.tsx
│   │   └── DocumentationViewer.tsx
│   ├── custom-creation/              -- Model selection UI
│   │   ├── CustomCreation.tsx
│   │   ├── ModelFamilySelector.tsx
│   │   └── ModelSelector.tsx
│   ├── generation/                   -- Generation UI
│   │   ├── GenerationInputPanel.tsx
│   │   ├── WorkflowInputPanel.tsx
│   │   └── GenerationStatus.tsx
│   ├── storyboard/                   -- Storyboard UI
│   │   ├── StoryboardEditor.tsx
│   │   ├── SceneCard.tsx
│   │   └── VideoRenderer.tsx
│   └── error/
│       └── RouteErrorBoundary.tsx
├── pages/
│   ├── Index.tsx                     -- Landing page
│   ├── CustomCreation.tsx            -- Main creation page
│   ├── CreateWorkflow.tsx            -- Workflow builder
│   ├── StoryboardMinimal.tsx         -- Storyboard creator
│   ├── Settings.tsx                  -- User settings
│   ├── dashboard/
│   │   └── History.tsx               -- Generation history
│   └── admin/
│       ├── AdminDashboard.tsx
│       ├── AIModelsManager.tsx       -- Registry-based admin
│       ├── UsersManager.tsx
│       └── TokenDisputes.tsx
├── hooks/
│   ├── useModels.tsx                 -- Load models from registry
│   ├── useModelSchema.ts             -- Load model schemas
│   ├── useGeneration.ts              -- Handle generation
│   ├── useUserTokens.tsx             -- User credits
│   └── useAuth.tsx                   -- Authentication
├── lib/
│   ├── models/
│   │   ├── locked/                   -- Model files (70 models)
│   │   │   ├── prompt_to_image/
│   │   │   ├── prompt_to_video/
│   │   │   ├── image_to_video/
│   │   │   ├── image_editing/
│   │   │   ├── prompt_to_audio/
│   │   │   └── index.ts              -- Main registry
│   │   ├── registry.ts               -- Registry exports
│   │   └── creditDeduction.ts
│   ├── admin/
│   │   └── modelFileEditor.ts        -- Script generation
│   ├── generation/
│   │   └── executeGeneration.ts      -- Execute model
│   └── logger.ts                     -- Logging utility
├── integrations/
│   └── supabase/
│       ├── client.ts                 -- Supabase client
│       └── types.ts                  -- Generated types
├── contexts/
│   ├── AuthContext.tsx               -- Auth state
│   └── MediaContext.tsx              -- Media queries
└── types/
    ├── schema.ts                     -- Model schema types
    └── model-schema.ts               -- JSON schema types
```

### Component Hierarchy

```
App
├── BrowserRouter
│   ├── AuthProvider
│   │   ├── MediaProvider
│   │   │   ├── QueryClientProvider
│   │   │   │   ├── Routes
│   │   │   │   │   ├── PublicRoutes
│   │   │   │   │   │   ├── Index (/)
│   │   │   │   │   │   ├── Auth (/auth)
│   │   │   │   │   │   └── SharedContent (/share/:token)
│   │   │   │   │   └── ProtectedRoutes (requires auth)
│   │   │   │   │       ├── CustomCreation (/create)
│   │   │   │   │       ├── CreateWorkflow (/create-workflow)
│   │   │   │   │       ├── StoryboardMinimal (/storyboard)
│   │   │   │   │       ├── History (/dashboard/history)
│   │   │   │   │       ├── Settings (/settings)
│   │   │   │   │       └── AdminRoutes (requires admin role)
│   │   │   │   │           ├── AdminDashboard (/admin)
│   │   │   │   │           ├── AIModelsManager (/admin/ai-models)
│   │   │   │   │           ├── UsersManager (/admin/users)
│   │   │   │   │           └── TokenDisputes (/admin/disputes)
```

### Key Hooks

#### `useModels()` - Load Models from Registry

```typescript
// src/hooks/useModels.tsx
export const useModels = () => {
  return useQuery<AIModel[]>({
    queryKey: ["ai-models"],
    queryFn: async () => {
      const modules = getAllModels(); // From registry

      return modules
        .filter(m => m.MODEL_CONFIG.isActive)
        .map(m => ({
          record_id: m.MODEL_CONFIG.recordId,
          id: m.MODEL_CONFIG.modelId,
          model_name: m.MODEL_CONFIG.modelName,
          provider: m.MODEL_CONFIG.provider,
          content_type: m.MODEL_CONFIG.contentType,
          base_token_cost: m.MODEL_CONFIG.baseCreditCost,
          // ... all other fields
          groups: [m.MODEL_CONFIG.contentType],
          is_locked: m.MODEL_CONFIG.isLocked,
        }));
    },
    staleTime: 30 * 1000,
  });
};
```

#### `useModelSchema()` - Load Schema from Registry

```typescript
// src/hooks/useModelSchema.ts
export const useModelSchema = (model: ModelConfiguration | null) => {
  const [schema, setSchema] = useState<ModelJsonSchema | null>(null);

  useEffect(() => {
    if (!model) return;

    import("@/lib/models/locked").then((registry) => {
      const modelModule = registry.getModelModule(model.record_id, model.id);
      setSchema(modelModule?.SCHEMA || null);
    });
  }, [model?.record_id]);

  return { schema, loading, error };
};
```

#### `useGeneration()` - Execute Generation

```typescript
// src/hooks/useGeneration.ts
export const useGeneration = () => {
  const generateContent = useMutation({
    mutationFn: async ({
      modelRecordId,
      prompt,
      parameters
    }: GenerationParams) => {
      // Import model module
      const { getModel } = await import('@/lib/models/registry');
      const modelModule = getModel(modelRecordId);

      if (!modelModule) {
        throw new Error('Model not found');
      }

      // Execute model
      const generationId = await modelModule.execute({
        prompt,
        modelParameters: parameters,
        userId: user!.id,
        startPolling: (id) => pollGeneration(id)
      });

      return generationId;
    }
  });

  return { generateContent };
};
```

### State Management

**React Query** for server state:
- Models
- Generations
- Credits
- User data

**React Context** for app state:
- Authentication (AuthContext)
- Media queries (MediaContext)

**Local State** for UI:
- Form inputs
- Modal visibility
- Filter states

### Routing

```typescript
// src/App.tsx
<Routes>
  {/* Public */}
  <Route path="/" element={<Index />} />
  <Route path="/auth" element={<Auth />} />
  <Route path="/share/:token" element={<SharedContent />} />

  {/* Protected */}
  <Route element={<RequireAuth />}>
    <Route path="/create" element={<CustomCreation />} />
    <Route path="/create-workflow" element={<CreateWorkflow />} />
    <Route path="/storyboard" element={<StoryboardMinimal />} />
    <Route path="/dashboard/history" element={<History />} />
    <Route path="/settings" element={<Settings />} />

    {/* Admin */}
    <Route element={<RequireAdmin />}>
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/admin/ai-models" element={<AIModelsManager />} />
      <Route path="/admin/users" element={<UsersManager />} />
    </Route>
  </Route>
</Routes>
```

---

## Backend Architecture

### Edge Functions

Located in `supabase/functions/`:

#### Core Generation Functions

**`generate-content`** - Main generation endpoint
```typescript
// POST /functions/v1/generate-content
Request: {
  model_record_id: string
  prompt: string
  negative_prompt?: string
  model_parameters: Record<string, any>
}

Flow:
1. Validate user authentication
2. Load model from registry
3. Validate inputs
4. Reserve credits
5. Call model.execute()
6. Return generation ID
```

**`generate-content-sync`** - Synchronous generation
```typescript
// POST /functions/v1/generate-content-sync
// Same as generate-content but waits for completion
// Used for fast models (< 30 seconds)
```

#### Webhook Functions

**`kie-ai-webhook`** - Handles callbacks from provider
```typescript
// POST /functions/v1/kie-ai-webhook
// Validates signature, updates generation status
```

**`process-runware-response`** - Handles Runware callbacks
```typescript
// POST /functions/v1/process-runware-response
// Validates, processes, uploads results
```

#### Workflow Functions

**`workflow-executor`** - Executes multi-step workflows
```typescript
// POST /functions/v1/workflow-executor
Request: {
  workflow_id: string
  input_parameters: Record<string, any>
}

Flow:
1. Load workflow definition
2. Execute steps sequentially
3. Pass outputs between steps
4. Track execution status
5. Return final results
```

#### Storyboard Functions

**`generate-storyboard`** - Generates all scenes
**`render-storyboard-video`** - Combines scenes into video
**`regenerate-storyboard-scene`** - Regenerates single scene

#### Admin Functions

**`analyze-model-docs`** - Generates model documentation
**`check-model-health`** - Health check for models
**`test-model-generation`** - Test generation endpoint

#### Utility Functions

**`check-generation-timeouts`** - Cleanup stuck generations
**`send-error-alert`** - Send error notifications
**`log-error`** - Centralized error logging

### Provider Integrations

#### Provider Integration

```typescript
// Call provider API
const response = await fetch('https://api.kie.ai/v1/jobs/createTask', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'sora-2',
    parameters: {
      prompt: userPrompt,
      duration: 10
    },
    webhook_url: `${WEBHOOK_BASE}/kie-ai-webhook?token=${token}`
  })
});

// Webhook receives callback
{
  job_id: "job-123",
  status: "completed",
  output_url: "https://cdn.provider.com/result.mp4"
}

// Update database
await supabase
  .from('generations')
  .update({
    status: 'completed',
    output_url: response.output_url
  })
  .eq('job_id', response.job_id);
```

#### Runware Integration

```typescript
// Call Runware API
const response = await fetch('https://api.runware.ai/v1', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify([{
    taskType: 'imageInference',
    taskUUID: generationId,
    model: 'runware:100@1',
    positivePrompt: userPrompt,
    height: 1024,
    width: 1024,
    outputFormat: 'PNG'
  }])
});

// Poll for results (no webhook)
// OR receive WebSocket message
```

---

## Authentication & Authorization

### Authentication Flow

```
1. User visits /auth
   ↓
2. Enters email/password or OAuth
   ↓
3. Supabase Auth validates
   ↓
4. JWT token issued
   ↓
5. Token stored in localStorage
   ↓
6. AuthContext updates with user
   ↓
7. Protected routes accessible
```

### Authorization Levels

#### 1. Public (No Auth)
- Landing page
- Public documentation
- Shared content viewing

#### 2. Authenticated User
- Create generations
- View own history
- Manage own workflows
- Purchase credits
- Account settings

#### 3. Admin
- All user permissions
- View all generations
- Manage users
- Manage credits
- View error logs
- Access admin dashboard
- **Manage AI models** (registry-based)

### Implementation

```typescript
// src/contexts/AuthContext.tsx
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Listen to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);

        if (session?.user) {
          // Check if user is admin
          const { data } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', session.user.id)
            .single();

          setIsAdmin(data?.role === 'admin');
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAdmin, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

// Protected route
const RequireAuth = () => {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  return <Outlet />;
};

// Admin route
const RequireAdmin = () => {
  const { isAdmin } = useAuth();

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};
```

---

## Content Generation Flow

### Simple Generation (Text-to-Image)

```
User selects model → Fills form → Clicks Generate
                                        ↓
                            Frontend calls useGeneration()
                                        ↓
                            Import model from registry
                                        ↓
                            Call model.execute()
                                        ↓
                            ┌─────────────────────┐
                            │ model.execute()     │
                            ├─────────────────────┤
                            │ 1. Validate inputs  │
                            │ 2. Reserve credits  │
                            │ 3. Insert DB record │
                            │ 4. Call AI API      │
                            │ 5. Start polling    │
                            └─────────────────────┘
                                        ↓
                            Return generation ID
                                        ↓
                            Frontend polls for status
                                        ↓
                            Display result when complete
```

### Detailed Flow

**1. User Input**
```typescript
// User fills form with:
{
  modelRecordId: "100@1",
  prompt: "A beautiful sunset",
  parameters: {
    aspectRatio: "16:9",
    quality: "high"
  }
}
```

**2. Frontend Validation**
```typescript
// Schema-based validation
const schema = useModelSchema(selectedModel);
const validation = validateForm(formData, schema);
```

**3. Credit Check**
```typescript
// Calculate cost
const cost = model.calculateCost(parameters);

// Check if user has enough credits
const { credits } = useUserTokens();
if (credits < cost) {
  showError("Insufficient credits");
  return;
}
```

**4. Model Execution**
```typescript
// Get model from registry
const modelModule = getModel(modelRecordId);

// Execute
const generationId = await modelModule.execute({
  prompt,
  modelParameters: parameters,
  userId: user.id,
  startPolling: (id) => pollGeneration(id)
});
```

**5. Database Record**
```typescript
// Created by model.execute()
{
  id: "gen-uuid",
  user_id: "user-uuid",
  model_id: "runware:100@1",
  model_record_id: "100@1",
  type: "image",
  prompt: "A beautiful sunset",
  settings: { aspectRatio: "16:9", quality: "high" },
  status: "pending",
  tokens_used: 2.5,
  job_id: "provider-job-123"
}
```

**6. AI Provider Call**
```typescript
// Depends on provider
if (provider === 'kie_ai') {
  // Async with webhook
  await fetch('https://api.kie.ai/v1/jobs/createTask', {
    webhook_url: webhookUrl
  });
} else if (provider === 'runware') {
  // WebSocket or polling
  await fetch('https://api.runware.ai/v1', {
    // No webhook, poll for results
  });
}
```

**7. Status Updates**

Via webhook:
```typescript
// kie-ai-webhook receives
{
  job_id: "provider-job-123",
  status: "completed",
  output_url: "https://cdn.provider.com/result.png"
}

// Update database
await supabase
  .from('generations')
  .update({
    status: 'completed',
    output_url: result.output_url,
    completed_at: new Date()
  })
  .eq('job_id', job_id);
```

Via polling:
```typescript
// Frontend polls every 2 seconds
const checkStatus = async (generationId) => {
  const { data } = await supabase
    .from('generations')
    .select('status, output_url')
    .eq('id', generationId)
    .single();

  if (data.status === 'completed') {
    stopPolling();
    showResult(data.output_url);
  }
};
```

**8. Result Display**
```typescript
// Frontend shows image/video
<GenerationResult
  generationId={generationId}
  outputUrl={outputUrl}
  status={status}
/>
```

### Workflow Generation

Multi-step generations:

```
Step 1: Text → Image (FLUX)
           ↓
Step 2: Image → Video (Kling)
           ↓
Step 3: Video → Audio (ElevenLabs)
           ↓
Final: Combined video with audio
```

Implementation:
```typescript
// workflow-executor Edge Function
for (const step of workflow.steps) {
  // Get model for this step
  const model = getModel(step.model_record_id);

  // Get input from previous step
  const input = step.uses_output_from
    ? stepResults[step.uses_output_from]
    : step.parameters;

  // Execute step
  const result = await model.execute({
    prompt: input.prompt,
    modelParameters: input,
    userId: workflow.user_id
  });

  // Store result
  stepResults[step.id] = result;
}
```

---

## Payment System

### Credit Packages

```typescript
const CREDIT_PACKAGES = [
  { credits: 100, price: 10, bonus: 0 },
  { credits: 500, price: 45, bonus: 50 },
  { credits: 1000, price: 80, bonus: 200 },
  { credits: 5000, price: 350, bonus: 1500 }
];
```

### Payment Flow

```
User selects package → Redirects to payment → Completes payment
                                                       ↓
                                           Webhook callback
                                                       ↓
                                           Verify payment
                                                       ↓
                                           Add credits
                                                       ↓
                                           Send confirmation
```

### Implementation

**Payment Provider**: Dodo Payments (configurable)

```typescript
// Create payment session
const { data } = await supabase.functions.invoke('create-dodo-payment', {
  body: {
    amount: package.price,
    credits: package.credits + package.bonus,
    user_id: user.id
  }
});

// Redirect to payment page
window.location.href = data.payment_url;

// Webhook handles completion
// supabase/functions/dodo-payments-webhook
```

### Credit Deduction

```typescript
// Atomic credit reservation
export async function reserveCredits(userId: string, amount: number) {
  const { data, error } = await supabase.rpc('reserve_credits', {
    p_user_id: userId,
    p_amount: amount
  });

  if (error || !data) {
    throw new Error('Insufficient credits');
  }

  // Log transaction
  await supabase.from('credit_transactions').insert({
    user_id: userId,
    amount: -amount,
    transaction_type: 'generation',
    description: 'Content generation'
  });
}
```

### Refund Logic

```typescript
// Refund on failure
export async function refundGeneration(generationId: string) {
  const { data: gen } = await supabase
    .from('generations')
    .select('user_id, tokens_used')
    .eq('id', generationId)
    .single();

  if (!gen) return;

  await supabase.rpc('refund_credits', {
    p_user_id: gen.user_id,
    p_amount: gen.tokens_used,
    p_reason: `Refund for failed generation ${generationId}`
  });
}
```

---

## Admin Systems

### AI Models Manager (Registry-Based)

**Location**: `/admin/ai-models`

**Features**:
- ✅ View all 70 models from registry
- ✅ Filter by provider, type, status, lock status
- ✅ Sort by name, cost, duration
- ✅ Edit models (queues changes)
- ✅ Lock/unlock models
- ✅ Bulk enable/disable
- ✅ Generate migration scripts
- ✅ Refresh from registry

**Workflow**:
```
Admin edits model → Changes queued → Download script
                                            ↓
                                Run node update-models.cjs
                                            ↓
                                Commit to git
                                            ↓
                                Deploy
                                            ↓
                                Refresh admin to see changes
```

**Lock System**:
- Locked models cannot be edited
- Prevents accidental production changes
- Lock via script: `node lock-model.cjs`
- Unlock via script: `node unlock-model.cjs`

### Users Manager

**Location**: `/admin/users`

**Features**:
- View all users
- View credit balances
- Add/remove credits
- View generation history
- Ban/unban users

### Token Disputes

**Location**: `/admin/disputes`

**Features**:
- View failed generations
- Issue refunds
- Manual credit adjustments

### Analytics Dashboard

**Location**: `/admin`

**Metrics**:
- Total users
- Total generations
- Revenue (credits sold)
- Most used models
- Error rates
- Average generation time

---

## Deployment & Infrastructure

### Environments

**Development**
```
Frontend: localhost:5173 (Vite dev server)
Backend: Supabase project (dev)
Database: PostgreSQL (Supabase)
```

**Staging**
```
Frontend: staging.artifio.ai
Backend: Supabase project (staging)
Database: PostgreSQL (Supabase)
```

**Production**
```
Frontend: artifio.ai
Backend: Supabase project (prod)
Database: PostgreSQL (Supabase)
```

### Deployment Process

**Frontend**:
1. Push to GitHub
2. Lovable CI/CD triggers
3. Build with Vite
4. Deploy to Vercel/Netlify
5. DNS updates automatically

**Backend**:
```bash
# Deploy Edge Functions
supabase functions deploy generate-content
supabase functions deploy kie-ai-webhook
# ... all functions

# Run migrations
supabase db push

# Update RLS policies
supabase db remote commit
```

**Model Updates**:
1. Edit model file locally
2. Run migration script if from admin
3. Commit to git
4. Push to GitHub
5. Deploy triggers automatically

### Environment Variables

```bash
# .env.local (Frontend)
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_APP_ENV=development

# Supabase secrets (Backend)
KIE_AI_API_KEY=sk-...
RUNWARE_API_KEY=sk-...
LOVABLE_AI_API_KEY=sk-...
WEBHOOK_SECRET=secret-...
```

### Database Migrations

```bash
# Create migration
supabase migration new add_new_table

# Edit migration file
# supabase/migrations/20250120_add_new_table.sql

# Apply locally
supabase db reset

# Apply to remote
supabase db push
```

---

## API Reference

### Public Endpoints

None - all require authentication

### Protected Endpoints

#### Generate Content
```http
POST /functions/v1/generate-content
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "model_record_id": "100@1",
  "prompt": "A beautiful sunset",
  "model_parameters": {
    "aspectRatio": "16:9"
  }
}

Response:
{
  "generation_id": "uuid",
  "status": "pending",
  "estimated_time": 30
}
```

#### Check Generation Status
```http
GET /rest/v1/generations?id=eq.{generation_id}
Authorization: Bearer {jwt_token}

Response:
{
  "id": "uuid",
  "status": "completed",
  "output_url": "https://...",
  "tokens_used": 2.5
}
```

#### Get User Credits
```http
GET /rest/v1/user_credits?user_id=eq.{user_id}
Authorization: Bearer {jwt_token}

Response:
{
  "credits": 95.5,
  "credits_purchased": 100
}
```

### Admin Endpoints

All admin endpoints check for admin role via RLS.

#### Get All Users
```http
GET /rest/v1/users?select=*,user_credits(*)
Authorization: Bearer {admin_jwt_token}
```

#### Manual Credit Adjustment
```http
POST /rest/v1/rpc/adjust_credits
Authorization: Bearer {admin_jwt_token}

{
  "p_user_id": "uuid",
  "p_amount": 100,
  "p_reason": "Bonus credits"
}
```

---

## Security

### Authentication

- **JWT tokens** from Supabase Auth
- **Expiry**: 1 hour, auto-refresh
- **Storage**: localStorage (httpOnly not available for client-side)

### Authorization

- **Row-Level Security** on all tables
- **Admin checks** via user_roles table
- **Service role** for Edge Functions only

### API Key Management

- Stored encrypted in `api_keys_vault`
- Only accessible via service role
- Decrypted in Edge Functions
- Never exposed to frontend

### Input Validation

- **Schema validation** via Zod
- **SQL injection** prevented by Supabase client
- **XSS prevention** via React escaping
- **Rate limiting** via Supabase (coming soon)

### Best Practices

1. ✅ Never commit API keys
2. ✅ Use environment variables
3. ✅ Validate all inputs
4. ✅ Sanitize user content
5. ✅ Enable RLS on all tables
6. ✅ Use prepared statements
7. ✅ Implement rate limiting
8. ✅ Log security events

---

## Performance

### Frontend Optimization

- **Code splitting** via React.lazy()
- **Image optimization** via WebP + lazy loading
- **React Query caching** (30s stale time)
- **Memoization** with useMemo/useCallback
- **Virtualization** for long lists (react-window)
- **Bundle size** monitoring

### Backend Optimization

- **Database indexing** on frequently queried columns
- **Connection pooling** via Supabase
- **Edge Function cold starts** minimized
- **Caching** for model metadata
- **Batch operations** for bulk updates

### Model Loading

```typescript
// Lazy load models
const models = getAllModels(); // Fast - loads from registry

// Schema loaded on demand
const schema = await getModelSchema(recordId); // Only when needed
```

### Image/Video Optimization

- **CDN** for static assets
- **Supabase Storage** with CDN
- **Responsive images** with srcset
- **Video transcoding** in background
- **Thumbnail generation** for previews

---

## Monitoring & Logging

### Frontend Logging

```typescript
// src/lib/logger.ts
export const logger = {
  debug: (message, ...args) => {
    if (import.meta.env.DEV) {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  },

  info: (message, ...args) => {
    console.info(`[INFO] ${message}`, ...args);
  },

  error: (message, error, context) => {
    console.error(`[ERROR] ${message}`, error);

    // Send to database
    supabase.from('error_logs').insert({
      error_type: 'frontend',
      error_message: message,
      stack_trace: error?.stack,
      context,
      severity: 'high'
    });
  }
};
```

### Backend Logging

```typescript
// Edge Functions
console.log('[INFO]', 'Generation started', { generationId });
console.error('[ERROR]', 'Generation failed', { error, generationId });

// Structured logging
logger.error('Failed to call provider API', error as Error, {
  component: 'generate-content',
  operation: 'callProviderAPI',
  provider: 'kie_ai',
  modelId: 'sora-2'
});
```

### Metrics Tracked

- Generation success rate
- Average generation time
- Credit usage by model
- Error rates by provider
- User activity
- API response times

### Alerts

- Failed generations > 10% in 5 minutes
- Credit balance below threshold
- Edge Function errors
- Database connection issues

---

## Development Workflow

### Local Development Setup

```bash
# 1. Clone repository
git clone https://github.com/your-org/artifio-create-flow.git
cd artifio-create-flow

# 2. Install dependencies
npm install

# 3. Set up environment
cp .env.example .env.local
# Edit .env.local with your Supabase keys

# 4. Start Supabase (optional - local dev)
supabase start

# 5. Run migrations (if local)
supabase db reset

# 6. Start dev server
npm run dev

# 7. Open http://localhost:5173
```

### Adding a New Model

**Method 1: Admin UI (Recommended)**
1. Go to `/admin/ai-models`
2. Click "New Model"
3. Fill form
4. Download creation script
5. Run: `node create-ModelName.cjs`
6. Implement execute(), validate(), calculateCost()
7. Update schema
8. Import in category index.ts
9. Test locally
10. Commit and push

**Method 2: Manual**
1. Copy existing model file
2. Update MODEL_CONFIG
3. Implement functions
4. Import in index.ts
5. Test
6. Commit

### Testing

```bash
# Run type checking
npm run build

# Test generation locally
# Use /create page with dev environment

# Test admin functions
# Go to /admin/ai-models
# Try editing a model, download script
```

### Git Workflow

```bash
# Feature branch
git checkout -b feature/add-new-model

# Make changes
# ... edit files

# Commit
git add .
git commit -m "Add New Amazing Model"

# Push
git push origin feature/add-new-model

# Create PR
gh pr create --title "Add New Amazing Model" --body "..."

# After approval, merge
git checkout main
git pull
```

### Model Update Workflow (Admin-Generated Scripts)

```bash
# 1. Admin makes changes in UI
# 2. Download update script
# 3. Run script
node update-models-1234567890.cjs

# 4. Review changes
git diff src/lib/models/locked/

# 5. Commit
git add src/lib/models/locked/
git commit -m "Update model configurations via admin"

# 6. Push
git push

# 7. Deploy (automatic via CI/CD)

# 8. Refresh admin page to see changes
```

### Rollback Procedure

```bash
# Rollback to previous version
git revert HEAD

# Or specific commit
git revert abc1234

# Push
git push

# Deploy triggers automatically
```

---

## Appendix

### Model Categories

1. **prompt_to_image** (33 models)
   - FLUX variants, Imagen, Ideogram, Midjourney, etc.

2. **prompt_to_video** (13 models)
   - Sora, Veo, Kling, Runway, etc.

3. **image_to_video** (13 models)
   - Same as above but with image input

4. **image_editing** (15 models)
   - Upscaling, background removal, remixing

5. **prompt_to_audio** (3 models)
   - ElevenLabs, Suno

### Content Type Mapping

```typescript
ContentType → Database Type
- "prompt_to_image" → "image"
- "image_editing" → "image"
- "prompt_to_video" → "video"
- "image_to_video" → "video"
- "prompt_to_audio" → "audio"
```

### Creation Groups (UI Categories)

```typescript
const CREATION_GROUPS = [
  { id: "image_editing", label: "Image Editing" },
  { id: "prompt_to_image", label: "Text to Image" },
  { id: "prompt_to_video", label: "Text to Video" },
  { id: "image_to_video", label: "Image to Video" },
  { id: "prompt_to_audio", label: "Audio Studio" }
];
```

### Common Model Parameters

```typescript
// Shared across many models
{
  positivePrompt: string       // What to generate
  negativePrompt?: string      // What to avoid
  aspectRatio: string          // "1:1", "16:9", "9:16", etc.
  quality: string              // "standard", "high", "ultra"
  numOutputs: number           // Number of results
  seed?: number                // Reproducibility
  guidance?: number            // Prompt adherence (1-20)
}
```

### Provider-Specific Formats

**Provider (wrapper)**:
```json
{
  "model": "sora-2",
  "parameters": {
    "prompt": "...",
    "duration": 10
  },
  "webhook_url": "..."
}
```

**runware (flat)**:
```json
[{
  "taskType": "imageInference",
  "taskUUID": "...",
  "model": "runware:100@1",
  "positivePrompt": "...",
  "height": 1024,
  "width": 1024
}]
```

### Error Codes

```typescript
const ERROR_CODES = {
  INSUFFICIENT_CREDITS: 'E001',
  MODEL_NOT_FOUND: 'E002',
  INVALID_PARAMETERS: 'E003',
  PROVIDER_API_ERROR: 'E004',
  GENERATION_TIMEOUT: 'E005',
  LOCKED_MODEL: 'E006'
};
```

---

## Quick Reference

### Key Files

```
Frontend:
- src/pages/CustomCreation.tsx         Main creation page
- src/pages/admin/AIModelsManager.tsx  Admin console
- src/hooks/useModels.tsx              Load models
- src/lib/models/registry.ts           Model registry

Backend:
- supabase/functions/generate-content  Main generation
- supabase/functions/kie-ai-webhook    Webhook handler

Models:
- src/lib/models/locked/[category]/    70 model files
- src/lib/models/locked/index.ts       Registry

Admin:
- src/lib/admin/modelFileEditor.ts     Script generation

Docs:
- docs/ADMIN_MODELS_REGISTRY.md        Admin guide
- docs/architecture/ADR-*.md           Architecture decisions
```

### Key Commands

```bash
# Development
npm run dev                    # Start dev server
npm run build                  # Type check

# Database
supabase db reset              # Reset local DB
supabase db push               # Push migrations

# Deployment
git push                       # Auto-deploys via CI/CD

# Model Management
node update-models.cjs         # Apply model updates
node create-Model.cjs          # Create new model
node lock-model.cjs            # Lock a model
```

### Key URLs

```
Production:
- https://artifio.ai           Landing
- /create                      Main creation
- /admin/ai-models            Admin console

Development:
- http://localhost:5173        Local dev
- http://localhost:54321       Supabase Studio
```

---

**END OF DOCUMENT**

For updates or questions, see:
- GitHub Issues
- Internal wiki
- Team Slack #artifio-dev
