# Contributing to the Project

## Development Guidelines

### Code Style

#### Error Handling
Always use the structured error handling system:

```typescript
import { handleError, safeExecute } from '@/lib/errors';

// Pattern 1: Try-catch with proper error handling
try {
  await riskyOperation();
} catch (error) {
  const appError = handleError(error, { context: 'operation' });
  logger.error('Operation failed', appError, { userId });
  toast.error(appError.message);
}

// Pattern 2: Safe execution wrapper
const { data, error } = await safeExecute(async () => {
  return await riskyOperation();
});

if (error) {
  logger.error('Operation failed', error);
  return;
}
```

#### Logging
Use structured logging with appropriate levels:

```typescript
import { logger } from '@/lib/logger';

// Debug - development only
logger.debug('Processing started', { itemId });

// Info - important events
logger.info('User action completed', { userId, action });

// Warning - potential issues
logger.warn('Retry limit reached', { attempts });

// Error - errors that need attention
logger.error('API call failed', error, { endpoint });

// Critical - immediate attention required
logger.critical('Database connection lost', error);
```

#### Type Safety
- Always use explicit types, avoid `any`
- Define interfaces for all data structures
- Use Zod for runtime validation of external data
- Leverage TypeScript utility types

```typescript
// Good
interface UserData {
  id: string;
  email: string;
  name: string | null;
}

function processUser(user: UserData): void {
  // Implementation
}

// Bad
function processUser(user: any): void {
  // Implementation
}
```

### Testing Requirements

#### Unit Tests
- Minimum 80% coverage for utility functions
- Test error handling paths
- Test edge cases and boundary conditions

```typescript
import { describe, it, expect } from 'vitest';

describe('MyUtility', () => {
  it('should handle valid input', () => {
    const result = myFunction('valid');
    expect(result).toBe('expected');
  });

  it('should throw on invalid input', () => {
    expect(() => myFunction(null)).toThrow();
  });
});
```

#### Integration Tests
- Test critical user flows end-to-end
- Test API integration points
- Test error recovery mechanisms

### Performance Guidelines

#### Database Queries
- Use indexes for frequently queried columns
- Avoid N+1 queries - use joins or batch fetching
- Use pagination for large result sets
- Consider materialized views for complex aggregations

#### Frontend
- Lazy load routes and heavy components
- Use React Query caching appropriately
- Preload critical resources
- Implement virtualization for long lists

### Code Review Checklist

- [ ] Error handling implemented correctly
- [ ] Logging added for important operations
- [ ] Types are explicit, no `any` used
- [ ] Tests added/updated
- [ ] Performance implications considered
- [ ] Security implications reviewed
- [ ] Documentation updated
- [ ] No console.log statements (use logger)
- [ ] Edge cases handled
- [ ] Responsive design maintained

### Pull Request Guidelines

1. **Branch Naming**: `feature/description`, `fix/description`, `refactor/description`
2. **Commit Messages**: Use conventional commits format
   - `feat: add new feature`
   - `fix: resolve bug`
   - `refactor: improve code structure`
   - `docs: update documentation`
   - `test: add tests`
3. **PR Description**:
   - What changes were made?
   - Why were they necessary?
   - How to test the changes?
   - Any breaking changes?

### Architecture Decisions

For significant architectural changes:
1. Create an ADR (Architecture Decision Record) in `docs/adr/`
2. Follow the ADR template
3. Get team review before implementation
4. Update the ADR with outcome after implementation

### Common Patterns

#### Async Operations with Loading States
```typescript
const [isLoading, setIsLoading] = useState(false);

const handleOperation = async () => {
  setIsLoading(true);
  try {
    await operation();
    toast.success('Success');
  } catch (error) {
    const appError = handleError(error);
    logger.error('Operation failed', appError);
    toast.error(appError.message);
  } finally {
    setIsLoading(false);
  }
};
```

#### Download Operations
```typescript
import { useDownload } from '@/hooks/useDownload';

const { download, isDownloading } = useDownload();

await download(url, 'filename.ext');
```

#### Storage Operations
```typescript
import { StorageManager } from '@/lib/storage/storageManager';

const signedUrl = await StorageManager.getSignedUrl(path);
```

### Getting Help

- Check existing ADRs in `docs/adr/`
- Review similar implementations in codebase
- Ask in team chat for clarification
- Refer to this guide for patterns

### Local Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run tests
npm run test

# Type check
npm run type-check

# Lint
npm run lint
```
