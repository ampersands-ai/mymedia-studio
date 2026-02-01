
# ✅ COMPLETED

## Fix: Active Generations Counter Lag and Inversion Issue

### Problem Analysis

Based on the screenshots and code exploration, the active generations counter (`X/3`) is showing stale/inverted data:
- Screenshot 1: **3/3** with warning icon when there are **no active generations** (empty list)
- Screenshot 2: **0/3** when there are **3 processing** generations visible

This is caused by React Query cache staleness combined with unreliable realtime updates on mobile networks.

---

### Root Causes Identified

| Issue | Current Value | Problem |
|-------|---------------|---------|
| `staleTime` | 30 seconds | Data stays cached too long, ignoring DB updates |
| `refetchInterval` | 15 seconds | Too slow for status changes that complete in seconds |
| `refetchOnMount` | Not set (defaults to `true` but affected by staleTime) | Page navigation doesn't refresh if data is "fresh" |
| `refetchOnWindowFocus` | Not set (defaults to `true` but affected by staleTime) | Switching tabs doesn't refresh |
| Realtime subscription | User-scoped filter | May miss updates on flaky mobile connections |

---

### Solution

#### 1. Reduce Cache Staleness in `useActiveGenerations.ts`

**File:** `src/hooks/useActiveGenerations.ts`

**Changes:**
- Reduce `staleTime` from 30s to 5s for more responsive updates
- Reduce `refetchInterval` from 15s to 8s for faster fallback polling
- Add `refetchOnMount: 'always'` to force refresh when component mounts
- Add `refetchOnWindowFocus: 'always'` to refresh on tab switch

```text
Before:
- staleTime: 30000 (30 seconds)
- refetchInterval: 15000 (15 seconds)

After:
- staleTime: 5000 (5 seconds)
- refetchInterval: 8000 (8 seconds)
- refetchOnMount: 'always'
- refetchOnWindowFocus: 'always'
```

#### 2. Force Immediate Refetch on Page Navigation

**File:** `src/pages/dashboard/History.tsx`

**Changes:**
- Add `useActiveGenerations` hook import
- Use `refetch()` from the hook on component mount to ensure fresh data on the My Creations page

#### 3. Add Manual Refresh Trigger to RateLimitDisplay

**File:** `src/components/shared/RateLimitDisplay.tsx`

**Changes:**
- Make the refresh button also invalidate the `active-generations` query
- This provides users a way to manually force-refresh if they notice stale data

---

### Technical Implementation Details

```typescript
// useActiveGenerations.ts - Updated query config
const query = useQuery<ActiveGeneration[]>({
  queryKey: ["active-generations", user?.id],
  queryFn: async () => { /* existing logic */ },
  enabled: !!user?.id,
  // More aggressive cache invalidation for responsive UI
  refetchInterval: 8000,              // 8s fallback (was 15s)
  refetchIntervalInBackground: true,
  staleTime: 5000,                    // 5s stale time (was 30s)
  refetchOnMount: 'always',           // Always refetch on mount
  refetchOnWindowFocus: 'always',     // Always refetch on focus
});
```

---

### Trade-offs

| Aspect | Impact |
|--------|--------|
| Database queries | ~2x more queries (8s vs 15s polling) |
| Battery/bandwidth | Slightly higher on mobile |
| UI responsiveness | Significantly improved - counter updates within 5-8s max |
| User experience | No more stale/inverted counters |

The additional database load is minimal since this query is lightweight and user-scoped with proper indexing.

---

### Files to Modify

| File | Change |
|------|--------|
| `src/hooks/useActiveGenerations.ts` | Reduce staleTime, add refetchOnMount/Focus |
| `src/pages/dashboard/History.tsx` | Force refetch on mount |
| `src/components/shared/RateLimitDisplay.tsx` | Add click-to-refresh on counter |

