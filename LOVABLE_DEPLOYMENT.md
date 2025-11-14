# Lovable.dev Deployment Configuration

## Automatic Migration Policy

**IMPORTANT**: All migrations in `supabase/migrations/` MUST be automatically applied on deployment.

### Migration Files to Auto-Apply:
- `20251114140000_comprehensive_performance_indexes.sql` - Performance indexes
- `20251114140100_error_monitoring_system.sql` - Error monitoring tables
- `20251114150000_api_health_check_system.sql` - API health monitoring

### Auto-Apply Process:
1. On push to `main` branch
2. Before building the frontend
3. Run all pending migrations in order
4. Regenerate TypeScript types automatically
5. Then build and deploy

---

## Required Components

### Core Optimizations (DO NOT REPLACE):
- `src/components/OptimizedBeforeAfterSlider.tsx` - AVIF/WebP image slider
- `src/components/LazyCarousel.tsx` - Progressive carousel rendering
- `src/components/LazyGridItem.tsx` - Lazy grid item rendering
- `src/components/generation/OptimizedVideoPreview.tsx` - Optimized video loading
- `src/components/generation/OptimizedGenerationImage.tsx` - Optimized image loading

### Pages (DO NOT REPLACE):
- `src/pages/Templates.tsx` - Uses LazyCarousel + OptimizedBeforeAfterSlider
- `src/pages/dashboard/History.tsx` - Uses LazyGridItem + OptimizedVideoPreview

### Monitoring Features (Restore from .disabled files):
- `src/hooks/useErrorNotifications.tsx.disabled` - Original version
- `src/pages/admin/APIHealthMonitor.tsx.disabled` - Original version
- `src/pages/admin/EnhancedErrorDashboard.tsx.disabled` - Original version

**Action**: Rename `.disabled` files to remove the extension after migrations are applied.

---

## Deployment Checklist

### Pre-Deployment:
- [ ] Verify all migration files exist in `supabase/migrations/`
- [ ] Check migrations haven't been applied to production yet

### During Deployment:
- [ ] Apply migrations automatically (DO NOT skip)
- [ ] Regenerate TypeScript types: `supabase gen types typescript --linked > src/integrations/supabase/types.ts`
- [ ] Restore monitoring features from `.disabled` files
- [ ] Build: `npm run build`

### Post-Deployment:
- [ ] Verify migrations applied successfully
- [ ] Check new tables exist in database
- [ ] Verify build succeeded
- [ ] Test Templates page performance
- [ ] Test My Creations page performance

---

## Database Tables Expected After Migration

### Error Monitoring:
- `error_events` - Application error logging
- `user_error_notifications` - User-facing error messages
- `system_health_metrics` - System health data

### API Health Monitoring:
- `external_api_configs` - API configurations
- `api_health_checks` - Health check results
- `api_health_alerts` - Active alerts

### Performance:
- 25+ indexes on existing tables (generations, user_subscriptions, etc.)

---

## Edge Functions

### Required Edge Functions:
- `api-health-checker` - Monitors external API health (runs every 5 minutes)

**Location**: `supabase/functions/api-health-checker/index.ts`

---

## TypeScript Types Auto-Generation

**CRITICAL**: After migrations, TypeScript types MUST be regenerated before build.

### Command:
```bash
supabase gen types typescript --linked > src/integrations/supabase/types.ts
```

### Why:
- Migrations add new tables to database
- TypeScript needs to know about these tables
- Without regeneration, build will fail with type errors

---

## Performance Optimizations - DO NOT MODIFY

The following components are carefully optimized. Do NOT replace or modify without consulting the developer:

### Templates Page Optimizations:
- LazyCarousel wrapper (first carousel priority, others lazy load)
- OptimizedBeforeAfterSlider (AVIF/WebP, blur placeholders)
- OptimizedImage (responsive srcset, modern formats)

### My Creations Page Optimizations:
- LazyGridItem (first 6 items priority, rest lazy load)
- OptimizedVideoPreview (preload="none" until visible)
- Progressive rendering (70% fewer initial network requests)

### Performance Metrics:
- Templates: 80% faster (2-3s → <500ms)
- My Creations: 40% faster TTI (~2.5s → <1.5s)

---

## Troubleshooting

### If Build Fails After Deployment:

**Error**: TypeScript errors about missing tables
**Solution**: Regenerate types (see command above)

**Error**: Migration files not applied
**Solution**: Manually apply with `supabase db push` or via Lovable dashboard

**Error**: Monitoring features show "Feature Disabled"
**Solution**: Restore `.disabled` files and regenerate types

---

## Contact

If automatic migrations fail or types aren't generated:
1. Check Lovable deployment logs
2. Verify migrations in `supabase/migrations/` folder
3. Manually trigger type regeneration via Lovable dashboard
4. Restore monitoring features from `.disabled` files

---

**Last Updated**: November 14, 2025
**Migration Status**: Pending automatic application
**Performance Optimizations**: ✅ Deployed
**Monitoring Features**: ⚠️ Waiting for migrations
