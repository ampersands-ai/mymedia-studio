# ADR 002: Logging Architecture

## Status
Accepted

## Context
Previous logging implementation had:
- 1,014+ console.log statements scattered across codebase
- No structured logging format
- Limited production monitoring
- Inconsistent logging levels
- No centralized log aggregation

## Decision
Implement comprehensive structured logging system:

### Frontend Logging (`src/lib/logger.ts`)
- **Structured Logger Class**: Contextual logging with child loggers
- **Log Levels**: debug, info, warn, error, critical
- **Integration**: PostHog for analytics, clientLogger for backend
- **Environment-aware**: Development vs Production behavior

### Edge Function Logging (`supabase/functions/_shared/edge-logger.ts`)
- **EdgeLogger Class**: JSON-formatted structured logs
- **Context Tracking**: Request IDs, user IDs, function names
- **Duration Tracking**: Automatic operation timing
- **Structured Output**: Machine-parseable JSON logs

### Log Levels
- **debug**: Development only, verbose details
- **info**: Important events, dev-only
- **warn**: Warnings, always logged, sent to PostHog in production
- **error**: Errors with automatic backend reporting
- **critical**: Highest priority, immediate alerts

### Log Format
```typescript
{
  timestamp: ISO string,
  level: string,
  message: string,
  context: {
    component?: string,
    userId?: string,
    route?: string,
    metadata?: object
  }
}
```

## Migration Strategy
Replace all console.log/error/warn statements:
1. High-impact files first (polling, generation, auth)
2. Frontend: 123 instances in 44 files
3. Edge functions: 891 instances in 90 files
4. Use automated search-and-replace with manual review

## Consequences

### Positive
- Centralized log aggregation and monitoring
- Better production debugging
- Consistent log format across entire application
- Automatic error reporting to backend
- Reduced log noise in production

### Negative
- Large migration effort (1,014 replacements)
- Learning curve for new logging patterns
- Slightly more verbose logging code

### Neutral
- Requires updating all logging calls
- Need to maintain logging utilities

## Monitoring
- PostHog for user-facing events and errors
- Backend logging via clientLogger
- Real-time error dashboard (Phase 5)
- Future: Centralized log database table

## Related Decisions
- ADR 001: Error Handling Strategy
- ADR 005: Monitoring & Observability
