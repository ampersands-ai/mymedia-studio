
# Fix: Mobile Width Inconsistency Across Creation Groups

## Problem Identified

The Input panel card displays at different widths depending on which creation group is selected on mobile. This is visible when comparing:
- Image to Image / Text to Image / Image to Video (full width)
- Audio Studio / Custom Avatar (narrower with visible side margins)

## Root Cause

The `CreationGroupSelector` component uses a negative margin pattern (`-mx-4 px-4`) to create edge-to-edge horizontal scrolling for the group buttons on mobile. This pattern can cause unpredictable layout behavior where:

1. The horizontal scroll position affects container width calculations
2. The `overflow-x-auto` on the scroll area interacts with `overflow-x-hidden` on the page wrapper
3. Different scroll positions (based on selected group) cause different overflow states

**Location:** `src/components/custom-creation/CreationGroupSelector.tsx` (lines 121-132)

## Solution

Wrap the negative-margin scroll container in an `overflow-hidden` parent to isolate the layout effect and prevent it from affecting the width of subsequent elements (InputPanel and OutputPanel).

## Technical Changes

### File: `src/components/custom-creation/CreationGroupSelector.tsx`

**Current Code (lines 121-133):**
```tsx
return (
  <div className="mb-4 md:mb-6">
    <div 
      className={cn(
        isMobile 
          ? "flex gap-2 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide -mx-4 px-4"
          : "flex flex-wrap gap-2 justify-center"
      )}
    >
      {visibleGroups.map(renderGroupButton)}
    </div>
  </div>
);
```

**Updated Code:**
```tsx
return (
  <div className="mb-4 md:mb-6">
    {/* Overflow-hidden wrapper isolates negative margin from affecting grid layout */}
    <div className={cn(isMobile && "overflow-hidden")}>
      <div 
        className={cn(
          isMobile 
            ? "flex gap-2 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide -mx-4 px-4"
            : "flex flex-wrap gap-2 justify-center"
        )}
      >
        {visibleGroups.map(renderGroupButton)}
      </div>
    </div>
  </div>
);
```

## Why This Works

The `overflow-hidden` wrapper creates a new block formatting context that:
1. Contains the negative margin effects within itself
2. Prevents the horizontal overflow from affecting the parent container's width calculation
3. Ensures consistent width for subsequent grid elements (InputPanel)

This is a standard CSS pattern for isolating negative margin effects while preserving the visual edge-to-edge scrolling experience.

## Testing Checklist

After implementation, verify on mobile:
- [ ] Image to Image group shows full-width Input card
- [ ] Text to Image group shows full-width Input card
- [ ] Image to Video group shows full-width Input card
- [ ] Video to Video group shows full-width Input card
- [ ] Custom Avatar group shows full-width Input card
- [ ] Audio Studio group shows full-width Input card
- [ ] Group selector still scrolls edge-to-edge
- [ ] Switching between groups maintains consistent card width
