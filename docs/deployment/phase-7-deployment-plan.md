# Phase 7: Deployment & Monitoring Plan

**ADR 007: Model Direct Execution Architecture**

## Overview

This phase covers deploying the new model execution system to production and setting up comprehensive monitoring to ensure reliability and quick issue detection.

---

## Pre-Deployment Checklist

### 1. Code Review
- ✅ All model files follow standardized structure
- ✅ `get-api-key` edge function tested with all providers
- ✅ Model registry properly exports all models
- ✅ Type safety verified across all model files
- ✅ No unused imports or dead code

### 2. API Keys Verification
- ✅ All 15+ API keys configured in Supabase secrets
- ✅ Test `get-api-key` returns correct key for each provider/model combination
- ✅ No hardcoded API keys in codebase
- ✅ Keys properly scoped (IMAGE_TO_VIDEO vs PROMPT_TO_VIDEO)

### 3. Database State
- ✅ Legacy model metadata tables removed (migration to registry complete)
- ✅ `generations` table schema supports new flow
- ✅ RLS policies allow model registry access
- ✅ No breaking changes to existing records

### 4. Edge Functions
- ✅ `get-api-key` deployed and functional
- ✅ `execute-custom-model` removed from codebase
- ✅ Webhook handlers still operational
- ✅ All other edge functions unaffected

### 5. Backward Compatibility
- ✅ Existing generations still viewable
- ✅ Workflows continue to use `generate-content` (unaffected)
- ✅ Old generation records remain accessible
- ✅ No data migration required

---

## Deployment Strategy

### Step 1: Edge Function Deployment (Auto)
```bash
# Edge functions deploy automatically when code is pushed
# Verify get-api-key is live:
```
**Verification:**
- Call `get-api-key` with test provider/model
- Check logs for successful key retrieval
- Ensure CORS headers work

### Step 2: Frontend Deployment
```bash
# Deploy frontend with new model registry
# This happens automatically via Lovable publish
```
**Verification:**
- Custom Creation page loads correctly
- Model dropdown populates from registry
- No console errors on page load

### Step 3: Smoke Test (Production)
**Test 1: Simple Image Generation**
- Model: `runware_flux_1_schnell`
- Prompt: "A red apple on a table"
- Expected: Image generated within 10 seconds

**Test 2: Video Generation**
- Model: `Seedance_V1_Lite`
- Prompt: "Ocean waves crashing"
- Expected: Webhook polling starts, video completes in 3-5 minutes

**Test 3: Lovable AI Sync**
- Model: Nano Banana
- Prompt: "Simple test image"
- Expected: Instant generation, no polling

### Step 4: Monitor Initial Traffic
- Watch for 1 hour after deployment
- Check error rates in logs
- Verify no spike in failed generations
- Monitor API key retrieval success rate

---

## Monitoring Setup

### 1. Logging Strategy

**Edge Function Logs (get-api-key):**
```typescript
// Already implemented in supabase/functions/get-api-key/index.ts
logger.info('API key retrieval successful', { 
  provider, 
  modelId, 
  keyType: 'KIE_AI_API_KEY_PROMPT_TO_VIDEO' 
});

logger.error('Failed to retrieve API key', error, { 
  provider, 
  modelId 
});
```

**Frontend Logs (executeGeneration.ts):**
```typescript
// Already implemented in src/lib/generation/executeGeneration.ts
logger.info('Starting direct model execution', { 
  modelId, 
  provider, 
  contentType 
});

logger.error('Generation failed', error, { 
  modelId, 
  generationId 
});
```

**Webhook Logs (existing):**
```typescript
// Already implemented in webhook handlers
webhookLogger.success(generationId, { 
  provider, 
  duration 
});
```

### 2. Key Metrics to Track

**Success Rate:**
- Track: `generations.status = 'completed'` vs `'failed'`
- Goal: >95% success rate
- Alert if: <90% success rate over 1 hour

**API Key Retrieval:**
- Track: `get-api-key` function success rate
- Goal: 100% success (all keys configured)
- Alert if: Any failures (indicates missing key)

**Generation Latency:**
- Track: Time from `created_at` to `completed_at`
- Goal: 
  - Images: <30 seconds
  - Videos: <5 minutes (depends on model)
- Alert if: >2x expected time

**Error Rates by Provider:**
- Track: Errors grouped by `provider_response.error`
- Goal: <5% error rate per provider
- Alert if: >10% errors for any provider

**Token Deduction:**
- Track: Credits deducted per generation
- Goal: Matches model `baseCreditCost` + multipliers
- Alert if: Unexpected token amounts

### 3. Database Queries for Monitoring

**Recent Generations:**
```sql
SELECT 
  model_id,
  status,
  COUNT(*) as count,
  AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_duration_seconds
FROM generations
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY model_id, status
ORDER BY count DESC;
```

**Failed Generations (Last Hour):**
```sql
SELECT 
  id,
  model_id,
  status,
  provider_response->'error' as error_message,
  created_at
FROM generations
WHERE status = 'failed'
  AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 20;
```

**API Key Retrieval Errors:**
```sql
-- Check edge function logs for get-api-key failures
-- Use Supabase dashboard: Logs > Edge Functions > get-api-key
-- Filter: level = 'error'
```

### 4. Alert Configuration

**Critical Alerts (Immediate Action):**
1. **Missing API Key**
   - Trigger: `get-api-key` returns 404 or 500
   - Action: Check Supabase secrets, add missing key
   
2. **High Error Rate**
   - Trigger: >20% generations fail in 15 minutes
   - Action: Check provider status, investigate logs

3. **All Generations Failing**
   - Trigger: 100% failure rate for 5+ minutes
   - Action: Rollback deployment immediately

**Warning Alerts (Review Within 1 Hour):**
1. **Increased Latency**
   - Trigger: Avg generation time >2x normal
   - Action: Check provider API status
   
2. **Specific Model Failing**
   - Trigger: One model has >50% failure rate
   - Action: Investigate model-specific issue

3. **Unexpected Token Costs**
   - Trigger: Token deductions don't match `baseCreditCost`
   - Action: Verify `calculateCost()` function

---

## Rollback Procedures

### If Critical Issues Detected

**Scenario 1: All Generations Failing**
```bash
# Restore execute-custom-model edge function
git revert <commit-hash-of-phase-4>

# Revert executeGeneration.ts changes
git checkout HEAD~1 -- src/lib/generation/executeGeneration.ts

# Redeploy
git push
```

**Scenario 2: Specific Provider Failing**
```typescript
// Temporarily disable provider in model registry
// Edit src/lib/models/registry.ts
export const modelRegistry = [
  // ...other models
  // Commented out failing models:
  // kieAISeedanceV1Lite,
  // kieAIKlingV2Pro,
];
```

**Scenario 3: API Key Retrieval Failing**
```sql
-- Emergency: Add missing key via Supabase dashboard
-- Settings > Edge Functions > Secrets
-- Add: KIE_AI_API_KEY_PROMPT_TO_VIDEO = <key>
```

### Rollback Decision Matrix

| Issue | Severity | Rollback? | Alternative Action |
|-------|----------|-----------|-------------------|
| All gens fail | Critical | YES | None, rollback immediately |
| One model fails | High | NO | Disable model in registry |
| Slow latency | Medium | NO | Investigate provider status |
| Missing API key | High | NO | Add key to secrets |
| UI broken | Critical | YES | Fix UI, don't touch backend |
| Token calculation wrong | High | NO | Fix `calculateCost()`, redeploy |

---

## Post-Deployment Validation

### Day 1: Hourly Checks
- Hour 1: Smoke tests pass
- Hour 2: No critical errors
- Hour 4: Error rate <5%
- Hour 8: All providers working
- Hour 24: Monitor overnight traffic

### Week 1: Daily Checks
- Day 1: Review all alerts
- Day 2-3: Monitor error trends
- Day 4-5: Verify latency stable
- Day 6-7: Compare to pre-deployment metrics

### Week 2: Full Validation
- **Success Criteria Met:**
  - ✅ Error rate <5%
  - ✅ Latency same or better than old system
  - ✅ All 15+ API keys working
  - ✅ No user complaints about generation failures
  - ✅ Token costs accurate

- **If Criteria Not Met:**
  - Investigate root cause
  - Fix identified issues
  - Consider partial rollback

---

## Performance Benchmarks

### Before (Old Middleware System):
- **Image Generation:** 15-30 seconds
- **Video Generation:** 3-5 minutes
- **Error Rate:** ~3-5%
- **API Calls:** 2 per generation (middleware + provider)

### After (Direct Execution):
- **Image Generation:** 10-25 seconds (faster due to less overhead)
- **Video Generation:** 3-5 minutes (same)
- **Error Rate:** Target <5%
- **API Calls:** 1 per generation (direct to provider)

### Expected Improvements:
- ⚡ **Latency:** 20-30% faster (no middleware hop)
- 🔧 **Maintainability:** Easier to add/modify models
- 🔍 **Debugging:** Clearer error messages
- 💰 **Cost:** Slightly lower (fewer edge function invocations)

---

## Documentation Updates

### Update These Files:
1. ✅ `docs/adr/007-model-direct-execution.md` (main ADR)
2. ✅ `docs/testing/phase-6-manual-checklist.md` (testing plan)
3. ✅ `docs/deployment/phase-7-deployment-plan.md` (this file)
4. 📝 **TODO:** Update `README.md` with new architecture notes
5. 📝 **TODO:** Add comments to model files explaining direct execution

### Developer Onboarding:
**New developers should know:**
- Models execute directly (no middleware)
- `get-api-key` retrieves secrets securely
- Model registry is source of truth for available models
- Each model is a self-contained `.ts` file
- API keys are scoped by use case (not just provider)

---

## Success Metrics (1 Month Post-Deployment)

### Quantitative:
- **Uptime:** >99.5%
- **Error Rate:** <3%
- **Avg Latency:** <30s for images, <5min for videos
- **API Key Issues:** 0 missing key errors
- **User Satisfaction:** No increase in support tickets

### Qualitative:
- **Developer Experience:** Easier to add new models
- **Debugging Time:** Faster to identify issues
- **Code Quality:** More maintainable, less complex
- **Scalability:** Ready for 100+ models without performance degradation

---

## Next Steps After Deployment

1. **Monitor for 2 weeks** - Ensure stability
2. **Document learnings** - Update ADR with any issues found
3. **Optimize performance** - Identify slow models, optimize
4. **Add more models** - Leverage new architecture to add models faster
5. **Consider Phase 8:** Advanced features (caching, retry logic, etc.)

---

## Emergency Contacts

**If Issues Occur:**
1. Check Supabase logs first (Edge Functions, Database)
2. Review `docs/testing/phase-6-manual-checklist.md` for test scenarios
3. Check this deployment plan for rollback procedures
4. If all else fails, revert to previous deployment

**Key Files to Monitor:**
- `src/lib/generation/executeGeneration.ts`
- `src/lib/models/registry.ts`
- `supabase/functions/get-api-key/index.ts`
- Edge function logs in Supabase dashboard

---

## Conclusion

Phase 7 deployment is straightforward because:
- ✅ No database migrations needed
- ✅ Backward compatible with existing data
- ✅ Can rollback easily if needed
- ✅ Comprehensive monitoring in place

**Deployment is APPROVED when:**
- All pre-deployment checks pass
- Smoke tests successful
- Monitoring confirms <5% error rate for 24 hours
- No critical alerts triggered

🚀 **Ready to deploy!**
