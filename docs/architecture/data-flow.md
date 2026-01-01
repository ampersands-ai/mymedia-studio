# Data Flow Architecture

## Generation Data Flow

### 1. Initiation Phase

```mermaid
flowchart LR
    subgraph "Frontend"
        A[User Input] --> B[Model Registry Lookup]
        B --> C[Input Validation<br/>Zod Schema]
        C --> D[Create Generation<br/>in Database]
    end

    subgraph "Database"
        D --> E[(generations table<br/>status: pending)]
    end

    subgraph "Edge Function"
        E --> F[POST /generate-content]
        F --> G[Request Validation]
        G --> H[Rate Limit Check]
        H --> I[Circuit Breaker Check]
    end
```

### 2. Processing Phase

```mermaid
flowchart LR
    subgraph "Credit Management"
        A[Reserve Credits] --> B{Sufficient?}
        B -->|Yes| C[Deduct Credits]
        B -->|No| D[Return Error]
    end

    subgraph "Provider Call"
        C --> E[Provider Router]
        E --> F{Provider Type}
        F -->|Sync| G[Direct API Call]
        F -->|Async| H[Webhook Setup]
    end

    subgraph "Result Handling"
        G --> I[Upload to Storage]
        H --> J[Await Callback]
        J --> I
        I --> K[Update Generation]
    end
```

### 3. Completion Phase

```mermaid
flowchart LR
    subgraph "Finalization"
        A[Generation Complete] --> B[Calculate Actual Cost]
        B --> C{Cost Match?}
        C -->|Over| D[Charge Difference]
        C -->|Under| E[Refund Difference]
        C -->|Match| F[No Action]
    end

    subgraph "Notification"
        D --> G[Update Status]
        E --> G
        F --> G
        G --> H[Realtime Push]
        H --> I[UI Update]
    end
```

## Credit System Flow

```mermaid
stateDiagram-v2
    [*] --> Available: User Has Credits
    Available --> Reserved: Generation Started
    Reserved --> Deducted: Confirmed Usage
    Reserved --> Available: Generation Failed
    Deducted --> PartialRefund: Actual < Reserved
    Deducted --> [*]: Complete
    PartialRefund --> [*]: Refund Processed
```

### Credit Transaction Types

| Transaction | Direction | Trigger |
|-------------|-----------|---------|
| `reservation` | Debit | Generation start |
| `usage` | Debit | Generation complete |
| `refund` | Credit | Generation failure |
| `adjustment` | Credit | Over-reservation |
| `purchase` | Credit | Token purchase |
| `bonus` | Credit | Promotional grant |

## Async Generation Flow (Webhooks)

```mermaid
sequenceDiagram
    participant FE as Frontend
    participant EF as Edge Function
    participant P as Provider (Kie AI)
    participant WH as Webhook Handler
    participant DB as Database

    FE->>EF: POST /generate-content
    EF->>DB: Create generation (processing)
    EF->>P: Submit generation task
    P-->>EF: Task ID
    EF-->>FE: {generationId, status: processing}
    
    Note over P: Provider processes async
    
    P->>WH: POST /generation-webhook
    WH->>WH: Verify token
    WH->>DB: Fetch generation
    WH->>WH: Upload result
    WH->>DB: Update generation (completed)
    DB->>FE: Realtime notification
```

## Storage Data Flow

```mermaid
flowchart TB
    subgraph "Upload Flow"
        A[Binary Data] --> B[Determine MIME Type]
        B --> C[Generate Path<br/>user/date/generation/file]
        C --> D[Upload to Bucket]
        D --> E[Generate Signed URL]
    end

    subgraph "Storage Structure"
        F[generated-content bucket]
        F --> G[user-id/]
        G --> H[YYYY-MM-DD/]
        H --> I[generation-id/]
        I --> J[output.ext]
    end

    subgraph "Access Control"
        K[RLS Policy]
        K --> L{User owns file?}
        L -->|Yes| M[Allow Access]
        L -->|No| N[Deny Access]
    end
```

## Error Recovery Flow

```mermaid
flowchart TB
    subgraph "Error Detection"
        A[Error Occurs] --> B{Error Type}
        B -->|Provider Error| C[Log & Retry]
        B -->|Rate Limit| D[Queue for Later]
        B -->|Auth Error| E[Fail Fast]
        B -->|Timeout| F[Mark as Failed]
    end

    subgraph "Recovery Actions"
        C --> G{Retry Count}
        G -->|< 3| H[Exponential Backoff]
        G -->|>= 3| I[Mark Failed]
        H --> J[Retry Request]
        D --> K[Return 429]
        I --> L[Refund Credits]
        F --> L
        E --> M[Return 401]
    end

    subgraph "Audit Trail"
        L --> N[Log to error_events]
        N --> O[Create Audit Record]
    end
```

## Realtime Subscription Flow

```mermaid
flowchart LR
    subgraph "Client Setup"
        A[Component Mount] --> B[Subscribe to Channel]
        B --> C[Listen for Changes]
    end

    subgraph "Database Trigger"
        D[Row Updated] --> E[PostgreSQL Trigger]
        E --> F[Notify Realtime]
    end

    subgraph "Event Delivery"
        F --> G[Match Subscriptions]
        G --> H[Push to Clients]
        H --> C
        C --> I[Update React State]
    end
```

## Batch Processing Flow

```mermaid
flowchart TB
    subgraph "Batch Input"
        A[Multiple Prompts] --> B[Validate All]
        B --> C[Reserve Total Credits]
    end

    subgraph "Parallel Processing"
        C --> D[Split into Tasks]
        D --> E1[Task 1]
        D --> E2[Task 2]
        D --> E3[Task N]
        E1 --> F1[Result 1]
        E2 --> F2[Result 2]
        E3 --> F3[Result N]
    end

    subgraph "Aggregation"
        F1 --> G[Collect Results]
        F2 --> G
        F3 --> G
        G --> H[Create Batch Record]
        H --> I[Link Child Generations]
    end
```

## Cache Strategy

| Data Type | Cache Location | TTL | Invalidation |
|-----------|---------------|-----|--------------|
| Model Registry | Memory (Registry) | Infinite | Deploy |
| User Credits | TanStack Query | 30s | Mutation |
| Generation Status | TanStack Query | 5s | Realtime |
| Voice List | TanStack Query | 5min | Manual |
| Storage URLs | Signed URL | 1hr | N/A |
