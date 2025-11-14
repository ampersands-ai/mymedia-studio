# Supabase TypeScript Types - Fix Required

**Status**: ⚠️ ACTION REQUIRED
**Issue**: TypeScript types out of sync with database schema
**Impact**: Build errors in error monitoring and API health features

---

## 🔴 Problem

The following migrations were created that added new tables and functions to your Supabase database:

### 1. **Error Monitoring System** (Migration: `20251114140100_error_monitoring_system.sql`)
**Tables Created:**
- `error_events` - Central error logging
- `user_error_notifications` - User-facing error messages
- `system_health_metrics` - Health monitoring data

**RPC Functions Created:**
- `resolve_error_event` - Mark errors as resolved
- `log_error_event` - Log new errors

### 2. **API Health Check System** (Migration: `20251114150000_api_health_check_system.sql`)
**Tables Created:**
- `external_api_configs` - API configuration
- `api_health_checks` - Health check history
- `api_health_alerts` - Alert management

**RPC Functions Created:**
- `get_api_health_summary` - Get health status summary

**Views Created:**
- `api_health_summary` - Real-time health view

---

## ⚠️ Why TypeScript Errors?

The TypeScript type definitions in `src/integrations/supabase/types.ts` are generated from your Supabase database schema. When new tables or functions are added via migrations, the types file becomes outdated.

### Current TypeScript Errors:
```
❌ error TS2769: No overload matches this call.
   Argument of type '"user_error_notifications"' is not assignable to parameter...

❌ error TS2345: Argument of type '"get_api_health_summary"' is not assignable...

❌ error TS2769: Argument of type '"api_health_alerts"' is not assignable...

❌ error TS2345: Argument of type '"resolve_error_event"' is not assignable...
```

---

## ✅ Solution: Regenerate Supabase Types

### **Option 1: Using Supabase CLI (Recommended)**

```bash
# 1. Install Supabase CLI if not installed
npm install -g supabase

# 2. Login to Supabase
supabase login

# 3. Link your project (get project ref from Supabase dashboard)
supabase link --project-ref YOUR_PROJECT_REF

# 4. Generate types from your database
supabase gen types typescript --linked > src/integrations/supabase/types.ts

# 5. Build to verify
npm run build
```

### **Option 2: Manual Generation (Alternative)**

1. Go to your Supabase Dashboard
2. Navigate to **Settings** → **API**
3. Scroll to **TypeScript Types**
4. Copy the generated TypeScript code
5. Replace contents of `src/integrations/supabase/types.ts`
6. Run `npm run build` to verify

---

## 🔧 Temporary Fix (Until Types Regenerated)

I've commented out the features that use the new tables to prevent build errors:

### Files Modified:
1. ✅ `src/hooks/useErrorNotifications.tsx` - Disabled (returns empty data)
2. ✅ `src/pages/admin/APIHealthMonitor.tsx` - Disabled (shows message)
3. ✅ `src/pages/admin/EnhancedErrorDashboard.tsx` - Disabled (shows message)

### What This Means:
- ✅ Your app will build successfully
- ⚠️ Error monitoring features temporarily disabled
- ⚠️ API health monitoring temporarily disabled
- ✅ All other features work normally
- ✅ Templates and My Creations optimizations still active

---

## 📊 Impact of My Changes on Database

**YES** - My changes impacted your Supabase database schema:

### What Was Added:

#### **Error Monitoring Tables:**
```sql
-- error_events table
CREATE TABLE error_events (
  id UUID PRIMARY KEY,
  severity TEXT,
  category TEXT,
  message TEXT,
  user_facing BOOLEAN,
  user_message TEXT,
  metadata JSONB,
  resolved BOOLEAN,
  created_at TIMESTAMPTZ
);

-- user_error_notifications table
CREATE TABLE user_error_notifications (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  error_event_id UUID REFERENCES error_events(id),
  title TEXT,
  message TEXT,
  action_label TEXT,
  action_url TEXT,
  shown BOOLEAN,
  dismissed BOOLEAN,
  created_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
);

-- system_health_metrics table
CREATE TABLE system_health_metrics (
  id UUID PRIMARY KEY,
  metric_name TEXT,
  metric_value NUMERIC,
  metric_unit TEXT,
  recorded_at TIMESTAMPTZ
);
```

#### **API Health Monitoring Tables:**
```sql
-- external_api_configs table
CREATE TABLE external_api_configs (
  id UUID PRIMARY KEY,
  name TEXT,
  display_name TEXT,
  health_check_url TEXT,
  check_interval_minutes INTEGER,
  timeout_seconds INTEGER,
  is_critical BOOLEAN,
  alert_threshold INTEGER,
  is_enabled BOOLEAN,
  created_at TIMESTAMPTZ
);

-- api_health_checks table
CREATE TABLE api_health_checks (
  id UUID PRIMARY KEY,
  api_config_id UUID REFERENCES external_api_configs(id),
  status TEXT, -- 'healthy', 'degraded', 'unhealthy', 'timeout', 'error'
  response_time_ms INTEGER,
  status_code INTEGER,
  error_message TEXT,
  checked_at TIMESTAMPTZ
);

-- api_health_alerts table
CREATE TABLE api_health_alerts (
  id UUID PRIMARY KEY,
  api_config_id UUID REFERENCES external_api_configs(id),
  severity TEXT, -- 'critical', 'warning', 'info'
  message TEXT,
  consecutive_failures INTEGER,
  failure_started_at TIMESTAMPTZ,
  resolved BOOLEAN,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
);
```

### Migration Files Created:
- ✅ `supabase/migrations/20251114140000_comprehensive_performance_indexes.sql`
- ✅ `supabase/migrations/20251114140100_error_monitoring_system.sql`
- ✅ `supabase/migrations/20251114150000_api_health_check_system.sql`

---

## 🔄 How to Apply Migrations

### **If migrations were NOT yet applied to database:**

```bash
# Run migrations locally
supabase db reset

# Or push to cloud
supabase db push
```

### **If migrations were already applied:**

The tables already exist in your database, you just need to regenerate TypeScript types.

---

## 📝 Re-enabling Features After Type Regeneration

Once you've regenerated types, revert the temporary fixes:

1. Restore `src/hooks/useErrorNotifications.tsx`
2. Restore `src/pages/admin/APIHealthMonitor.tsx`
3. Restore `src/pages/admin/EnhancedErrorDashboard.tsx`
4. Run `npm run build` - should work with no errors
5. Features will work again:
   - ✅ User error notifications
   - ✅ Admin error dashboard
   - ✅ API health monitoring

---

## 🎯 Summary

### What Happened:
1. I created migrations that added 6 new tables to your database
2. I created code that uses these new tables
3. TypeScript types haven't been regenerated
4. Build fails due to type mismatches

### What You Need To Do:
1. **Run**: `supabase gen types typescript --linked > src/integrations/supabase/types.ts`
2. **Build**: `npm run build` (should succeed)
3. **Done**: All features will work

### Temporary State:
- ✅ Build succeeds (features disabled)
- ⚠️ Error monitoring disabled
- ⚠️ API health monitoring disabled
- ✅ Templates optimizations working
- ✅ My Creations optimizations working

---

## ❓ Questions

**Q: Do I need to run the migrations?**
A: Check your Supabase dashboard. If the tables `error_events`, `user_error_notifications`, `api_health_checks` don't exist, run `supabase db push`.

**Q: Will this affect my production database?**
A: Only if you run `supabase db push`. The migrations are in version control but not applied until you explicitly push them.

**Q: Can I skip the error monitoring features?**
A: Yes! I've already disabled them. Your app works fine without them. Re-enable later when you have time.

**Q: Will future code changes also affect the database?**
A: Only if I create migration files in `supabase/migrations/`. I'll clearly indicate when database changes are involved.

---

**Last Updated**: November 14, 2025
**Action Required**: Regenerate Supabase TypeScript types
**Priority**: Medium (app builds, but features disabled)
