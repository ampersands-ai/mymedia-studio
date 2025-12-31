# Scale Testing Guide for 10,000+ Users

## Infrastructure Components

### 1. Rate Limiting (Sliding Window)
- **Table**: `rate_limits_v2`
- **Tiers**: strict (10/min), standard (100/min), generation (20/min), auth (5/min)
- **Middleware**: `_shared/rate-limit-middleware.ts`

### 2. Circuit Breakers
- **Table**: `circuit_breaker_events`
- **Configs**: ai_provider, storage, webhook, email
- **Module**: `_shared/circuit-breaker-enhanced.ts`

### 3. Database Partitioning
- **Schema**: `archive`
- **Tables**: `archive.api_call_logs`, `archive.audit_logs`, `archive.generations`
- **Partition Strategy**: Monthly by `created_at`

### 4. Automated Maintenance
| Function | Schedule | Purpose |
|----------|----------|---------|
| `cron-cleanup-rate-limits` | Daily 3 AM | Clean expired rate limits |
| `cron-create-partitions` | Monthly 1st | Create future partitions |
| `cron-archive-data` | Weekly Sunday 2 AM | Archive old data |

### 5. Observability
- **Metrics**: `system_metrics` table
- **Functions**: `record_metric()`, `get_metric_stats()`

## Setting Up Cron Jobs

```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule cleanup (daily at 3 AM UTC)
SELECT cron.schedule('cleanup-rate-limits', '0 3 * * *', $$
  SELECT net.http_post(
    url:='https://gzlwkvmivbfcvczoqphq.supabase.co/functions/v1/cron-cleanup-rate-limits',
    headers:='{"Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
  );
$$);

-- Schedule partition creation (1st of month at 1 AM UTC)
SELECT cron.schedule('create-partitions', '0 1 1 * *', $$
  SELECT net.http_post(
    url:='https://gzlwkvmivbfcvczoqphq.supabase.co/functions/v1/cron-create-partitions',
    headers:='{"Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
  );
$$);

-- Schedule archival (Sunday at 2 AM UTC)
SELECT cron.schedule('archive-data', '0 2 * * 0', $$
  SELECT net.http_post(
    url:='https://gzlwkvmivbfcvczoqphq.supabase.co/functions/v1/cron-archive-data',
    headers:='{"Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
  );
$$);
```

## Integration Examples

### Rate Limiting in Edge Function
```typescript
import { applyRateLimit } from "../_shared/rate-limit-middleware.ts";

// At start of handler:
const rateLimitResponse = await applyRateLimit(req, 'generation', 'generate-content');
if (rateLimitResponse) return rateLimitResponse;
```

### Circuit Breaker for External API
```typescript
import { withCircuitBreaker } from "../_shared/circuit-breaker-enhanced.ts";

const result = await withCircuitBreaker('runware', 'ai_provider', async () => {
  return await fetch(runwareApiUrl, options);
}, supabase);
```

## Capacity Planning

| Metric | Free Tier | Pro Tier | Scale Target |
|--------|-----------|----------|--------------|
| Concurrent users | 100 | 1,000 | 10,000+ |
| Generations/hour | 500 | 5,000 | 50,000+ |
| DB connections | 60 | 500 | Pooled |

## Monitoring Queries

```sql
-- Rate limit blocks in last 24h
SELECT COUNT(*) FROM rate_limits_v2 WHERE blocked_until > now() - interval '24 hours';

-- Circuit breaker events
SELECT breaker_name, event_type, COUNT(*) 
FROM circuit_breaker_events 
WHERE created_at > now() - interval '24 hours'
GROUP BY breaker_name, event_type;

-- Archival history
SELECT * FROM archive.archival_runs ORDER BY started_at DESC LIMIT 10;
```
