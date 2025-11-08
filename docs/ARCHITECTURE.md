# KIE AI Video Platform - Architecture Documentation

## Overview

This document describes the modular architecture of the KIE AI Video Platform, focusing on the refactored components and their interactions.

---

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Webhook Processing System](#webhook-processing-system)
3. [Workflow Orchestration](#workflow-orchestration)
4. [Frontend Architecture](#frontend-architecture)
5. [Security Layers](#security-layers)
6. [Data Flow](#data-flow)

---

## System Architecture

```mermaid
graph TB
    subgraph "Frontend Layer"
        UI[React Components]
        Hooks[Custom Hooks]
        State[State Management]
    end
    
    subgraph "Backend Layer"
        WF[Workflow Executor]
        GC[Generate Content]
        WH[KIE AI Webhook]
        Orch[Workflow Orchestrator]
    end
    
    subgraph "External Services"
        KIE[KIE AI API]
        AI[Other AI Models]
    end
    
    subgraph "Data Layer"
        DB[(Supabase DB)]
        Storage[(File Storage)]
    end
    
    UI --> Hooks
    Hooks --> State
    Hooks --> WF
    WF --> GC
    GC --> KIE
    GC --> AI
    KIE --> WH
    WH --> Orch
    Orch --> DB
    WF --> DB
    GC --> DB
    GC --> Storage
```

---

## Webhook Processing System

### Location
`supabase/functions/kie-ai-webhook/`

### Architecture

The webhook system is organized into modular components:

```
kie-ai-webhook/
├── index.ts                    # Main webhook handler
├── security/                   # Security validation layers
│   ├── url-token-validator.ts
│   ├── verify-token-validator.ts
│   ├── timing-validator.ts
│   └── idempotency-validator.ts
└── orchestration/              # Workflow orchestration
    ├── workflow-orchestrator.ts
    └── parameter-resolver.ts
```

### Security Layers

The webhook implements a **4-layer security architecture**:

#### Layer 1: URL Token Validation
- **File**: `security/url-token-validator.ts`
- **Purpose**: Validates static URL token from query parameters
- **Behavior**: Returns 404 if invalid (endpoint appears non-existent)

```typescript
validateUrlToken(url: URL): ValidationResult
```

#### Layer 2: Verify Token Validation
- **File**: `security/verify-token-validator.ts`
- **Purpose**: Validates per-generation webhook token
- **Features**: 
  - Retry logic for race conditions
  - Checks generation status (not cancelled/processed)
  
```typescript
validateVerifyToken(url: URL, taskId: string, supabase): Promise<VerifyTokenResult>
```

#### Layer 3: Timing Validation
- **File**: `security/timing-validator.ts`
- **Purpose**: Detects replay attacks and late arrivals
- **Thresholds**:
  - MIN_PROCESSING_TIME: 2 seconds (prevents replay attacks)
  - MAX_PROCESSING_TIME: 5 minutes (logs late webhooks)

```typescript
validateTiming(generation: any, supabase): Promise<TimingResult>
```

#### Layer 4: Idempotency Protection
- **File**: `security/idempotency-validator.ts`
- **Purpose**: Prevents duplicate webhook processing
- **Mechanism**: Tracks processed events in `webhook_events` table

```typescript
validateIdempotency(taskId, callbackType, generation, supabase): Promise<IdempotencyResult>
```

### Orchestration Module

#### Workflow Orchestrator
- **File**: `orchestration/workflow-orchestrator.ts`
- **Purpose**: Manages multi-step workflow execution
- **Features**:
  - Tracks step outputs
  - Chains workflow steps
  - Handles final output URLs
  - Token usage tracking

```typescript
orchestrateWorkflow(generation, storagePath, isMultiOutput, supabase): Promise<void>
```

#### Parameter Resolver
- **File**: `orchestration/parameter-resolver.ts`
- **Purpose**: Resolves template variables and parameters
- **Features**:
  - Template variable replacement
  - Input mapping resolution
  - Schema coercion
  - Parameter sanitization

```typescript
replaceTemplateVariables(template, context): string
resolveInputMappings(mappings, context): Record<string, any>
coerceParametersToSchema(params, schema): Record<string, any>
sanitizeParametersForProviders(params, userId, supabase): Promise<Record<string, any>>
```

---

## Workflow Orchestration

### Location
`supabase/functions/workflow-executor/`

### Architecture

```
workflow-executor/
├── index.ts                    # Main executor
└── helpers/
    ├── image-upload.ts         # Image processing
    └── parameter-resolver.ts   # Parameter handling
```

### Modules

#### Image Upload Helper
- **File**: `helpers/image-upload.ts`
- **Functions**:
  - `uploadBase64Image()`: Converts base64 to signed URL
  - `processImageUploads()`: Processes user input images
  - `sanitizeParametersForProviders()`: Sanitizes all parameters

#### Parameter Resolver
- **File**: `helpers/parameter-resolver.ts`
- **Functions**:
  - `getNestedValue()`: Dot notation object access
  - `replaceTemplateVariables()`: Template string replacement
  - `resolveInputMappings()`: Maps inputs to parameters
  - `coerceParametersToSchema()`: Type coercion

---

## Frontend Architecture

### Storyboard System

The storyboard functionality is split into focused hooks:

```
src/hooks/storyboard/
├── useStoryboardState.ts       # State management & data fetching
├── useStoryboardSettings.ts    # Settings updates
├── useStoryboardGeneration.ts  # Storyboard generation
├── useStoryboardScenes.ts      # Scene manipulation
├── useStoryboardRendering.ts   # Video rendering
└── useStoryboardForm.ts        # Form state management
```

### Component Architecture

```
src/components/storyboard/
├── StoryboardInput.tsx         # Main input form (refactored)
└── sections/                   # Form sections
    ├── TopicSection.tsx
    ├── DurationSection.tsx
    ├── ResolutionSelector.tsx
    ├── StyleSelector.tsx
    ├── ToneSelector.tsx
    ├── MediaTypeSelector.tsx
    └── CostDisplay.tsx
```

### Hook Responsibilities

#### useStoryboardState
- Manages current storyboard and active scene IDs
- Fetches storyboard and scene data from database
- Handles local storage persistence

#### useStoryboardSettings
- Updates render settings (voice, quality, subtitles, etc.)
- Manages storyboard configuration

#### useStoryboardGeneration
- Initiates storyboard generation workflow
- Handles generation parameters and validation

#### useStoryboardScenes
- Scene CRUD operations
- Scene regeneration
- Preview generation for all scenes

#### useStoryboardRendering
- Video rendering process
- Polling for render status
- Real-time updates via Supabase subscriptions
- Render cancellation

#### useStoryboardForm
- Form state management
- Input validation
- Settings persistence

---

## Security Layers

### Security Flow

```mermaid
sequenceDiagram
    participant KIE as KIE AI API
    participant WH as Webhook Handler
    participant L1 as Layer 1: URL Token
    participant L2 as Layer 2: Verify Token
    participant L3 as Layer 3: Timing
    participant L4 as Layer 4: Idempotency
    participant DB as Database
    
    KIE->>WH: Webhook Request
    WH->>L1: Validate URL Token
    L1-->>WH: ✓ Valid
    WH->>L2: Validate Verify Token
    L2->>DB: Fetch Generation
    DB-->>L2: Generation Data
    L2-->>WH: ✓ Valid
    WH->>L3: Check Timing
    L3-->>WH: ✓ Within Range
    WH->>L4: Check Idempotency
    L4->>DB: Check webhook_events
    DB-->>L4: Not Duplicate
    L4->>DB: Insert Event
    L4-->>WH: ✓ Unique
    WH->>DB: Process Webhook
```

### Audit Logging

All security events are logged to the `audit_logs` table:
- Invalid webhook attempts
- Duplicate webhook blocks
- Timing violations
- Token validation failures

---

## Data Flow

### Storyboard Generation Flow

```mermaid
sequenceDiagram
    participant UI as User Interface
    participant Hook as useStoryboardGeneration
    participant WF as Workflow Executor
    participant GC as Generate Content
    participant KIE as KIE AI
    participant WH as Webhook Handler
    participant Orch as Orchestrator
    participant DB as Database
    
    UI->>Hook: Generate Storyboard
    Hook->>WF: Start Workflow
    WF->>DB: Create Execution
    WF->>GC: Step 1
    GC->>KIE: Request Generation
    GC->>DB: Update Generation
    KIE-->>WH: Webhook Callback
    WH->>Orch: Process Result
    Orch->>DB: Update Step Output
    Orch->>GC: Start Step 2
    GC->>KIE: Request Generation
    KIE-->>WH: Webhook Callback
    WH->>Orch: Process Result
    Orch->>DB: Mark Complete
    DB-->>Hook: Real-time Update
    Hook-->>UI: Update Status
```

### Video Rendering Flow

```mermaid
sequenceDiagram
    participant UI as User Interface
    participant Hook as useStoryboardRendering
    participant Render as render-storyboard-video
    participant Poll as poll-storyboard-status
    participant Video as Video Service
    participant DB as Database
    
    UI->>Hook: Render Video
    Hook->>Render: Start Render
    Render->>Video: Initiate Render
    Render->>DB: Update Status: rendering
    DB-->>Hook: Real-time Update
    
    loop Every 5 seconds
        Hook->>Poll: Check Status
        Poll->>Video: Get Progress
        Video-->>Poll: Progress %
        Poll-->>Hook: Update Progress
    end
    
    Video->>DB: Update Status: completed
    DB-->>Hook: Real-time Update
    Hook-->>UI: Show Video
```

---

## Design Principles

### Modularity
- **Single Responsibility**: Each module handles one specific concern
- **Loose Coupling**: Modules interact through well-defined interfaces
- **High Cohesion**: Related functionality is grouped together

### Security
- **Defense in Depth**: Multiple security layers
- **Fail Secure**: Returns 404 on security failures
- **Audit Trail**: Comprehensive logging of security events

### Scalability
- **Stateless Functions**: Edge functions don't maintain state
- **Async Processing**: Long operations handled via webhooks
- **Database-Driven**: State managed in Supabase

### Maintainability
- **Clear Structure**: Logical file organization
- **Type Safety**: TypeScript throughout
- **Documentation**: Inline comments and architecture docs

---

## Testing Strategy

### Unit Tests
- Security validators (all 4 layers)
- Parameter resolvers
- Image upload helpers

### Integration Tests
- Webhook processing flow
- Workflow orchestration
- Frontend hook interactions

### End-to-End Tests
- Complete storyboard generation
- Video rendering process
- Error recovery scenarios

---

## Future Improvements

1. **Caching Layer**: Redis for frequently accessed data
2. **Rate Limiting**: Per-user request throttling
3. **Monitoring**: Comprehensive metrics and alerts
4. **Load Balancing**: Distribute webhook processing
5. **Retry Logic**: Automatic retry for transient failures
6. **Dead Letter Queue**: Handle failed webhooks

---

## Glossary

- **Generation**: A single AI generation request and its result
- **Workflow**: Multi-step AI generation pipeline
- **Storyboard**: Collection of scenes for video generation
- **Scene**: Individual video segment with script and media
- **Webhook**: Callback from external AI service
- **Orchestrator**: System that chains workflow steps
- **Edge Function**: Serverless function running on Supabase

---

## Contact & Support

For questions about this architecture, please refer to:
- Code comments in relevant files
- This documentation
- Team technical lead
