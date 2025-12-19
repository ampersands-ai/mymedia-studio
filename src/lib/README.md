# /lib

Utility functions, business logic, and shared modules.

## Purpose

This directory contains non-React utility code, business logic, and shared modules used across the application. Code here should be framework-agnostic where possible.

## Directory Structure

### `admin/`
Admin-specific utilities and helpers

### `cache/`
Caching utilities and patterns

### `config/`
Application configuration constants

### `database/`
Database query helpers and utilities

### `downloads/`
File download utilities

### `errors/`
Error handling utilities:
- Custom error classes
- Error categorization
- Error formatting

### `generation/`
Content generation business logic

### `logging/`
Logging infrastructure

### `media/`
Media processing utilities:
- Image handling
- Video utilities
- Audio processing

### `models/`
AI model configuration and helpers

### `output/`
Output processing and formatting

### `storage/`
Supabase Storage utilities

### `templates/`
Template processing utilities

### `utils/`
General-purpose utilities

### `validation/`
Input validation utilities:
- `imageValidation.ts` - Base64 image detection

## Key Files

### `errors.ts`
Custom error classes with severity levels:
```typescript
import { AppError, ValidationError, NetworkError } from '@/lib/errors';

throw new ValidationError('Invalid input', 'VALIDATION_ERROR');
throw new NetworkError('API unreachable', 500);
```

### `logger.ts`
Structured logging with PostHog integration:
```typescript
import { logger } from '@/lib/logger';

logger.info('Operation completed', { userId, action: 'generate' });
logger.error('Operation failed', error, { context: 'MyComponent' });
logger.warn('Deprecated feature used', { feature: 'oldAPI' });
```

### `validation-schemas.ts`
Zod schemas for input validation:
```typescript
import { emailSchema, passwordSchema, signupSchema } from '@/lib/validation-schemas';

const result = emailSchema.safeParse(userInput);
if (!result.success) {
  // Handle validation errors
}
```

### `email-validation.ts`
Email validation utilities:
```typescript
import { isDisposableEmail, normalizeGmailDots } from '@/lib/email-validation';

if (isDisposableEmail(email)) {
  throw new Error('Temporary emails not allowed');
}
```

### `type-guards.ts`
TypeScript type guards for runtime safety:
```typescript
import { isRecord, isNonEmptyArray, hasWorkflowSteps } from '@/lib/type-guards';

if (hasWorkflowSteps(template)) {
  // template.workflow_steps is now typed as WorkflowStep[]
}
```

### `time-utils.ts`
Time formatting utilities:
```typescript
import { formatEstimatedTime } from '@/lib/time-utils';

formatEstimatedTime(90); // "1m 30s"
formatEstimatedTime(30); // "30s"
```

### `storage-utils.ts`
Supabase Storage helpers:
```typescript
import { createSignedUrl, extractStoragePath } from '@/lib/storage-utils';

const url = await createSignedUrl('bucket', 'path/to/file', 3600);
```

### `serviceWorker.ts`
PWA service worker registration (uses Workbox)

### `queryClient.ts`
TanStack Query client configuration

### `posthog.ts`
PostHog analytics configuration

### `utils.ts`
General utilities including `cn()` for class merging

## Testing

Unit tests are co-located with `.test.ts` extension:
- `errors.test.ts`
- `logger.test.ts`
- `validation-schemas.test.ts`
- `email-validation.test.ts`
- `type-guards.test.ts`

Run tests:
```bash
npm run test -- src/lib
```

## Best Practices

1. **Pure functions** - Prefer pure functions over stateful code
2. **No React imports** - Keep lib code framework-agnostic
3. **Full TypeScript** - Export types alongside functions
4. **Test coverage** - Aim for 80%+ coverage on utilities
5. **JSDoc comments** - Document function parameters and return types
6. **Error handling** - Always handle edge cases explicitly
