# Artifio.ai - Comprehensive Test Cases

## Test Coverage Strategy

**Target**: 80% code coverage across all critical paths
**Framework**: Vitest (unit/integration), Playwright (E2E)
**CI/CD**: Run on every PR + scheduled daily runs

---

## 1. Authentication & Authorization Tests

### TC-AUTH-001: User Registration
**Priority**: P0 (Critical)
**Type**: E2E
**Steps**:
1. Navigate to signup page
2. Enter valid email and password
3. Submit form
4. Verify email confirmation sent
5. Verify user redirected to dashboard
6. Verify 5 free credits allocated

**Expected**: User account created, 5 credits granted
**Test Data**: `test-${Date.now()}@artifio.ai`

### TC-AUTH-002: User Login
**Priority**: P0
**Type**: E2E
**Steps**:
1. Navigate to login page
2. Enter valid credentials
3. Submit form
4. Verify redirect to dashboard
5. Verify user session persisted

**Expected**: Successful login, session active

### TC-AUTH-003: Invalid Login Attempts
**Priority**: P1
**Type**: E2E
**Steps**:
1. Attempt login with wrong password (3 times)
2. Verify rate limiting triggered
3. Verify user-friendly error message shown

**Expected**: "Invalid credentials" message, no technical details leaked

### TC-AUTH-004: Session Refresh
**Priority**: P1
**Type**: Unit
**Steps**:
1. Create session with 1-hour expiry
2. Mock time advance to 59 minutes
3. Trigger protected action
4. Verify session refreshed automatically

**Expected**: Session extended without user intervention

### TC-AUTH-005: RBAC - Admin Access
**Priority**: P0
**Type**: Integration
**Steps**:
1. Login as regular user
2. Attempt to access `/admin` routes
3. Verify access denied
4. Login as admin user
5. Verify admin routes accessible

**Expected**: Regular users blocked, admins granted access

---

## 2. Image Generation Tests

### TC-GEN-001: Runware Image Generation (Success)
**Priority**: P0
**Type**: Integration
**Steps**:
1. User with 10 credits selects "Product Photography" template
2. Enter prompt: "Red sports car on mountain road"
3. Submit generation request
4. Verify webhook received
5. Verify image URL returned
6. Verify credits deducted (1 credit)
7. Verify image saved to user's history

**Expected**: Image generated, credits deducted, history updated
**Mock**: Runware API with 200 response

### TC-GEN-002: Insufficient Credits
**Priority**: P0
**Type**: Integration
**Steps**:
1. User with 0 credits attempts generation
2. Verify request blocked before API call
3. Verify user-friendly message: "Insufficient credits. Purchase more to continue."
4. Verify upgrade CTA shown

**Expected**: Request blocked, no API call made, user prompted to upgrade

### TC-GEN-003: Generation Timeout
**Priority**: P1
**Type**: Integration
**Steps**:
1. Submit generation request
2. Mock Runware API delay (60+ seconds)
3. Verify timeout handled gracefully
4. Verify credits refunded
5. Verify user notified: "Generation timed out. Credits refunded."

**Expected**: Timeout detected, credits restored, user notified

### TC-GEN-004: Model Failover
**Priority**: P1
**Type**: Integration
**Steps**:
1. Submit generation to Runware (primary)
2. Mock Runware failure (500 error)
3. Verify automatic failover to Kie.ai
4. Verify generation completes successfully
5. Verify user unaware of failover

**Expected**: Transparent failover, successful generation

### TC-GEN-005: Polling Memory Leak Prevention
**Priority**: P0
**Type**: Unit
**Steps**:
1. Start generation with polling
2. Unmount component after 10 polls
3. Verify `clearInterval` called
4. Verify no orphaned timers remain
5. Check memory usage stable

**Expected**: No memory leaks, timers cleaned up
**File**: `src/hooks/useGenerationPolling.ts`

### TC-GEN-006: Concurrent Generation Limit
**Priority**: P1
**Type**: Integration
**Steps**:
1. User submits 4 generations simultaneously
2. Verify queue system activated
3. Verify max 3 concurrent requests
4. Verify 4th queued and processed after slot opens

**Expected**: Queue system prevents overload, all 4 complete

---

## 3. Payment & Subscription Tests

### TC-PAY-001: Successful Credit Purchase
**Priority**: P0
**Type**: E2E
**Steps**:
1. User with 0 credits clicks "Buy Credits"
2. Select $4.99 package (100 credits)
3. Mock Dodo Payments success webhook
4. Verify credits added to account
5. Verify transaction recorded in `user_subscriptions`
6. Verify user notified: "100 credits added!"

**Expected**: Credits added, payment recorded, user notified

### TC-PAY-002: Payment Failure
**Priority**: P0
**Type**: Integration
**Steps**:
1. Submit payment request
2. Mock Dodo Payments failure webhook
3. Verify credits NOT added
4. Verify user notified: "Payment failed. Please try again."
5. Verify transaction marked as failed

**Expected**: No credits added, user notified, transaction logged

### TC-PAY-003: Webhook Signature Validation
**Priority**: P0 (Security)
**Type**: Unit
**Steps**:
1. Send webhook with invalid signature
2. Verify request rejected (401 Unauthorized)
3. Send webhook with valid signature
4. Verify request processed

**Expected**: Invalid signatures rejected, valid accepted
**File**: `supabase/functions/dodo-webhook/index.ts`

### TC-PAY-004: Duplicate Payment Prevention
**Priority**: P0
**Type**: Integration
**Steps**:
1. Send payment webhook (transaction_id: ABC123)
2. Verify credits added
3. Send duplicate webhook (same transaction_id)
4. Verify duplicate rejected
5. Verify credits NOT added again

**Expected**: Duplicate prevented via unique constraint
**Database**: `user_subscriptions(transaction_id)` unique

### TC-PAY-005: Atomic Credit Deduction
**Priority**: P0 (Race Condition)
**Type**: Integration
**Steps**:
1. User with 1 credit submits 2 generations simultaneously
2. Verify optimistic locking prevents double-spend
3. Verify only 1 generation succeeds
4. Verify 2nd shows "Insufficient credits"

**Expected**: Race condition handled, no negative balance

---

## 4. Video Generation Tests

### TC-VID-001: End-to-End Video Creation
**Priority**: P0
**Type**: E2E
**Steps**:
1. Navigate to Video Studio
2. Enter script: "Artificial intelligence is transforming our world"
3. Select Azure voice: "en-US-JennyNeural"
4. Select stock media keywords: "technology, AI, future"
5. Submit job
6. Poll for completion (max 5 minutes)
7. Verify video URL returned
8. Verify video playable
9. Verify credits deducted (5 credits)

**Expected**: Video rendered, credits deducted, video playable
**External APIs**: Azure TTS, Pixabay, Shotstack

### TC-VID-002: TTS Failure Handling
**Priority**: P1
**Type**: Integration
**Steps**:
1. Submit video job
2. Mock Azure TTS failure (500 error)
3. Verify job marked as failed
4. Verify credits refunded
5. Verify user notified: "Video creation failed. Credits refunded."

**Expected**: Failure handled gracefully, credits restored

### TC-VID-003: Shotstack Rendering Timeout
**Priority**: P1
**Type**: Integration
**Steps**:
1. Submit video job
2. Mock Shotstack stuck in "rendering" state (10+ minutes)
3. Verify timeout handler triggered
4. Verify job marked as failed
5. Verify admin alerted

**Expected**: Timeout detected, admin notified, user informed

---

## 5. Storyboard Tests

### TC-STORY-001: Multi-Scene Storyboard Creation
**Priority**: P0
**Type**: E2E
**Steps**:
1. Navigate to Storyboard Creator
2. Enter 3-scene script
3. Generate images for all scenes
4. Add narration to each scene
5. Submit for final rendering
6. Verify video URL returned
7. Verify 3 scenes stitched together

**Expected**: Multi-scene video created successfully

### TC-STORY-002: Scene Edit & Regeneration
**Priority**: P1
**Type**: Integration
**Steps**:
1. Create storyboard with 2 scenes
2. User dislikes scene 1 image
3. Regenerate scene 1 only
4. Verify only 1 credit deducted (not full storyboard)
5. Verify scene 1 updated, scene 2 unchanged

**Expected**: Partial regeneration works, cost-efficient

---

## 6. Admin Dashboard Tests

### TC-ADMIN-001: Model Health Monitoring
**Priority**: P1
**Type**: E2E
**Steps**:
1. Login as admin
2. Navigate to Model Health page
3. Verify all 20+ models shown
4. Verify status indicators (green/red)
5. Mock Runware failure
6. Verify status updates to red within 60 seconds

**Expected**: Real-time model health tracking

### TC-ADMIN-002: User Management
**Priority**: P1
**Type**: E2E
**Steps**:
1. Admin searches for user by email
2. View user's generation history
3. Manually add 50 credits to user account
4. Verify credits added
5. Verify audit log created

**Expected**: Admin can manage users, actions logged

### TC-ADMIN-003: Error Log Dashboard
**Priority**: P0 (New Feature)
**Type**: E2E
**Steps**:
1. Trigger 5 different errors (auth, generation, payment)
2. Admin opens Error Dashboard
3. Verify all 5 errors shown with:
   - Timestamp
   - User ID
   - Error type
   - Stack trace
   - Affected route
4. Admin marks error as "Resolved"

**Expected**: Centralized error visibility for admins

---

## 7. Performance & Scale Tests

### TC-PERF-001: 10,000 Concurrent Users
**Priority**: P0 (Scale Test)
**Type**: Load Test
**Setup**: K6 or Artillery
**Steps**:
1. Simulate 10,000 users logging in over 60 seconds
2. Each user submits 1 generation
3. Monitor:
   - Response times (p95 < 3s)
   - Error rate (< 1%)
   - Database connections (< 100)
   - Edge function cold starts
4. Verify system remains stable

**Expected**: <1% error rate, p95 response time <3s

### TC-PERF-002: Database Query Performance
**Priority**: P1
**Type**: Load Test
**Steps**:
1. Seed 100,000 generation records
2. Query user history (50 records)
3. Verify query time < 100ms
4. Check `EXPLAIN ANALYZE` for index usage

**Expected**: Queries optimized with indexes
**Target**: All queries < 100ms

### TC-PERF-003: Bundle Size Regression
**Priority**: P1
**Type**: CI/CD Check
**Steps**:
1. Build production bundle
2. Measure compressed size
3. Verify main bundle < 500KB
4. Verify no chunk > 1MB

**Expected**: Bundle size within limits

---

## 8. Security Tests

### TC-SEC-001: SQL Injection Prevention
**Priority**: P0
**Type**: Security
**Steps**:
1. Submit generation with malicious prompt: `"; DROP TABLE profiles; --`
2. Verify input sanitized
3. Verify no SQL executed
4. Verify database intact

**Expected**: SQL injection prevented via parameterized queries

### TC-SEC-002: XSS Prevention
**Priority**: P0
**Type**: Security
**Steps**:
1. User creates generation with prompt: `<script>alert('XSS')</script>`
2. View generation in history
3. Verify script not executed
4. Verify HTML escaped

**Expected**: XSS prevented via React's auto-escaping

### TC-SEC-003: Row Level Security (RLS)
**Priority**: P0
**Type**: Integration
**Steps**:
1. User A creates generation (id: GEN-A)
2. User B attempts to access GEN-A directly via API
3. Verify 403 Forbidden returned
4. Verify RLS policy enforced

**Expected**: Users can only access their own data

### TC-SEC-004: Rate Limiting
**Priority**: P1
**Type**: Integration
**Steps**:
1. Submit 100 generation requests in 10 seconds
2. Verify rate limit triggered after 20 requests
3. Verify 429 (Too Many Requests) returned
4. Verify user notified: "Too many requests. Please slow down."

**Expected**: Rate limiting prevents abuse

---

## 9. Error Handling & Resilience Tests

### TC-ERR-001: Network Offline Handling
**Priority**: P1
**Type**: E2E
**Steps**:
1. User starts generation
2. Simulate network disconnection
3. Verify user notified: "Connection lost. Retrying..."
4. Reconnect network
5. Verify generation completes

**Expected**: Graceful offline handling

### TC-ERR-002: Circuit Breaker Activation
**Priority**: P1
**Type**: Integration
**Steps**:
1. Mock Runware API failures (5 consecutive)
2. Verify circuit breaker opens
3. Verify subsequent requests fail-fast
4. Wait 30 seconds (circuit breaker timeout)
5. Verify circuit breaker half-opens and retries

**Expected**: Circuit breaker prevents cascade failures

### TC-ERR-003: Global Error Boundary
**Priority**: P1
**Type**: Unit
**Steps**:
1. Trigger unhandled error in component
2. Verify error boundary catches error
3. Verify fallback UI shown
4. Verify error logged to backend
5. Verify user sees: "Something went wrong. We've been notified."

**Expected**: No white screen, graceful degradation

---

## 10. User Experience Tests

### TC-UX-001: Skeleton Loading States
**Priority**: P1
**Type**: E2E
**Steps**:
1. Navigate to History page (slow network)
2. Verify skeleton loaders shown during fetch
3. Verify smooth transition to actual content
4. Verify no layout shift (CLS < 0.1)

**Expected**: Smooth loading experience

### TC-UX-002: Optimistic UI Updates
**Priority**: P1
**Type**: E2E
**Steps**:
1. User purchases 100 credits
2. Verify credit count updates immediately (optimistic)
3. Mock webhook delay (5 seconds)
4. Verify optimistic update persists
5. If webhook fails, verify rollback

**Expected**: Instant feedback, rollback on failure

### TC-UX-003: Mobile Responsiveness
**Priority**: P1
**Type**: E2E (Mobile Viewport)
**Steps**:
1. Test on iPhone SE (375px), iPad (768px), Desktop (1920px)
2. Verify all pages usable
3. Verify no horizontal scroll
4. Verify touch targets > 44px

**Expected**: Fully responsive across all devices

---

## 11. Integration Tests (External APIs)

### TC-INT-001: Runware API Health Check
**Priority**: P1
**Type**: Scheduled (Cron)
**Steps**:
1. Call Runware `/models` endpoint every 5 minutes
2. If failure detected, mark model as unhealthy
3. Alert admin via email/Slack
4. Log to `model_health_records` table

**Expected**: Proactive health monitoring

### TC-INT-002: Webhook Replay Mechanism
**Priority**: P1
**Type**: Integration
**Steps**:
1. Mock Kie.ai webhook failure (database down)
2. Verify webhook stored in retry queue
3. Wait for retry (exponential backoff: 1min, 5min, 30min)
4. Verify webhook replayed successfully

**Expected**: No lost webhooks, eventual consistency

---

## Summary

**Total Test Cases**: 50+
**Critical (P0)**: 22 test cases
**High (P1)**: 28 test cases

**Estimated Coverage**:
- Authentication: 95%
- Generation Flow: 90%
- Payment Flow: 95%
- Admin Features: 70%
- Error Handling: 85%
- **Overall Target**: 80%+

**Automation Strategy**:
1. **Pre-commit**: Linting, type checks, unit tests (<5s)
2. **Pre-push**: Integration tests (<60s)
3. **CI/CD**: Full E2E suite on PR (<10min)
4. **Nightly**: Load tests, security scans
5. **Weekly**: Manual exploratory testing

**Test Data Management**:
- Use `test-*@artifio.ai` accounts (auto-cleaned daily)
- Mock external APIs in integration tests
- Use staging environment for E2E tests
- Seed database with realistic data

**Reporting**:
- JUnit XML for CI/CD integration
- HTML report with screenshots (Playwright)
- Coverage badge in README
- Daily email digest to team
