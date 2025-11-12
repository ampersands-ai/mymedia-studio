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
2. Frontend: 392 instances in 126 files
3. Edge functions: 892 instances in 91 files
4. Use automated search-and-replace with manual review

## Implementation Status

### ✅ Phase 1: Foundation (Complete)
- [x] Database table `function_logs` created with RLS policies
- [x] EdgeLogger updated with database persistence
- [x] Frontend Logger class with PostHog integration
- [x] Client-side error logging to backend

### ✅ Phase 2: High-Priority Migrations (Complete)
- [x] Generation components (GenerationPreview, GenerationPolling)
- [x] Video components (VideoJobCard)
- [x] Authentication (AuthContext)
- [x] Download/upload managers
- [x] Storage managers

### 🚧 Phase 3: Remaining Frontend (In Progress)
- [ ] Admin tools (25 files, ~90 statements)
- [ ] Media effects components (15 files, ~50 statements)
- [ ] Low-priority components (56 files, ~142 statements)

### 🚧 Phase 4: Edge Functions (In Progress)
- [ ] High-traffic functions (15 functions, ~250 statements)
- [ ] Webhook handlers (20 functions, ~200 statements)
- [ ] Utility functions (56 functions, ~442 statements)

### ✅ Phase 5: Monitoring (Complete)
- [x] Error Dashboard with dual-source display
- [x] Real-time log aggregation
- [x] Frontend and backend error tracking
- [x] Admin-only access with RLS

### ✅ Phase 6: Documentation (Complete)
- [x] Logging Migration Guide
- [x] ADR 002 updated with implementation status
- [x] Code examples and best practices
- [x] Anti-patterns documentation

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

## Database Schema

### user_error_logs
Frontend errors with user context, browser info, and stack traces.

### function_logs
Edge function logs with request IDs, duration tracking, and error details.
- Automatic cleanup after 30 days
- RLS policies for admin-only access
- Indexed for efficient querying

## Monitoring

### Production Monitoring
- **PostHog**: User-facing events, errors, and warnings
- **Error Dashboard** (`/admin/error-dashboard`):
  - Frontend errors from `user_error_logs`
  - Backend errors from `function_logs`
  - Real-time updates every 10 seconds
  - Severity filtering and grouping
  - Admin-only access

### Development Monitoring
- Console logs in browser DevTools
- Structured JSON output in edge function logs
- Full context and stack traces

## Performance Impact
- Frontend logging: <1ms overhead per call
- Edge function logging: <2ms overhead per call
- Database persistence: Only for error/critical levels
- PostHog batching: Automatic, no user-facing impact

## Related Decisions
- ADR 001: Error Handling Strategy
- ADR 005: Monitoring & Observability
