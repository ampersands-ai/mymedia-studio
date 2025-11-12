# ADR 004: Testing Strategy

## Status
Accepted

## Context
The application had no automated testing infrastructure:
- No unit tests for utilities
- No integration tests for critical flows
- No test coverage measurement
- Manual testing only

## Decision
Implement comprehensive testing infrastructure using Vitest and Playwright:

### Test Types

#### 1. Unit Tests (Vitest)
- **Coverage Target**: 80% for utility functions
- **Focus Areas**:
  - Error handling utilities
  - Type validators
  - Business logic functions
  - Custom hooks
  - Storage/media managers

#### 2. Integration Tests (Playwright)
- **Critical User Flows**:
  - Authentication (signup, login, logout)
  - Generation flow (create, poll, view result)
  - Download operations
  - Settings management
  - Error recovery flows

#### 3. Edge Function Tests (Deno Test)
- Test authentication validation
- Test input validation
- Test error responses
- Test external API integrations (with mocks)

### Testing Tools

**Frontend**:
- **Vitest**: Fast unit test runner
- **@testing-library/react**: React component testing
- **@testing-library/user-event**: User interaction simulation
- **Playwright**: E2E browser testing

**Backend**:
- **Deno Test**: Built-in edge function testing

### Test Structure

```
src/
  lib/
    errors.test.ts          # Unit tests for error utilities
    logger.test.ts          # Unit tests for logger
    media/
      downloadManager.test.ts
  hooks/
    useDownload.test.ts     # Hook unit tests
  test/
    setup.ts                # Test configuration
    
tests/
  e2e/
    auth.spec.ts            # E2E authentication tests
    generation.spec.ts      # E2E generation flow tests
    
supabase/functions/
  _shared/
    circuit-breaker.test.ts
  generate-content/
    test.ts                 # Edge function tests
```

### Coverage Thresholds

```typescript
coverage: {
  thresholds: {
    lines: 80,
    functions: 80,
    branches: 80,
    statements: 80,
  },
}
```

### Test Patterns

#### Unit Test Pattern
```typescript
describe('FeatureName', () => {
  it('should handle expected input', () => {
    const result = myFunction('input');
    expect(result).toBe('expected');
  });

  it('should throw on invalid input', () => {
    expect(() => myFunction(null)).toThrow();
  });

  it('should handle edge cases', () => {
    expect(myFunction('')).toBe(defaultValue);
  });
});
```

#### Integration Test Pattern
```typescript
test('user can complete generation flow', async ({ page }) => {
  await page.goto('/auth');
  await page.fill('[name="email"]', 'test@example.com');
  await page.click('[type="submit"]');
  
  await page.goto('/create');
  await page.fill('[name="prompt"]', 'Test prompt');
  await page.click('button:has-text("Generate")');
  
  await expect(page.locator('[data-testid="generation-complete"]'))
    .toBeVisible({ timeout: 60000 });
});
```

## Implementation Plan

### Phase 1: Setup (Week 1)
- Configure Vitest
- Setup test utilities
- Create example tests

### Phase 2: Unit Tests (Week 2-3)
- Test error handling utilities
- Test storage/media managers
- Test custom hooks
- Test business logic

### Phase 3: Integration Tests (Week 4)
- Setup Playwright
- Test critical user flows
- Test error scenarios

### Phase 4: CI Integration (Week 5)
- Add tests to CI pipeline
- Configure coverage reporting
- Setup test failure alerts

## Consequences

### Positive
- Catch bugs before production
- Safer refactoring
- Documentation through tests
- Confidence in changes
- Faster development long-term

### Negative
- Initial setup time
- Learning curve for team
- Test maintenance overhead
- Slower initial development

### Neutral
- Need to maintain tests alongside code
- May need to refactor code for testability

## Metrics

Track:
- Test coverage percentage
- Test execution time
- Number of tests
- Flaky test count
- Bug escape rate

## Related Decisions
- ADR 001: Error Handling Strategy
- ADR 003: Type Safety Approach
