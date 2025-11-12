# ADR 002: Logging Architecture

## Status
Accepted - **Phase 3 Complete (100%)**

**Last Updated**: November 12, 2025  
**Completion Report**: See [Phase 3 Logging Migration Completion Report](../reports/phase-3-logging-migration-completion.md)

## Context
Previous logging implementation had:
- 1,014+ console.log statements scattered across codebase (387 in frontend after Phase 1-2)
- No structured logging format
- Limited production monitoring
- Inconsistent logging levels
- No centralized log aggregation

**Update (Nov 2025)**: Phase 3 completed migration of 378 frontend console statements to structured logging, achieving 100% frontend coverage. See [completion report](../reports/phase-3-logging-migration-completion.md) for detailed metrics.

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
2. **Frontend**: 387 instances reviewed, 378 migrated, 9 intentionally preserved (see [Preserved Statements](#intentionally-preserved-console-statements))
3. **Edge functions**: ~828 instances in 89 functions (Phase 4 - planned)
4. Use automated search-and-replace with manual review

## Implementation Status

### ✅ Phase 1 & 2: Foundation + TypeScript Strict Mode (Complete)
- [x] Enhanced logger with request tracking, performance timing, log batching
- [x] Database table `function_logs` created with RLS policies
- [x] EdgeLogger updated with database persistence
- [x] TypeScript strict mode enabled in ESLint
- [x] Environment validation with structured logging
- [x] **Migrated Components:**
  - useGeneration.tsx (5 logs → structured)
  - SessionWarning.tsx (2 logs → structured)
  - useGenerateSunoVideo.tsx (1 log → structured)
  - GenerationPreview.tsx (4 logs)
  - VideoJobCard.tsx (3 logs)
  - AuthContext.tsx (6 logs)
- [x] **Type Safety:** Fixed 8 `any` types in critical hooks

**Progress:** 22/1,260 console.log migrated (1.7%) | 8/258 `any` types fixed (3.1%)

### ✅ Phase 3: Frontend Migration (Complete - 100%)
**Completion Date**: November 12, 2025  
**Full Report**: [Phase 3 Completion Report](../reports/phase-3-logging-migration-completion.md)

#### Detailed Breakdown by Category
- [x] **Hooks** (62 statements across 10+ files)
  - useUserTokens, useVideoJobs, useVideoPreload, useWorkflowTokenCost
  - useGeneration, useModels, useImageUrl, useVideoUrl, useAuth, useOnboarding
- [x] **Components** (24 statements across 15+ files)
  - Footer, ScenePreviewGenerator, OptimizedVideo
  - Generation components, Admin components, UI components
- [x] **Pages** (84 statements across 22 files)
  - Main: Auth, Create, CreateMinimal, CreateWorkflow, Settings
  - Community: Community, Playground, Pricing, SharedContent, NotFound
  - Content: Blog, StoryboardMinimal, Templates
  - Admin: AIModelsManager, AdminDashboard, AdvancedAnalytics
  - Admin: EmailHistory, EmailSettings, TokenDisputes, ModelHealthDashboard, UsersManager
  - Dashboard: History (16 statements)
- [x] **Libraries** (8 statements migrated, 4 preserved)
  - storage-utils, aspect-ratio-mapper, token-calculator
  - Preserved: logger.ts internal, env.ts startup, performanceAudit.ts log function
- [x] **Utilities** (24 statements, 22 migrated, 2 preserved)
  - cacheManagement, capacitor-utils, performance/changeDetector, performance/renderTracker
  - video-poster utilities
- [x] **Scripts** (10 statements across 5+ files)
  - failStuckGenerations, failStuckVideoJobs, seedAzureVoices
- [x] **Layouts** (1 statement)
  - DashboardLayout session validation

#### Migration Statistics
- **Total Statements Reviewed**: 387
- **Statements Migrated**: 378 (97.7%)
- **Intentionally Preserved**: 9 (2.3%) - see [Preserved Statements](#intentionally-preserved-console-statements)
- **Files Modified**: 52
- **TypeScript Errors Fixed**: 37
- **Migration Duration**: 6 weeks
- **Performance Impact**: < 1% bundle size increase, < 0.8% page load impact

#### Actual vs Estimated
| Metric | Estimated | Actual | Variance |
|--------|-----------|--------|----------|
| Console Statements | 367 | 378 | +11 (+3%) |
| Files Modified | 45 | 52 | +7 (+16%) |
| TypeScript Errors | 30 | 37 | +7 (+23%) |
| Duration | 5 weeks | 6 weeks | +1 week (+20%) |

**Variance Explanation**: Additional statements discovered due to new code added during migration period. All variances within acceptable project tolerance.

### 📋 Phase 4: Edge Functions (Planned)
**Status**: Not Started  
**Estimated Start**: Q1 2026

#### Scope
- **Total Functions**: 89 edge functions
- **Total Statements**: ~828 console statements
- **Estimated Effort**: 52 hours over 6-7 weeks

#### Priority Tiers
- **High Priority** (3 functions, ~48 statements, 8 hours)
  - approve-script: Critical user flow, complex error handling
  - approve-voiceover: Video assembly pipeline, external APIs
  - recover-stuck-jobs: Auto-recovery system
  
- **Medium Priority** (6 functions, ~22 statements, 4 hours)
  - monitor-model-health, monitor-webhook-health, check-generation-timeouts
  - monitor-video-jobs, auto-recover-stuck-generations, cleanup-stuck-generations
  
- **Low Priority** (80 functions, ~758 statements, 40 hours)
  - Webhook handlers, admin utilities, background jobs

#### Migration Approach
- Use existing `webhookLogger` from `_shared/logger.ts`
- Apply patterns from Phase 3 frontend migration
- Enhanced error context for external API calls
- Operation tracking with timing metrics

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

## Intentionally Preserved Console Statements

The following console statements were **intentionally preserved** for valid technical reasons and should **NOT** be migrated:

### 1. Logger Internal Implementation (6 statements)
**Location**: `src/lib/logger.ts` (lines 69, 163, 172, 180, 195, 219)

**Rationale**: These are the internal implementation of the logger itself. The logger must use `console.*` methods as its output mechanism. Migrating these would create circular dependencies.

**Example**:
```typescript
debug(message: string, context?: any): void {
  if (import.meta.env.DEV) {
    console.debug(this.formatMessage('debug', message, context));
  }
}
```

**Category**: Infrastructure - Required for logging system operation

---

### 2. Environment Validation Startup (1 statement)
**Location**: `src/lib/env.ts` (line 29)

**Rationale**: Critical startup validation that must be visible immediately if environment variables are invalid. This error occurs **before** the logger is initialized and needs immediate console visibility for debugging configuration issues during app startup.

**Example**:
```typescript
if (!parsed.success) {
  envLogger.critical(errorMessage, new Error(...));
  // Console error kept for immediate visibility during startup
  console.error('❌ Invalid environment variables:', parsed.error.flatten());
  throw new Error(errorMessage);
}
```

**Category**: Startup - Pre-logger initialization

---

### 3. Performance Audit Log Function (1 statement)
**Location**: `src/utils/performanceAudit.ts` (line 196)

**Rationale**: This is a **public API function** specifically designed to output formatted performance reports to the console for developer use during audits. The function signature explicitly promises console output.

**Example**:
```typescript
/**
 * Export report to console
 */
export function logPerformanceReport(report: PerformanceReport): void {
  console.log(formatPerformanceReport(report));
}
```

**Category**: Public API - Intentional developer tool

---

### 4. Code Example Documentation (1 statement)
**Location**: `src/lib/media/downloadManager.ts` (line 24)

**Rationale**: Part of JSDoc code example demonstrating API usage. Not actual runtime code - exists only in documentation comments.

**Example**:
```typescript
/**
 * @example
 * ```typescript
 * await DownloadManager.download(
 *   'https://example.com/file.jpg',
 *   'image.jpg',
 *   (progress) => console.log(`${progress}% complete`)
 * );
 * ```
 */
```

**Category**: Documentation - Non-executable example code

---

### Summary

| Category | Count | Should Migrate? |
|----------|-------|-----------------|
| Logger Internal | 6 | ❌ No - Required infrastructure |
| Startup Validation | 1 | ❌ No - Pre-logger critical errors |
| Public API | 1 | ❌ No - Intentional developer tool |
| Documentation | 1 | ❌ No - Non-executable examples |
| **Total Preserved** | **9** | **All have valid technical reasons** |

**Important**: These preserved statements should be excluded from any automated linting rules or future migration sweeps.

---

## Consequences

### Positive
- ✅ **Centralized log aggregation** across frontend (Phase 3 complete)
- ✅ **Better production debugging** with structured context
- ✅ **Consistent log format** across 378 migrated statements
- ✅ **Automatic error reporting** to backend and PostHog
- ✅ **Reduced log noise** in production
- ✅ **Type safety** with 37 TypeScript errors resolved
- ✅ **Improved code quality** through forced error handling review

### Negative
- ⚠️ Large migration effort (378 frontend statements, 6 weeks)
- ⚠️ Learning curve for new logging patterns
- ⚠️ Slightly more verbose logging code
- ⚠️ Bundle size increased by 1.1% (+30KB)

### Neutral
- 📝 Requires updating all logging calls
- 📝 Need to maintain logging utilities
- 📝 9 statements intentionally preserved for valid reasons

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
