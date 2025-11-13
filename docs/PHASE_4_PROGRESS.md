# Phase 4: Edge Function Logging Migration Progress

## Overview
Migrating ~100+ edge functions from `console.log` to structured logging using `webhookLogger` and `EdgeLogger`.

## Migration Strategy
- **Webhook handlers**: Use `webhookLogger` for webhook lifecycle events
- **Generation functions**: Use `webhookLogger` for generation tracking
- **Monitoring/Recovery**: Use `EdgeLogger` for operational monitoring
- **Admin/Support**: Use `EdgeLogger` for administrative operations

## Completed Functions

✅ **kie-ai-webhook** (~30 statements)
- Migrated webhook received, security layers, processing events, download/upload, success/failure logging

✅ **dodo-webhook-v2** (~25 statements)  
- Migrated webhook received, security validation, event processing, token management, error handling

✅ **json2video-webhook** (~18 statements)
- Migrated webhook received, security checks, processing, download/upload, completion tracking

✅ **dodo-payments-webhook** (~35 statements)
- Migrated deployment logging, header validation, svix verification, timestamp checks, event processing, payment/subscription handlers

✅ **webhooks/midjourney-webhook** (Already using webhookLogger)
- Already fully migrated with structured logging

**Total Migrated: 5 functions, ~108 console.log statements**

---

## Remaining Functions (95+ functions, ~700+ statements)

### Critical Generation Functions (5 functions, ~108 statements)
- [ ] generate-content (~25)
- [ ] generate-storyboard (~30)
- [ ] render-storyboard-video (~20)
- [ ] generate-content-sync (~15)
- [ ] process-video-job (~18)

### Recovery & Monitoring (8 functions, ~74 statements)
- [ ] recover-generation (~10)
- [ ] check-generation-timeouts (~8)
- [ ] monitor-model-health (~12)
- [ ] monitor-video-jobs (~10)
- [ ] monitor-webhook-health (~8)
- [ ] auto-recover-stuck-generations (~8)
- [ ] recover-stuck-jobs (~10)
- [ ] fix-stuck-generation (~8)

### Status & Polling Functions (5 functions, ~40 statements)
- [ ] poll-kie-status (~8)
- [ ] poll-storyboard-status (~8)
- [ ] check-video-status (~8)
- [ ] check-video-generation-status (~8)
- [ ] fetch-video-status (~8)

### Admin & Management Functions (15 functions, ~120 statements)
- [ ] manage-user-tokens (~10)
- [ ] manage-user-role (~8)
- [ ] deduct-tokens (~6)
- [ ] manual-fail-generations (~8)
- [ ] manual-fail-video-jobs (~8)
- [ ] cleanup-stuck-generations (~8)
- [ ] auto-timeout-stuck-generations (~8)
- [ ] retry-pending-midjourney (~8)
- [ ] cancel-generation (~8)
- [ ] cancel-render (~8)
- [ ] delete-storyboard (~6)
- [ ] regenerate-storyboard-scene (~10)
- [ ] migrate-storyboard-videos (~12)
- [ ] seed-azure-voices (~8)
- [ ] sync-voice-previews (~12)

### Email & Alert Functions (9 functions, ~72 statements)
- [ ] send-error-alert (~10)
- [ ] send-generation-timeout-alert (~8)
- [ ] send-model-alert (~8)
- [ ] send-new-user-alert (~8)
- [ ] send-welcome-email (~8)
- [ ] send-webhook-alert (~10)
- [ ] send-daily-error-summary (~10)
- [ ] send-test-email (~5)
- [ ] notify-generation-complete (~5)

### Content & Media Functions (10 functions, ~80 statements)
- [ ] generate-caption (~8)
- [ ] generate-random-prompt (~6)
- [ ] generate-test-image (~8)
- [ ] generate-video-topic (~8)
- [ ] generate-suno-mp4 (~10)
- [ ] enhance-prompt (~8)
- [ ] search-pixabay-audio (~8)
- [ ] search-pixabay-content (~8)
- [ ] download-storyboard-video (~8)
- [ ] get-voices (~8)

### User & Session Functions (8 functions, ~64 statements)
- [ ] approve-script (~8)
- [ ] approve-voiceover (~12)
- [ ] create-video-job (~10)
- [ ] create-share-link (~8)
- [ ] get-shared-content (~8)
- [ ] session-manager (~8)
- [ ] extend-session (~5)
- [ ] security-monitor (~5)

### Payment & Audit Functions (5 functions, ~40 statements)
- [ ] create-dodo-payment (~8)
- [ ] track-payment-completed (~8)
- [ ] audit-log (~8)
- [ ] log-activity (~8)
- [ ] log-error (~8)

### Utility & Support Functions (10 functions, ~80 statements)
- [ ] rate-limiter (~8)
- [ ] stream-content (~10)
- [ ] test-model-generation (~10)
- [ ] check-model-health (~10)
- [ ] webhooks/kie-webhook (~12)
- [ ] workflow-executor/helpers/image-upload (~10)
- [ ] recovery/recover-kie-generation (~10)
- [ ] recovery/recover-runware-generation (~10)

---

## Next Steps
1. ✅ Complete all webhook handlers (5/5 done)
2. Migrate critical generation functions (0/5)
3. Migrate recovery & monitoring functions (0/8)
4. Batch migrate remaining functions by category

## Success Metrics
- All edge functions using structured logging
- Consistent log format across all functions
- Easy log querying in production
- Better debugging and monitoring capabilities
