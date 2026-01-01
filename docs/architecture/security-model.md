# Security Model Architecture

## Security Layers Overview

```mermaid
graph TB
    subgraph "Layer 1: Network"
        CDN[CDN / Edge<br/>DDoS Protection]
        TLS[TLS 1.3<br/>Encryption]
    end

    subgraph "Layer 2: Application"
        CORS[CORS<br/>Origin Validation]
        CSP[CSP Headers<br/>XSS Prevention]
        RATE[Rate Limiting<br/>Abuse Prevention]
    end

    subgraph "Layer 3: Authentication"
        JWT[JWT Tokens<br/>Supabase Auth]
        REFRESH[Token Refresh<br/>Session Management]
        OAUTH[OAuth 2.0<br/>Social Login]
    end

    subgraph "Layer 4: Authorization"
        RLS[Row Level Security<br/>552 Policies]
        RBAC[Role-Based Access<br/>Admin/User]
    end

    subgraph "Layer 5: Data"
        ENCRYPT[Encryption at Rest<br/>PostgreSQL]
        VAULT[API Key Vault<br/>Secrets Management]
        AUDIT[Audit Logging<br/>Action Tracking]
    end

    CDN --> TLS --> CORS --> CSP --> RATE
    RATE --> JWT --> REFRESH --> OAUTH
    OAUTH --> RLS --> RBAC
    RBAC --> ENCRYPT --> VAULT --> AUDIT
```

## Authentication Flow

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant AUTH as Supabase Auth
    participant DB as Database

    U->>FE: Login Request
    FE->>AUTH: signInWithPassword()
    AUTH->>AUTH: Validate Credentials
    AUTH->>AUTH: Generate JWT
    AUTH-->>FE: Access Token + Refresh Token
    FE->>FE: Store in Memory
    
    Note over FE: Token expires in 1 hour
    
    FE->>AUTH: Refresh Token
    AUTH->>AUTH: Validate Refresh Token
    AUTH-->>FE: New Access Token
    
    FE->>DB: API Request + Bearer Token
    DB->>DB: Validate JWT
    DB->>DB: Apply RLS Policies
    DB-->>FE: Filtered Data
```

## Row Level Security (RLS)

### Policy Structure

```sql
-- Example: Users can only read their own generations
CREATE POLICY "Users can view own generations"
ON generations FOR SELECT
USING (auth.uid() = user_id);

-- Example: Admins can view all
CREATE POLICY "Admins can view all generations"
ON generations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND is_admin = true
  )
);
```

### RLS Coverage by Table

| Table | SELECT | INSERT | UPDATE | DELETE | Total |
|-------|--------|--------|--------|--------|-------|
| generations | ✓ | ✓ | ✓ | ✓ | 4 |
| profiles | ✓ | ✓ | ✓ | ✗ | 3 |
| credit_transactions | ✓ | ✓ | ✗ | ✗ | 2 |
| storage.objects | ✓ | ✓ | ✓ | ✓ | 4 |
| ... | ... | ... | ... | ... | ... |
| **Total** | | | | | **552** |

## Rate Limiting Architecture

```mermaid
flowchart TB
    subgraph "Rate Limit Tiers"
        A[Incoming Request] --> B{Endpoint Type}
        B -->|Auth| C[10 req/min<br/>Strict]
        B -->|Generation| D[20 req/min<br/>Standard]
        B -->|Admin| E[100 req/min<br/>Elevated]
        B -->|Public| F[60 req/min<br/>General]
    end

    subgraph "Implementation"
        C --> G[Check Counter]
        D --> G
        E --> G
        F --> G
        G --> H{Over Limit?}
        H -->|Yes| I[Return 429]
        H -->|No| J[Increment Counter]
        J --> K[Process Request]
    end

    subgraph "Headers"
        K --> L[X-RateLimit-Limit]
        K --> M[X-RateLimit-Remaining]
        K --> N[Retry-After]
    end
```

## Circuit Breaker Pattern

```mermaid
stateDiagram-v2
    [*] --> Closed: Normal Operation
    
    Closed --> Open: Failure Threshold (10)
    Open --> HalfOpen: Timeout (60s)
    HalfOpen --> Closed: Success
    HalfOpen --> Open: Failure
    
    state Closed {
        [*] --> Healthy
        Healthy --> Counting: Error
        Counting --> Healthy: Success
        Counting --> [*]: Threshold
    }
    
    state Open {
        [*] --> Rejecting
        Rejecting --> [*]: All Requests Rejected
    }
    
    state HalfOpen {
        [*] --> Testing
        Testing --> [*]: Single Request
    }
```

## Input Validation Layers

```mermaid
flowchart LR
    subgraph "Frontend Validation"
        A[User Input] --> B[Zod Schema]
        B --> C[React Hook Form]
        C --> D[DOMPurify XSS]
    end

    subgraph "Edge Function Validation"
        D --> E[Request Schema]
        E --> F[JSONB Validation]
        F --> G[Base64 Size Check]
    end

    subgraph "Database Validation"
        G --> H[CHECK Constraints]
        H --> I[Trigger Validation]
        I --> J[Type Constraints]
    end
```

### Validation Schema Example

```typescript
const GenerateContentRequestSchema = z.object({
  generationId: z.string().uuid(),
  model_config: z.object({
    modelId: z.string().min(1).max(100),
    provider: z.enum(['runware', 'kie_ai', 'lovable_ai_sync']),
    baseCreditCost: z.number().min(0).max(10000),
  }),
  prompt: z.string().min(1).max(10000),
  custom_parameters: z.record(z.unknown()).optional(),
});
```

## Secrets Management

```mermaid
flowchart TB
    subgraph "Secret Types"
        A[API Keys] --> D[Supabase Vault]
        B[Webhook Tokens] --> D
        C[Service Keys] --> D
    end

    subgraph "Access Control"
        D --> E{Edge Function}
        E --> F[Deno.env.get()]
        F --> G[Scoped Access]
    end

    subgraph "Rotation"
        H[Key Rotation] --> I[Update Vault]
        I --> J[Redeploy Functions]
    end
```

### Secret Categories

| Category | Storage | Access | Rotation |
|----------|---------|--------|----------|
| Provider API Keys | Vault | Edge Functions | Manual |
| Supabase Keys | Environment | All Functions | Auto |
| Webhook Tokens | Database | Per-Generation | Per-Request |
| Signing Keys | Vault | Admin Functions | 90 days |

## Audit Logging

```mermaid
flowchart LR
    subgraph "Captured Events"
        A[User Actions]
        B[Admin Actions]
        C[System Events]
        D[Security Events]
    end

    subgraph "Audit Record"
        A --> E[audit_logs table]
        B --> E
        C --> E
        D --> E
        E --> F[user_id]
        E --> G[action]
        E --> H[resource_type]
        E --> I[resource_id]
        E --> J[metadata]
        E --> K[ip_address]
        E --> L[created_at]
    end

    subgraph "Retention"
        E --> M[90 Day Retention]
        M --> N[Archive to Cold Storage]
    end
```

### Audited Actions

| Category | Actions |
|----------|---------|
| Authentication | login, logout, password_reset, email_verify |
| Generation | create, complete, fail, delete |
| Credits | purchase, use, refund, grant |
| Admin | user_ban, settings_change, model_update |
| Security | rate_limit_hit, auth_fail, suspicious_activity |

## Content Security Policy

```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https: blob:;
  font-src 'self' data:;
  connect-src 'self' https://*.supabase.co wss://*.supabase.co;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
">
```

## Security Checklist

- [x] JWT authentication on all protected endpoints
- [x] RLS policies on all user data tables
- [x] Rate limiting on all endpoints
- [x] Circuit breakers for external APIs
- [x] Input validation (Zod + JSONB)
- [x] XSS prevention (DOMPurify)
- [x] CORS with origin validation
- [x] Audit logging
- [x] Secrets in Vault (not code)
- [x] No source maps in production
- [x] Error message sanitization
- [x] Base64 DoS protection
- [ ] CSP headers (partial)
- [ ] Request signing for admin
- [ ] CAPTCHA for auth endpoints

## Incident Response

```mermaid
flowchart TB
    A[Security Event] --> B{Severity}
    B -->|Critical| C[Immediate Alert]
    B -->|High| D[15min Alert]
    B -->|Medium| E[Daily Report]
    B -->|Low| F[Weekly Report]
    
    C --> G[Admin Notification]
    D --> G
    G --> H[Investigate]
    H --> I{Action Required?}
    I -->|Yes| J[Block/Fix]
    I -->|No| K[Document]
    J --> L[Post-Mortem]
    K --> L
```
