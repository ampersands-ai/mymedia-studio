# URGENT: Deno Import Migration Required

## Issue
47 edge functions still use deprecated `https://deno.land/std@0.168.0/http/server.ts` import, causing deployment failures.

## Required Changes
Replace:
```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// ... later in file
serve(async (req) => {
```

With:
```typescript
// Remove serve import entirely
// ... later in file  
Deno.serve(async (req) => {
```

## Functions Requiring Fix (47 total)

### Critical (Need immediate fix)
- [x] auto-timeout-stuck-generations ✅ FIXED
- [ ] auto-recover-stuck-generations
- [ ] kie-ai-webhook (has webhookLogger but still has old import)
- [ ] json2video-webhook (has webhookLogger but still has old import)
- [ ] generate-content
- [ ] generate-storyboard
- [ ] render-storyboard-video

### High Priority (Core functionality)
- [ ] create-video-job
- [ ] process-video-job
- [ ] recover-generation
- [ ] fix-stuck-generation
- [ ] recover-stuck-jobs

### Monitoring & Health
- [ ] check-generation-timeouts
- [ ] check-model-health
- [ ] check-video-status
- [ ] check-video-generation-status
- [ ] monitor-model-health
- [ ] monitor-webhook-health
- [ ] monitor-video-jobs

### Webhooks & Status
- [ ] poll-kie-status
- [ ] poll-storyboard-status
- [ ] fetch-video-status

### Generation & Content
- [ ] generate-caption
- [ ] generate-random-prompt
- [ ] generate-suno-mp4
- [ ] generate-test-image
- [ ] generate-video-topic
- [ ] enhance-prompt

### User & Admin
- [ ] create-dodo-payment
- [ ] create-share-link
- [ ] get-shared-content
- [ ] get-voices
- [ ] manage-user-role
- [ ] manage-user-tokens
- [ ] manual-fail-generations
- [ ] manual-fail-video-jobs

### Storyboard Operations
- [ ] delete-storyboard
- [ ] download-storyboard-video
- [ ] regenerate-storyboard-scene
- [ ] migrate-storyboard-videos

### Email & Alerts
- [ ] send-error-alert
- [ ] send-generation-timeout-alert
- [ ] send-model-alert
- [ ] send-new-user-alert
- [ ] send-welcome-email
- [ ] send-test-email
- [ ] send-webhook-alert
- [ ] send-daily-error-summary

### Utility & Logging
- [ ] log-activity
- [ ] log-error
- [ ] audit-log
- [ ] rate-limiter
- [ ] session-manager
- [ ] security-monitor

### Content & Search
- [ ] search-pixabay-audio
- [ ] search-pixabay-content
- [ ] stream-content
- [ ] sync-voice-previews

### Recovery Subfunctions
- [ ] recovery/recover-kie-generation
- [ ] recovery/recover-runware-generation

### Misc
- [ ] retry-pending-midjourney
- [ ] seed-azure-voices
- [ ] test-model-generation
- [ ] track-payment-completed
- [ ] webhooks/kie-webhook
- [ ] extend-session
- [ ] cancel-generation
- [ ] cancel-render
- [ ] cleanup-stuck-generations
- [ ] notify-generation-complete

## Migration Script
To fix all at once, run search and replace:
1. Find: `import { serve } from "https://deno.land/std@0.168.0/http/server.ts";\n`
2. Replace with: `` (empty - remove the line)
3. Find: `serve(async (req) =>`
4. Replace with: `Deno.serve(async (req) =>`
