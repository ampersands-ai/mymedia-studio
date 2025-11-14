# Migration Policy - DO NOT SKIP

## Auto-Apply Migrations on Every Deployment

All migration files in `supabase/migrations/` MUST be applied automatically during deployment.

### Current Pending Migrations:
1. `20251114140000_comprehensive_performance_indexes.sql` (25+ indexes)
2. `20251114140100_error_monitoring_system.sql` (3 tables + functions)
3. `20251114150000_api_health_check_system.sql` (3 tables + views)

### Why This Matters:
- **TypeScript types** depend on these tables existing
- **Monitoring features** won't work without them
- **Build will fail** if types aren't regenerated after migrations

### Lovable Configuration:
```json
{
  "autoMigrate": true,
  "migrationPath": "supabase/migrations",
  "autoTypeGen": true
}
```

### Manual Override (If Auto-Apply Fails):
```bash
supabase db push
supabase gen types typescript --linked > src/integrations/supabase/types.ts
npm run deploy:restore
npm run build
```

### Verification:
After deployment, verify these tables exist in your database:
- [ ] error_events
- [ ] user_error_notifications
- [ ] system_health_metrics
- [ ] external_api_configs
- [ ] api_health_checks
- [ ] api_health_alerts

### Post-Migration Tasks:
1. Types regenerated ✅
2. Monitoring features restored ✅
3. Build successful ✅
4. Features working ✅

---

**IMPORTANT**: Do NOT deploy without applying migrations first. The application depends on these database tables.
