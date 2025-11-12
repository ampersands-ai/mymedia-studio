# Logging Migration Guide

## Overview

This guide provides instructions for migrating from console.log statements to our structured logging system.

## Quick Reference

```typescript
// ❌ Before
console.log('User logged in');
console.error('Error:', error);

// ✅ After
import { logger } from '@/lib/logger';
logger.info('User logged in', { userId: user.id });
logger.error('Login failed', error, { userId: user.id });
```

## Frontend Logging

### Basic Setup

```typescript
import { logger } from '@/lib/logger';

// Create component-specific logger
const componentLogger = logger.child({ component: 'MyComponent' });
```

### Log Levels

#### debug - Development-only verbose logging
```typescript
componentLogger.debug('Rendering component', { props });
```

#### info - Important events
```typescript
componentLogger.info('User action completed', { userId, action: 'submit' });
```

#### warn - Warning conditions
```typescript
componentLogger.warn('API rate limit approaching', { remaining: 10 });
```

#### error - Error conditions
```typescript
try {
  await riskyOperation();
} catch (error) {
  componentLogger.error('Operation failed', error as Error, { 
    operation: 'riskyOperation',
    userId 
  });
}
```

#### critical - Critical errors requiring immediate attention
```typescript
componentLogger.critical('Database connection lost', error as Error, {
  database: 'primary',
  timestamp: Date.now()
});
```

### Context Best Practices

Always include relevant context:
- **User identification**: `userId`, `sessionId`
- **Resource identification**: `generationId`, `jobId`, `fileId`
- **Operation details**: `action`, `status`, `duration`
- **Error details**: `errorCode`, `statusCode`

```typescript
// Good context
logger.info('Generation completed', {
  generationId: gen.id,
  userId: user.id,
  duration: 5420,
  model: 'flux-pro',
  status: 'success'
});

// Poor context
logger.info('Done');
```

## Edge Function Logging

### Basic Setup

```typescript
import { EdgeLogger } from '../_shared/edge-logger.ts';

const logger = new EdgeLogger('function-name', requestId, supabase, true);
```

### With Database Persistence

```typescript
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { EdgeLogger } from '../_shared/edge-logger.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// Enable database persistence for error/critical logs
const logger = new EdgeLogger('my-function', requestId, supabase, true);

// This will be stored in function_logs table
logger.error('Processing failed', error, { userId, taskId });
```

### Duration Tracking

```typescript
const startTime = Date.now();

// ... perform operation ...

logger.logDuration('process-webhook', startTime, { 
  webhookType: 'payment',
  status: 'success' 
});
```

## Common Migration Patterns

### Pattern 1: Simple console.log

```typescript
// Before
console.log('Processing started');

// After
logger.info('Processing started', { operation: 'batch-process' });
```

### Pattern 2: Error logging

```typescript
// Before
console.error('Failed to fetch:', error);

// After
logger.error('Fetch failed', error as Error, { 
  url: apiUrl,
  method: 'GET' 
});
```

### Pattern 3: Conditional debugging

```typescript
// Before
if (DEBUG) {
  console.log('Debug info:', data);
}

// After (automatic in dev mode)
logger.debug('Debug info', { data });
```

### Pattern 4: Grouped logs

```typescript
// Before
console.log('=== WEBHOOK DEBUG ===');
console.log('Status:', status);
console.log('Body:', body);
console.log('=====================');

// After
logger.debug('Webhook received', {
  status,
  body,
  source: 'webhook-handler'
});
```

## Anti-Patterns to Avoid

### ❌ Don't log sensitive data
```typescript
// Bad
logger.info('User data', { password: user.password, ssn: user.ssn });

// Good
logger.info('User authenticated', { userId: user.id });
```

### ❌ Don't use console.log
```typescript
// Bad
console.log('Something happened');

// Good
logger.info('Event occurred', { eventType: 'user-action' });
```

### ❌ Don't log without context
```typescript
// Bad
logger.error('Error', error);

// Good
logger.error('Generation failed', error, {
  generationId,
  userId,
  model: 'flux-pro'
});
```

### ❌ Don't use info for errors
```typescript
// Bad
logger.info('Error occurred: ' + error.message);

// Good
logger.error('Operation failed', error, { operation: 'upload' });
```

## Testing Your Logs

### Development
In development mode, logs appear in the browser console with full context:
```
[INFO] User logged in { userId: '123', timestamp: '2024-...' }
```

### Production
- `warn`, `error`, and `critical` logs are sent to PostHog
- `error` and `critical` logs are stored in `user_error_logs` table
- Edge function errors stored in `function_logs` table (if persistence enabled)

### Viewing Logs

**Frontend errors**: `/admin/error-dashboard` (requires admin role)

**Backend errors**: Same dashboard, "Backend Errors" tab

**PostHog**: Analytics → Events → Filter by log events

## Migration Checklist

- [ ] Import logger at top of file
- [ ] Create component-specific child logger
- [ ] Replace all `console.log` with appropriate log level
- [ ] Add meaningful context to each log call
- [ ] Remove sensitive data from logs
- [ ] Test in development mode
- [ ] Verify logs appear in Error Dashboard (for errors)
- [ ] Update any tests that check console output

## Performance Considerations

- Logging has minimal overhead (<1ms per call)
- Development logs are stripped in production builds
- Database persistence only for error/critical levels
- PostHog batches events automatically

## Need Help?

- Check ADR 002: Logging Architecture
- Review existing migrated files for examples
- Ask in #engineering-help channel
