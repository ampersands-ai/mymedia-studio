# Phase 1: Batch Migration Plan

## Overview
Given the scale (66 remaining edge functions + 179 frontend any types), this work requires systematic batching. Each batch focuses on high-impact files to deliver immediate value.

---

## Batch Strategy

### Principle: Maximum Impact First
1. **User-facing functions** before internal utilities
2. **High-traffic paths** before low-traffic
3. **Type safety** in core business logic first
4. **Parallel execution** for efficiency

---

## Batch 1: Foundation ✅ COMPLETE

**Delivered**: Infrastructure + 4 edge functions

### Infrastructure Created
- ✅ `src/types/api-responses.ts` - API response types
- ✅ `src/types/hooks.ts` - Hook return types
- ✅ `src/types/edge-functions.ts` - Edge function types
- ✅ `supabase/functions/_shared/validation.ts` - Centralized validation
- ✅ `supabase/functions/_shared/cors-headers.ts` - Security headers

### Edge Functions Migrated
1. ✅ `cancel-generation` - User cancellation
2. ✅ `manual-fail-video-jobs` - Admin operations
3. ✅ `log-activity` - Activity tracking
4. ✅ `generate-content` - Already had validation

---

## Batch 2: Critical User Paths (NEXT)

**Target**: 10 edge functions + 15 frontend files
**Estimated Time**: 2-3 hours of AI work

### Edge Functions (10)
**Rationale**: These are the most user-facing, high-traffic paths

1. `approve-voiceover` (31 console statements)
   - Complex validation needed
   - User approval workflow
   - High console cleanup impact

2. `enhance-prompt` 
   - Already has EdgeLogger ✓
   - Needs validation + security headers
   - User-facing AI enhancement

3. `workflow-executor`
   - Already has validation ✓
   - Needs security headers
   - Core workflow execution

4. `create-video-job`
   - User video creation
   - Needs full migration

5. `render-storyboard-video`
   - Video rendering
   - Critical path

6. `poll-storyboard-status`
   - Status polling
   - High traffic

7. `regenerate-storyboard-scene`
   - Scene regeneration
   - User editing

8. `delete-storyboard`
   - User deletion
   - Needs validation

9. `approve-script`
   - Script approval
   - User workflow

10. `extend-session`
    - Session management
    - High frequency

### Frontend Files (15)
**Rationale**: Core generation hooks and user-facing components

#### Hooks (5 files)
1. `useGeneration.tsx` - 3 `any` types
2. `useGenerationPolling.ts` - 2 `any` types
3. `useGenerateSunoVideo.tsx` - 2 `any` types
4. `useWorkflowExecution.tsx` - 2 `any` types
5. `useGenerationState.ts` - 3 `any` types

#### Components (10 files)
6. `OutputPanel.tsx` - 2 `any` types
7. `GenerationCard.tsx` - 2 `any` types
8. `PromptInput.tsx` - 2 `any` types
9. `ModelSelector.tsx` - 2 `any` types
10. `WorkflowBuilder.tsx` - 3 `any` types
11. `ParameterControls.tsx` - 3 `any` types
12. `GenerationHistory.tsx` - 3 `any` types
13. `GenerationPreview.tsx` - 2 `any` types
14. `EnhancedPrompt.tsx` - 3 `any` types
15. `TemplateSelector.tsx` - 3 `any` types

---

## Batch 3: Storyboard & Video Features

**Target**: 15 edge functions + 20 frontend files

### Edge Functions (15)
- Storyboard generation and management
- Video job processing
- Scene regeneration
- Status polling
- Video downloads

### Frontend Files (20)
- Storyboard hooks (5 files)
- Storyboard components (10 files)
- Video components (5 files)

---

## Batch 4: Admin & Monitoring

**Target**: 15 edge functions + 20 frontend files

### Edge Functions (15)
- User role management
- Token management
- Health monitoring
- Generation monitoring
- Webhook monitoring
- Analytics

### Frontend Files (20)
- Admin components (10 files)
- Monitoring components (5 files)
- Admin utilities (5 files)

---

## Batch 5: Webhooks & Recovery

**Target**: 15 edge functions + 20 frontend files

### Edge Functions (15)
- Webhook handlers (kie-ai, json2video, dodo)
- Recovery functions
- Stuck job cleanup
- Auto-recovery
- Timeout monitoring

### Frontend Files (20)
- Remaining components
- Utility functions
- Type utilities

---

## Batch 6: Final Cleanup

**Target**: Remaining 11 edge functions + remaining frontend files

### Edge Functions (11)
- Notifications & alerts
- Email sending
- Testing functions
- Utility functions
- Rate limiting

### Frontend Files (Remaining ~13)
- Edge case utilities
- Legacy code with documented reasons for `any`
- Final verification

---

## Implementation Approach

### For Each Batch

#### Edge Functions
1. **Read files** in parallel (batch of 5)
2. **Update files** in parallel (batch of 5)
3. **Test deployment** automatically
4. **Verify logs** in Cloud

#### Frontend Files
1. **Identify `any` usage** with search
2. **Update types** in parallel (batch of 10)
3. **Verify build** passes
4. **Check type coverage** improves

### Parallel Execution Strategy
```typescript
// Read 5 files simultaneously
lov-view(file1), lov-view(file2), lov-view(file3), lov-view(file4), lov-view(file5)

// Update 5 files simultaneously
lov-line-replace(file1), lov-line-replace(file2), lov-line-replace(file3), 
lov-line-replace(file4), lov-line-replace(file5)
```

---

## Progress Tracking

### Batch 1 ✅
- Infrastructure: 5/5 files created
- Edge functions: 4/4 migrated
- Frontend: 0/0 (setup phase)
- **Status**: COMPLETE

### Batch 2 ⏳
- Edge functions: 0/10
- Frontend: 0/15
- **Status**: NEXT

### Batch 3-6 📋
- **Status**: PLANNED

---

## Success Criteria per Batch

### Edge Functions
- [ ] All functions use validation module
- [ ] All functions use security headers
- [ ] All console.* replaced with logger.*
- [ ] All responses use helper functions
- [ ] Request duration logged
- [ ] Build passes
- [ ] Edge functions deploy successfully

### Frontend
- [ ] All `any` types replaced
- [ ] Proper imports from `@/types/`
- [ ] Type guards for runtime checks
- [ ] Build passes with no type errors
- [ ] ESLint passes (when enabled)

---

## Rollback Plan per Batch

If issues arise in any batch:
1. **Edge functions**: Keep validation/headers modules (no breaking changes)
2. **Frontend**: Revert type changes to specific files only
3. **Infrastructure**: Never revert (additive only)

---

## Communication Plan

After each batch:
1. ✅ Update `PHASE_1_MIGRATION_TRACKER.md`
2. ✅ Update `PHASE_1_COMPLETE.md`
3. ✅ Test critical paths
4. ✅ Document any issues
5. ✅ Provide next batch summary

---

## Estimated Timeline

- **Batch 1**: ✅ Complete (4 hours)
- **Batch 2**: 2-3 hours
- **Batch 3**: 2-3 hours
- **Batch 4**: 2-3 hours
- **Batch 5**: 2-3 hours
- **Batch 6**: 1-2 hours
- **Total**: ~14-18 hours of AI work

**Human time**: Review + testing between batches (~1 hour per batch)

---

## Notes

- Each batch is independently deployable
- No breaking changes between batches
- Can pause/resume at any batch boundary
- Priority can shift based on user needs
- Batches can be parallelized across multiple sessions
