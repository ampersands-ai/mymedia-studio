# Artifio.ai System Architecture Overview

## High-Level Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        WEB[Web App<br/>React + Vite]
        PWA[PWA<br/>Service Worker]
    end

    subgraph "Edge Layer"
        EF[Edge Functions<br/>Deno Runtime]
        CF[CORS + Security<br/>Headers]
    end

    subgraph "Backend Services"
        AUTH[Authentication<br/>Supabase Auth]
        DB[(PostgreSQL<br/>+ RLS Policies)]
        STORAGE[File Storage<br/>Supabase Storage]
        RT[Realtime<br/>Subscriptions]
    end

    subgraph "AI Providers"
        RUNWARE[Runware<br/>Image Generation]
        KIEAI[Kie AI<br/>Video Generation]
        LOVABLE[Lovable AI<br/>LLM + Images]
    end

    subgraph "External Services"
        POSTHOG[PostHog<br/>Analytics]
        RESEND[Resend<br/>Email]
    end

    WEB --> CF --> EF
    PWA --> WEB
    EF --> AUTH
    EF --> DB
    EF --> STORAGE
    EF --> RUNWARE
    EF --> KIEAI
    EF --> LOVABLE
    WEB --> RT
    WEB --> POSTHOG
    EF --> RESEND
```

## Component Architecture

### Frontend (React + TypeScript)

```mermaid
graph LR
    subgraph "UI Layer"
        PAGES[Pages<br/>Route Components]
        COMPONENTS[Components<br/>shadcn/ui]
        FEATURES[Features<br/>Domain Components]
    end

    subgraph "State Layer"
        HOOKS[Custom Hooks<br/>95+ hooks]
        TANSTACK[TanStack Query<br/>Server State]
        ZUSTAND[Zustand<br/>Client State]
    end

    subgraph "Data Layer"
        SUPABASE[Supabase Client<br/>Auth + DB + Storage]
        MODELS[Model Registry<br/>.ts Files]
    end

    PAGES --> FEATURES --> COMPONENTS
    PAGES --> HOOKS --> TANSTACK
    HOOKS --> ZUSTAND
    HOOKS --> SUPABASE
    FEATURES --> MODELS
```

### Edge Functions Architecture

```mermaid
graph TB
    subgraph "Entry Points"
        GC[generate-content<br/>Async Generation]
        GCS[generate-content-sync<br/>Sync Generation]
        WH[generation-webhook<br/>Callbacks]
    end

    subgraph "Middleware"
        CORS[CORS Handler]
        RL[Rate Limiter]
        CB[Circuit Breaker]
        AUTH[Auth Validator]
    end

    subgraph "Services"
        CREDIT[Credit Service<br/>Reserve/Refund]
        STORAGE[Storage Service<br/>Upload/URL]
        AUDIT[Audit Service<br/>Logging]
    end

    subgraph "Providers"
        PROV[Provider Router<br/>index.ts]
        RUNWARE[runware.ts]
        KIEAI[kie-ai.ts]
        LOVABLE[lovable-ai.ts]
    end

    GC --> CORS --> RL --> CB --> AUTH
    GCS --> CORS --> RL --> CB --> AUTH
    WH --> CORS --> AUTH
    AUTH --> CREDIT --> PROV
    PROV --> RUNWARE
    PROV --> KIEAI
    PROV --> LOVABLE
    PROV --> STORAGE --> AUDIT
```

## Data Flow

### Generation Request Flow

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant EF as Edge Function
    participant DB as Database
    participant P as AI Provider
    participant S as Storage

    U->>FE: Click Generate
    FE->>FE: Load Model from Registry
    FE->>FE: Validate Inputs (Zod)
    FE->>DB: Create Generation Record
    FE->>EF: POST /generate-content
    EF->>EF: Validate Request
    EF->>DB: Reserve Credits
    EF->>P: Call Provider API
    P-->>EF: Return Result
    EF->>S: Upload to Storage
    EF->>DB: Update Generation
    EF->>DB: Refund/Finalize Credits
    EF-->>FE: Return Success
    FE->>U: Display Result
```

### Realtime Status Flow

```mermaid
sequenceDiagram
    participant FE as Frontend
    participant RT as Realtime
    participant DB as Database
    participant EF as Edge Function

    FE->>RT: Subscribe to generations
    EF->>DB: Update Status
    DB->>RT: Trigger Change
    RT->>FE: Push Update
    FE->>FE: Update UI
```

## Key Design Decisions

| Decision | Rationale | Reference |
|----------|-----------|-----------|
| Registry-based Models | Eliminates DB sync issues, single source of truth | ADR-007 |
| Edge Functions | Serverless, auto-scaling, secure secrets | ADR-001 |
| RLS Policies | Row-level security for multi-tenant isolation | - |
| Circuit Breakers | Resilience against provider failures | - |
| Webhook Callbacks | Support for async long-running generations | - |

## Security Layers

1. **Authentication**: Supabase JWT tokens
2. **Authorization**: 552 RLS policies across all tables
3. **Rate Limiting**: Tiered limits (auth/generation/admin)
4. **Circuit Breakers**: Provider failure isolation
5. **Input Validation**: Zod schemas + JSONB validation
6. **Content Moderation**: Prompt filtering
7. **Audit Logging**: Comprehensive action tracking

## Scalability Considerations

- **Horizontal**: Edge functions auto-scale
- **Concurrent Limit**: 750 simultaneous requests
- **Rate Limits**: 20 generations/min per user
- **Storage**: CDN-backed Supabase Storage
- **Database**: Connection pooling via Supabase
