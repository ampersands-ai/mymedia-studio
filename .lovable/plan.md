

## Mobile Alignment Fix for Prompt Input Components

### Problem Identified
On mobile devices, the prompt input header row containing:
- Label ("Prompt")
- Clear button
- Surprise Me button  
- Character count (e.g., "0 / 1200")

...is misaligned because all elements are in a single `flex justify-between` row that doesn't wrap gracefully on narrow screens.

### Components Affected
1. **`src/components/custom-creation/PromptInput.tsx`** - Main creation prompt
2. **`src/components/generation/WorkflowPromptInput.tsx`** - Workflow generation prompt

### Solution

**Restructure the header layout to be mobile-friendly:**

1. **Stack layout on mobile, inline on desktop**
   - Label stays on its own line on mobile
   - Action buttons and character count wrap below the label on small screens
   - Use `flex-wrap` with proper gap spacing

2. **Responsive button sizing**
   - Buttons should shrink appropriately on mobile
   - Character count should not get truncated

---

### Technical Changes

#### 1. PromptInput.tsx (Lines 83-122)

**Current Layout:**
```
[Label] ----------------------- [Clear] [Surprise Me] [0/1200]
```

**New Mobile-Friendly Layout:**
```
[Label]
[Clear] [Surprise Me] [0/1200]    (stacked on mobile)

[Label] ----------- [Clear] [Surprise Me] [0/1200]  (inline on desktop)
```

**Changes:**
- Replace `flex items-center justify-between` with `flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between`
- Wrap action buttons in a container with `flex items-center gap-2 flex-wrap`
- Ensure character count doesn't shrink: add `shrink-0` class

#### 2. WorkflowPromptInput.tsx (Lines 45-73)

Apply the same pattern:
- Stack label above actions on mobile
- Inline layout on larger screens
- Prevent character count truncation

---

### Summary

| File | Change |
|------|--------|
| `PromptInput.tsx` | Responsive header layout with stacked mobile view |
| `WorkflowPromptInput.tsx` | Same responsive pattern applied |

Both fixes use standard Tailwind responsive utilities (`sm:` prefix) to maintain the current desktop appearance while fixing mobile alignment.

