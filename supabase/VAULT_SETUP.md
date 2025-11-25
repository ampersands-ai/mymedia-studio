# Supabase Vault Setup for Secure Cron Jobs

## ⚠️ Security Issue Fixed

**Previous migrations contained hardcoded JWT tokens.** This has been fixed by using Supabase Vault to store secrets securely.

## Setup Instructions

### Step 1: Store the Anon Key in Vault

Run this SQL in your Supabase SQL Editor:

```sql
-- Store the anon key securely in Vault
SELECT vault.create_secret(
  'SUPABASE_ANON_KEY',
  'your-actual-anon-key-here',  -- Replace with your anon key
  'Supabase anon key for cron jobs'
);

-- Grant access to postgres role (required for cron jobs)
GRANT SELECT ON vault.decrypted_secrets TO postgres;
```

### Step 2: Get Your Anon Key

1. Go to Supabase Dashboard → **Settings** → **API**
2. Copy the "anon public" key
3. Use it in the SQL above

### Step 3: Apply the Migration

The migration `20251125_fix_hardcoded_tokens.sql` will:
- Enable Supabase Vault extension
- Recreate all cron jobs to use Vault-stored secrets
- Remove old cron jobs with hardcoded tokens

### Step 4: Verify It Works

Check that cron jobs are running:

```sql
SELECT * FROM cron.job WHERE jobname IN (
  'send-daily-error-summary',
  'check-generation-timeouts',
  'auto-recover-stuck-generations'
);
```

Check Vault secret exists:

```sql
SELECT name, description, created_at
FROM vault.decrypted_secrets
WHERE name = 'SUPABASE_ANON_KEY';
```

## Why This Is Important

### Before (❌ INSECURE):
```sql
headers := '{"Authorization": "Bearer eyJhbG..."}'::jsonb  -- Hardcoded in git!
```

**Problems:**
- Token visible in git history forever
- Anyone with repo access can see it
- If token rotates, must update all migrations
- Creates security audit trail issues

### After (✅ SECURE):
```sql
SELECT decrypted_secret INTO anon_key
FROM vault.decrypted_secrets
WHERE name = 'SUPABASE_ANON_KEY';
```

**Benefits:**
- ✅ Token stored encrypted in Supabase Vault
- ✅ Not visible in git history
- ✅ Easy to rotate without changing code
- ✅ Follows security best practices
- ✅ Audit trail in Vault, not in git

## Rotating the Token

If you need to rotate the anon key:

```sql
-- Update the secret in Vault
SELECT vault.update_secret(
  'SUPABASE_ANON_KEY',
  'new-anon-key-here'
);
```

No code changes needed! 🎉

## Troubleshooting

### "SUPABASE_ANON_KEY not found in Vault"

This warning means the secret hasn't been created yet. Run Step 1 above.

### Cron jobs not running

Check logs:

```sql
SELECT * FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'send-daily-error-summary')
ORDER BY start_time DESC
LIMIT 5;
```

### Permission denied on vault.decrypted_secrets

Grant access:

```sql
GRANT SELECT ON vault.decrypted_secrets TO postgres;
```

## Security Notes

**About the Anon Key:**
- The "anon" key is **meant to be public** (used in client-side code)
- It's protected by Row Level Security (RLS) policies
- Still better to store in Vault for key rotation flexibility

**Old Migrations:**
The migrations with hardcoded tokens are still in git history. To fully remediate:

1. ✅ This migration replaces all cron jobs (done)
2. ⚠️ Consider rotating your anon key if you're concerned about the git history exposure
3. ✅ Use Vault for all future secrets

## References

- [Supabase Vault Documentation](https://supabase.com/docs/guides/database/vault)
- [Supabase pg_cron Guide](https://supabase.com/docs/guides/database/extensions/pgcron)
