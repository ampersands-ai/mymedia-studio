# Edge Functions Development Guide

## Modern Deno Patterns

### ✅ Correct Patterns

```typescript
// 1. Use Deno.serve() directly (no import needed)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  // Your handler code
});

// 2. Or with a handler function
const handler = async (req: Request): Promise<Response> => {
  // Your handler code
};

Deno.serve(handler);
```

### ❌ Deprecated Patterns (DO NOT USE)

```typescript
// ❌ WRONG: Old Deno serve import
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { serve } from "std/http/server.ts";

// ❌ WRONG: Old serve() call
serve(async (req) => {
  // ...
});

// ❌ WRONG: Old Supabase import
import { createClient } from 'supabase';
```

## Automated Validation

This project includes automated validation to prevent deprecated patterns:

### Pre-commit Hook

A Git pre-commit hook automatically validates edge functions before each commit:

```bash
# Setup the hook (first time only)
npm run setup:hooks

# The hook runs automatically on commit
git commit -m "Add new edge function"
```

### Manual Validation

Run validation manually anytime:

```bash
npm run validate:edge-functions
```

### Bypass Hook (Not Recommended)

Only bypass if absolutely necessary:

```bash
git commit --no-verify -m "Emergency fix"
```

## Why These Changes?

1. **Deno.serve()** is the modern, built-in Deno API
2. **No imports needed** - cleaner, faster, more reliable
3. **Better performance** - native implementation
4. **Future-proof** - official Deno standard

## Migration Checklist

When creating or updating edge functions:

- [ ] Remove `import { serve }` statements
- [ ] Replace `serve(` with `Deno.serve(`
- [ ] Use `https://esm.sh/@supabase/supabase-js@2` for Supabase client
- [ ] Test function locally
- [ ] Run `npm run validate:edge-functions`
- [ ] Commit changes

## Troubleshooting

### Validation Fails on Commit

```bash
# Check which files have issues
npm run validate:edge-functions

# Fix the reported issues
# Then commit again
git commit -m "Fixed deprecated patterns"
```

### Hook Not Running

```bash
# Reinstall hooks
npm run setup:hooks

# Verify hook is executable
ls -la .husky/pre-commit
```

## Additional Resources

- [Deno HTTP Server Docs](https://deno.land/api?s=Deno.serve)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Modern Deno Patterns](https://deno.land/manual/runtime/http_server_apis)
