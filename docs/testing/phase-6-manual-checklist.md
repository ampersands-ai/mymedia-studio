# Phase 6: Manual Testing Checklist

This document provides a step-by-step manual testing checklist for ADR 007 implementation.

## Test Environment Setup

- [ ] User has sufficient credits (at least 20 tokens)
- [ ] All API keys configured in Lovable Cloud secrets
- [ ] Browser console open for debugging
- [ ] Network tab open to monitor API calls

---

## 1. Image Generation Tests (Runware)

### Test 1.1: FLUX 1 Schnell (Basic)
- [ ] Navigate to Custom Creation page
- [ ] Select model: "FLUX 1 Schnell"
- [ ] Enter prompt: "A sunset over mountains"
- [ ] Click "Generate"
- [ ] **Expected Results:**
  - Loading indicator appears
  - Generation appears in Output Console
  - Image displays correctly
  - Download button works
  - Credits deducted (1 token)
- [ ] **Verify in Console:** No errors
- [ ] **Verify in Network:** API call to `get-api-key` with provider `runware`

### Test 1.2: FLUX 1.1 Pro (Advanced)
- [ ] Select model: "FLUX 1.1 Pro"
- [ ] Enter prompt: "High quality portrait photograph"
- [ ] Set outputFormat: "PNG"
- [ ] Click "Generate"
- [ ] **Expected Results:**
  - Higher quality image
  - Correct file format (PNG)
  - More tokens deducted (~3 tokens)

---

## 2. Video Generation Tests (KIE AI)

### Test 2.1: Seedance V1 Lite (Basic)
- [ ] Select model: "Seedance V1 Lite"
- [ ] Enter prompt: "A cat playing with yarn"
- [ ] Click "Generate"
- [ ] **Expected Results:**
  - Polling starts (check console for "Polling generation...")
  - Status updates from "pending" → "completed"
  - Video plays in Output Console
  - Credits deducted (10 tokens)
- [ ] **Verify:** Webhook callback received
- [ ] **Wait Time:** ~60-180 seconds

### Test 2.2: WAN 2.2 Turbo (Long Prompt)
- [ ] Select model: "WAN 2.2 Turbo"
- [ ] Enter long prompt (>1000 characters)
- [ ] Click "Generate"
- [ ] **Expected Results:**
  - Prompt accepted (no length error)
  - Video generates successfully
  - Output matches prompt details

### Test 2.3: Sora 2 by OpenAI (Specialized Key)
- [ ] Select model: "Sora 2 by OpenAI (Watermarked)"
- [ ] Enter creative prompt
- [ ] Click "Generate"
- [ ] **Expected Results:**
  - Uses `KIE_AI_API_KEY_SORA2` (verify in logs)
  - High-quality watermarked video
  - Longer generation time (~3-5 minutes)

---

## 3. Image-to-Video Tests

### Test 3.1: Kling V2 Pro (Image Upload)
- [ ] Select model: "Kling V2 Pro"
- [ ] Upload test image (JPG/PNG)
- [ ] Enter motion prompt: "Camera zooms in slowly"
- [ ] Click "Generate"
- [ ] **Expected Results:**
  - Image uploads to storage first
  - Video animates the uploaded image
  - Credits deducted (15 tokens)
- [ ] **Verify:** Image URL passed to API correctly

---

## 4. Sync Model Tests (Lovable AI)

### Test 4.1: Nano Banana (Instant Generation)
- [ ] Select model: "Nano Banana" (if available)
- [ ] Enter prompt: "A simple cartoon cat"
- [ ] Click "Generate"
- [ ] **Expected Results:**
  - No polling (instant result)
  - Image appears immediately (<5 seconds)
  - Uses `LOVABLE_API_KEY`
  - Credits deducted (1 token)

---

## 5. Error Handling Tests

### Test 5.1: Insufficient Credits
- [ ] Reduce user credits to 0 (admin panel)
- [ ] Try to generate with any model
- [ ] **Expected Results:**
  - Error: "Insufficient credits"
  - No generation record created
  - Clear error message in UI
  - No API call made

### Test 5.2: Invalid Model ID
- [ ] Manually edit URL to use non-existent model: `?model=fake_model_123`
- [ ] Try to generate
- [ ] **Expected Results:**
  - Error: "Model not found in registry"
  - Clear error message in UI

### Test 5.3: Missing Prompt
- [ ] Select any model
- [ ] Leave prompt field empty
- [ ] Click "Generate"
- [ ] **Expected Results:**
  - Validation error: "Prompt is required"
  - No API call made

### Test 5.4: Network Timeout (Simulated)
- [ ] Open DevTools → Network tab
- [ ] Throttle to "Slow 3G"
- [ ] Start generation
- [ ] **Expected Results:**
  - Graceful timeout handling
  - Error message: "Request timed out, please try again"

---

## 6. Database Verification Tests

### Test 6.1: Generation Record Creation
- [ ] Generate any image/video
- [ ] Open Lovable Cloud → Backend → generations table
- [ ] **Verify Record Contains:**
  - `user_id` = current user
  - `model_record_id` = selected model
  - `status` = "pending" initially
  - `prompt` = entered prompt
  - `provider_task_id` = (for async models)
  - `provider_response` = JSON response
  - `tokens_used` = calculated cost

### Test 6.2: Status Updates
- [ ] Generate async model (video)
- [ ] Watch generations table in Backend
- [ ] **Verify Status Flow:**
  - `pending` → `completed` (success)
  - `pending` → `failed` (on error)

### Test 6.3: Output Storage
- [ ] After generation completes
- [ ] Check generations table
- [ ] **Verify:**
  - `output_url` = signed URL
  - `storage_path` = `{user_id}/{date}/{gen_id}/output.{ext}`
- [ ] Open URL in new tab → File accessible

---

## 7. Credit System Tests

### Test 7.1: Token Deduction
- [ ] Note current token balance: ___
- [ ] Generate image (cost: 1 token)
- [ ] **Verify:**
  - New balance = old balance - 1
  - Deduction happens before generation starts

### Test 7.2: Cost Multipliers
- [ ] Select model with duration options (e.g., Runway)
- [ ] Set duration: "10s"
- [ ] Note base cost: ___ tokens
- [ ] **Expected Deduction:** base_cost × duration_multiplier
- [ ] Verify actual deduction matches calculation

---

## 8. Polling System Tests

### Test 8.1: Webhook Polling (KIE AI)
- [ ] Generate video with KIE AI model
- [ ] Open Browser Console
- [ ] **Verify Console Logs:**
  - "Polling generation {id}..."
  - "Status: pending"
  - "Status: completed" (eventually)
- [ ] **Verify Polling Stops:** After completion

### Test 8.2: Timeout Handling
- [ ] Simulate stuck generation (edit DB: set status to "pending" for old generation)
- [ ] Wait 10+ minutes
- [ ] **Expected Results:**
  - Automatic timeout mechanism triggers
  - Status changes to "failed"
  - Error message: "Generation timed out"

---

## 9. UI/UX Tests

### Test 9.1: Model Selection
- [ ] Custom Creation page loads
- [ ] Models load from registry (not DB)
- [ ] **Verify:**
  - All models appear in dropdown
  - Model descriptions display
  - Model icons/logos show

### Test 9.2: Output Console
- [ ] Generate multiple items (mix of images/videos)
- [ ] Navigate to Output Console
- [ ] **Verify:**
  - All generations appear in list
  - Thumbnails load correctly
  - Click thumbnail → Full view opens
  - Download button works for each
  - Filter by type works (image/video)

### Test 9.3: Error Display
- [ ] Trigger any error (e.g., insufficient credits)
- [ ] **Verify:**
  - Error toast appears
  - Error message is clear and actionable
  - User can dismiss error
  - Can retry after fixing issue

---

## 10. Provider-Specific Tests

### Test 10.1: Runware (Sync)
- [ ] Generate with FLUX Schnell
- [ ] **Verify:**
  - No webhook polling
  - Instant or near-instant result
  - Uses `RUNWARE_API_KEY_PROMPT_TO_IMAGE`

### Test 10.2: KIE AI (Async)
- [ ] Generate with Seedance
- [ ] **Verify:**
  - Webhook polling starts
  - Uses `KIE_AI_API_KEY_PROMPT_TO_VIDEO`
  - Webhook callback updates status

### Test 10.3: Multiple Content Types
- [ ] Test image generation (Runware)
- [ ] Test video generation (KIE AI)
- [ ] Test audio generation (if available)
- [ ] **Verify:** Each uses correct specialized API key

---

## 11. Regression Tests

### Test 11.1: Existing Workflows
- [ ] Open any saved workflow
- [ ] Run workflow
- [ ] **Verify:**
  - Workflow still uses `generate-content` edge function
  - No changes to workflow execution
  - Output appears correctly

### Test 11.2: Model Documentation Pages
- [ ] Navigate to model detail page
- [ ] **Verify:**
  - Model info displays
  - Examples load
  - "Try This Model" button works
  - Generates correctly from detail page

---

## Test Results Summary

**Date Tested:** ___________  
**Tested By:** ___________

**Results:**
- Total Tests: 40+
- Passed: ___
- Failed: ___
- Blocked: ___

**Critical Issues Found:**
1. 
2. 
3. 

**Minor Issues Found:**
1. 
2. 
3. 

**Performance Notes:**
- Average generation time (image): ___ seconds
- Average generation time (video): ___ seconds
- API key retrieval time: ___ ms

**Recommendation:**
- [ ] Ready for Phase 7 (Deployment)
- [ ] Needs fixes before deployment
- [ ] Critical blocker found

---

## Quick Smoke Test (5 minutes)

For quick validation after code changes:

1. [ ] Generate one image (FLUX Schnell)
2. [ ] Generate one video (Seedance)
3. [ ] Verify both appear in Output Console
4. [ ] Verify credits deducted correctly
5. [ ] Check console for errors

If all pass → System likely healthy ✅
