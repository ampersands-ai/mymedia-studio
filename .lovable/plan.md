# Parallelize Bulk Storyboard Generation

## Problem
Currently, `generateAllScenePreviews` and `generateAllSceneAnimations` process scenes **sequentially** (one at a time in a `for` loop). This is slow when generating previews or animations for multiple scenes.

## Solution
Send all generation requests in parallel using `Promise.allSettled()`, with optional concurrency limiting to avoid overwhelming the API.

## Implementation Plan

### 1. Modify `generateAllScenePreviews` in `src/hooks/storyboard/useStoryboardScenes.ts`

**Current Pattern (Sequential - lines 272-354):**
```typescript
for (let i = 0; i < scenesToGenerate.length; i++) {
  // Process one scene at a time
  const scene = scenesToGenerate[i];
  onProgress?.(i + 1, scenesToGenerate.length);
  // ... await generation
  // ... await update
}
```

**New Pattern (Parallel with Concurrency Control):**
```typescript
// Helper function to process a single scene
const processScene = async (scene, index) => {
  // ... generation logic for one scene
  return { sceneNumber: scene.sceneNumber, success: true, url: outputUrl };
};

// Option A: Full Parallel (all at once)
const promises = scenesToGenerate.map((scene, i) => processScene(scene, i));
const settledResults = await Promise.allSettled(promises);

// Option B: Controlled Concurrency (e.g., 5 at a time) - Recommended
const CONCURRENCY_LIMIT = 5;
const results = [];
for (let i = 0; i < scenesToGenerate.length; i += CONCURRENCY_LIMIT) {
  const batch = scenesToGenerate.slice(i, i + CONCURRENCY_LIMIT);
  const batchResults = await Promise.allSettled(
    batch.map((scene, batchIndex) => processScene(scene, i + batchIndex))
  );
  results.push(...batchResults);
  onProgress?.(Math.min(i + CONCURRENCY_LIMIT, scenesToGenerate.length), scenesToGenerate.length);
}
```

**Changes Required:**
1. Extract single-scene generation logic into a helper function
2. Use `Promise.allSettled()` to run all requests in parallel
3. Add optional concurrency limit (e.g., 5 concurrent requests) for stability
4. Update progress tracking to show "X started" instead of "processing X of Y"
5. Handle abort signal by checking before each batch

### 2. Modify `generateAllSceneAnimations` in `src/hooks/storyboard/useStoryboardScenes.ts`

Apply the same parallel pattern to the animation generation loop (lines 454-538).

**Note:** Video generation is slower and more resource-intensive. Consider a lower concurrency limit (e.g., 3) for animations.

### 3. Update Progress Tracking in UI Components

**Modify `BulkPreviewGenerator.tsx` and `BulkAnimationGenerator.tsx`:**

Current progress text: "Generating scene X of Y..."

New progress text options:
- "Processing X scenes in parallel..." (during generation)
- "Completed X of Y scenes..." (as results come in)

The `onProgress` callback signature may need adjustment:
```typescript
// Current
onProgress: (current: number, total: number) => void

// Enhanced (optional)
onProgress: (completed: number, inProgress: number, total: number) => void
```

### 4. Handle Abort Signal Properly

When user cancels:
- In-flight requests cannot be stopped (they will complete)
- Stop initiating new batches
- Mark remaining as "cancelled"
- Refund credits for cancelled/failed generations (if applicable)

## Files to Modify

1. **`src/hooks/storyboard/useStoryboardScenes.ts`** (Primary changes)
   - Lines 202-379: Refactor `generateAllScenePreviews` to use parallel execution
   - Lines 382-562: Refactor `generateAllSceneAnimations` to use parallel execution
   - Add concurrency control helper

2. **`src/components/storyboard/BulkPreviewGenerator.tsx`** (Minor UI updates)
   - Update progress text for parallel processing context

3. **`src/components/storyboard/BulkAnimationGenerator.tsx`** (Minor UI updates)
   - Update progress text for parallel processing context

## Recommended Concurrency Limits

- **Image Generation (previews):** 5 concurrent requests
- **Video Generation (animations):** 3 concurrent requests

These can be adjusted based on API rate limits and performance testing.

## Edge Cases to Handle

1. **Partial Failures:** Some requests may fail while others succeed - use `Promise.allSettled()` to handle gracefully
2. **Abort Mid-Batch:** Don't start new batches if aborted, but let in-flight complete
3. **Rate Limiting:** If API returns 429, consider implementing exponential backoff for that batch
4. **Progress Accuracy:** Track completed count separately from in-progress count

## Expected Improvements

- **Speed:** 5x-10x faster for bulk generation (parallel vs sequential)
- **User Experience:** All scenes start generating immediately
- **Reliability:** `Promise.allSettled()` ensures all results are captured, even with partial failures
