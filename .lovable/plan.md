
## Fix: Audio Studio Navigation Not Working

### Problem
When you're on the Custom Creation page (e.g., "Text to Image" group) and click on "Audio Studio" from a navigation menu, the page stays on the current group instead of switching.

### Root Cause
The Custom Creation page reads the `group` URL parameter only **on initial mount**. When navigating between groups using links (same page, different query param), React Router doesn't remount the component, so the URL change is never picked up.

**Current code (line 546-557 in `CustomCreation.tsx`):**
```typescript
useEffect(() => {
  const urlGroup = searchParams.get('group');
  if (urlGroup) {
    // ... validate and set group
  }
  // Only run on mount - intentionally exclude state.selectedGroup to prevent loops
}, []); // <-- Empty dependency = mount only
```

### Solution
Make the effect reactive to `searchParams` changes. Use a ref to track if the change originated from user clicking group buttons (internal) vs. URL navigation (external), preventing infinite update loops.

| Change | Purpose |
|--------|---------|
| Add `searchParams` to effect dependencies | React to URL changes from navigation |
| Track internal updates with ref | Prevent loops from bidirectional sync |
| Clear ref after state update | Allow next URL navigation to work |

### File Changes

**File: `src/pages/CustomCreation.tsx`**

**Change 1: Add a ref to track internal group changes (after line 45)**
```typescript
const outputSectionRef = useRef<HTMLDivElement>(null);
const isInternalGroupChange = useRef(false); // NEW: Track internal vs URL changes
```

**Change 2: Update URL → State sync effect (lines 545-557)**

Replace:
```typescript
// Sync URL group param to state on mount only
useEffect(() => {
  const urlGroup = searchParams.get('group');
  if (urlGroup) {
    const validGroups = ['image_editing', 'prompt_to_image', 'prompt_to_video', 
                         'image_to_video', 'video_to_video', 'lip_sync', 'prompt_to_audio'];
    if (validGroups.includes(urlGroup)) {
      setStateSelectedGroup(urlGroup as CreationGroup);
    }
  }
  // Only run on mount - intentionally exclude state.selectedGroup to prevent loops
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);
```

With:
```typescript
// Sync URL group param to state (reactive to URL changes from navigation)
useEffect(() => {
  // Skip if this change came from user clicking group buttons
  if (isInternalGroupChange.current) {
    isInternalGroupChange.current = false;
    return;
  }
  
  const urlGroup = searchParams.get('group');
  if (urlGroup && urlGroup !== state.selectedGroup) {
    const validGroups = ['image_editing', 'prompt_to_image', 'prompt_to_video', 
                         'image_to_video', 'video_to_video', 'lip_sync', 'prompt_to_audio'];
    if (validGroups.includes(urlGroup)) {
      setStateSelectedGroup(urlGroup as CreationGroup);
    }
  }
}, [searchParams, state.selectedGroup, setStateSelectedGroup]);
```

**Change 3: Update State → URL sync effect (lines 610-616)**

Replace:
```typescript
// Sync state changes back to URL (when user clicks group buttons)
useEffect(() => {
  const currentUrlGroup = searchParams.get('group');
  if (state.selectedGroup !== currentUrlGroup) {
    setSearchParams({ group: state.selectedGroup }, { replace: true });
  }
}, [state.selectedGroup, searchParams, setSearchParams]);
```

With:
```typescript
// Sync state changes back to URL (when user clicks group buttons)
useEffect(() => {
  const currentUrlGroup = searchParams.get('group');
  if (state.selectedGroup !== currentUrlGroup) {
    isInternalGroupChange.current = true; // Mark as internal change
    setSearchParams({ group: state.selectedGroup }, { replace: true });
  }
}, [state.selectedGroup, searchParams, setSearchParams]);
```

### How This Fixes It

```text
┌─────────────────────────────────────────────────────────────┐
│                 BEFORE (Broken)                              │
├─────────────────────────────────────────────────────────────┤
│  Click "Audio Studio" link                                   │
│          ↓                                                   │
│  URL changes to ?group=prompt_to_audio                       │
│          ↓                                                   │
│  useEffect with [] deps does NOT run                         │
│          ↓                                                   │
│  State stays on prompt_to_image ❌                           │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                 AFTER (Fixed)                                │
├─────────────────────────────────────────────────────────────┤
│  Click "Audio Studio" link                                   │
│          ↓                                                   │
│  URL changes to ?group=prompt_to_audio                       │
│          ↓                                                   │
│  useEffect with [searchParams] deps RUNS                     │
│          ↓                                                   │
│  isInternalGroupChange.current is false (external nav)       │
│          ↓                                                   │
│  setStateSelectedGroup('prompt_to_audio') called ✓           │
│          ↓                                                   │
│  UI switches to Audio Studio ✓                               │
└─────────────────────────────────────────────────────────────┘
```

### Why This Won't Cause Infinite Loops

1. **User clicks group button** → State changes → URL sync effect sets `isInternalGroupChange = true` → URL updates → URL sync effect runs but skips (sees the flag)
2. **User navigates via link** → URL changes → `isInternalGroupChange` is false → State updates → URL is already correct so URL sync effect is a no-op
