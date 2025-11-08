# Security Validator Tests

This directory contains unit tests for the webhook security validation layers.

## Running Tests

```bash
# Run all security tests
deno test supabase/functions/kie-ai-webhook/security/__tests__/

# Run specific test file
deno test supabase/functions/kie-ai-webhook/security/__tests__/url-token-validator.test.ts

# Run with coverage
deno test --coverage=coverage supabase/functions/kie-ai-webhook/security/__tests__/
```

## Test Structure

Each security layer has corresponding unit tests:

- `url-token-validator.test.ts` - Tests for Layer 1 (URL Token Validation)
- `idempotency-validator.test.ts` - Tests for Layer 4 (Idempotency Protection)

## Test Coverage

### URL Token Validator Tests
- ✅ Valid token acceptance
- ✅ Missing token rejection
- ✅ Invalid token rejection
- ✅ Empty token handling
- ✅ 404 response on failures

### Idempotency Validator Tests
- ✅ First webhook processing
- ✅ Duplicate webhook detection
- ✅ Different callback types treated as unique
- ✅ Graceful error handling

## Mock Utilities

Tests use lightweight mocks for:
- Supabase client database operations
- Environment variables
- URL parsing

## Future Tests

Additional test files to be added:
- `verify-token-validator.test.ts` - Layer 2 tests
- `timing-validator.test.ts` - Layer 3 tests

## Testing Best Practices

1. **Isolation**: Each test is independent
2. **Mocking**: External dependencies are mocked
3. **Assertions**: Clear, specific assertions
4. **Coverage**: Test both success and failure paths
5. **Documentation**: Each test describes its purpose
