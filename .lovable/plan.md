
# Shotstack Test Page - Full Workflow Implementation

## Overview

Transform the current Shotstack test page from a basic video URL input form into a complete faceless video-style workflow that:
1. Takes a **topic** from the user
2. AI generates a **story/script** with multiple scenes
3. AI generates **image prompts** for each scene
4. Sends images + text overlays to **Shotstack.io** for video rendering

---

## Current State Analysis

The existing Shotstack test page (`/shotstack-test`) currently:
- Accepts a direct video URL
- Adds optional text overlay
- Configures duration, aspect ratio, background color
- Submits to Shotstack API for rendering

This is fundamentally different from the faceless video workflow which:
- Generates a full script with multiple scenes from a topic
- Creates image prompts that produce AI-generated images
- Assembles everything into a video

---

## Implementation Plan

### Step 1: Create Topic Input Component
**File**: `src/components/shotstack-test/steps/ShotstackTopicStep.tsx`

- Topic input textarea with "Surprise Me" AI generation button
- Duration selector (15-120 seconds)
- Style selector (hyper-realistic, cinematic, animated, etc.)
- Aspect ratio selector
- "Generate Storyboard" button

### Step 2: Create New Edge Function for Shotstack Storyboard Generation
**File**: `supabase/functions/generate-shotstack-storyboard/index.ts`

- Accept: topic, duration, style, aspect_ratio
- Use Lovable AI (gemini-2.5-flash) to generate:
  - Intro voiceover + image prompt
  - Scene voiceovers + image prompts (1 scene per 5 seconds)
- Return: Array of scenes with `{ voiceoverText, imagePrompt }` for each

### Step 3: Create Scene Preview Step Component
**File**: `src/components/shotstack-test/steps/ShotstackScenesStep.tsx`

- Display generated scenes in card format
- For each scene:
  - Show voiceover text (editable)
  - Show image prompt (editable)
  - "Generate Image" button using existing image generation models
  - Image preview area
- "Generate All Images" bulk action button
- "Continue to Render" button (enabled when all images are generated)

### Step 4: Create Shotstack Render Edge Function
**File**: `supabase/functions/shotstack-render-video/index.ts`

Build Shotstack timeline payload with:
- Multiple tracks:
  - **Image track**: Each scene's AI-generated image with duration timing
  - **Text track**: Scene voiceover text as title overlay
  - **Audio track** (optional): If we add TTS support later
- Proper transitions between scenes
- Correct aspect ratio and resolution

Example Shotstack payload structure:
```json
{
  "timeline": {
    "background": "#000000",
    "tracks": [
      {
        "clips": [
          {
            "asset": { "type": "title", "text": "Scene 1 text...", "style": "subtitle" },
            "start": 0, "length": 5
          },
          {
            "asset": { "type": "title", "text": "Scene 2 text..." },
            "start": 5, "length": 5
          }
        ]
      },
      {
        "clips": [
          {
            "asset": { "type": "image", "src": "https://..." },
            "start": 0, "length": 5, "effect": "zoomIn"
          },
          {
            "asset": { "type": "image", "src": "https://..." },
            "start": 5, "length": 5, "effect": "zoomIn"
          }
        ]
      }
    ]
  },
  "output": { "format": "mp4", "resolution": "hd" }
}
```

### Step 5: Update ShotstackCreator Component
**File**: `src/components/shotstack-test/ShotstackCreator.tsx`

Refactor to use a 4-step wizard:
1. **Topic & Settings**: Enter topic, choose duration/style/aspect ratio
2. **Review Script**: View/edit AI-generated scenes and image prompts
3. **Generate Images**: AI generates images for each scene
4. **Render**: Sends to Shotstack, polls for completion, shows final video

### Step 6: State Management
Update `ShotstackState` interface:
```typescript
interface ShotstackScene {
  id: string;
  voiceoverText: string;
  imagePrompt: string;
  imageUrl: string | null;
  isGenerating: boolean;
}

interface ShotstackState {
  step: 'topic' | 'scenes' | 'images' | 'rendering' | 'complete';
  topic: string;
  duration: number;
  style: string;
  aspectRatio: '16:9' | '9:16' | '4:5' | '1:1';
  scenes: ShotstackScene[];
  renderId: string | null;
  outputUrl: string;
  renderProgress: number;
}
```

---

## Technical Details

### Image Generation
- Reuse existing image generation infrastructure (e.g., `generate-content` edge function)
- Each scene's `imagePrompt` will be sent to an image model (Runware, Flux, etc.)
- Generated images are uploaded to Supabase storage
- Public URLs are passed to Shotstack

### Shotstack Timeline Construction
- Each scene = 5 seconds (matching faceless video logic)
- Images use `effect: "zoomIn"` or `"zoomOut"` for Ken Burns effect
- Text overlays positioned at bottom with subtitle styling
- Smooth transitions between scenes using `transition: { in: "fade", out: "fade" }`

### Cost Estimation
- No credits charged for storyboard generation (AI call)
- Image generation costs based on selected model
- No additional render cost (Shotstack uses API credits, not user credits)

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/components/shotstack-test/steps/ShotstackTopicStep.tsx` | Create |
| `src/components/shotstack-test/steps/ShotstackScenesStep.tsx` | Create |
| `src/components/shotstack-test/steps/ShotstackImagesStep.tsx` | Create |
| `src/components/shotstack-test/ShotstackCreator.tsx` | Major Refactor |
| `supabase/functions/generate-shotstack-storyboard/index.ts` | Create |
| `supabase/functions/shotstack-render-video/index.ts` | Create |
| `src/pages/ShotstackTest.tsx` | Minor Update |
| `supabase/config.toml` | Add new function entries |
| `src/components/shotstack-test/steps/ShotstackConfigStep.tsx` | Delete (replaced by new steps) |

---

## Workflow Diagram

```text
┌─────────────────────────────────────────────────────────────────┐
│                     SHOTSTACK TEST WORKFLOW                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  STEP 1: TOPIC INPUT                                            │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Topic: [____________________________] [Surprise Me]    │    │
│  │  Duration: [30s] [45s] [60s] [90s]                      │    │
│  │  Style: [Cinematic ▼]                                   │    │
│  │  Aspect: [16:9 ▼]                                       │    │
│  │                                                         │    │
│  │              [Generate Storyboard]                      │    │
│  └─────────────────────────────────────────────────────────┘    │
│                           ↓                                     │
│  STEP 2: REVIEW SCENES                                          │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Scene 1: "Did you know that..."                        │    │
│  │  Prompt: "Cinematic shot of ancient temple..."          │    │
│  │  ──────────────────────────────────────────             │    │
│  │  Scene 2: "Scientists discovered..."                    │    │
│  │  Prompt: "Laboratory with microscope..."                │    │
│  │                                                         │    │
│  │              [Generate All Images]                      │    │
│  └─────────────────────────────────────────────────────────┘    │
│                           ↓                                     │
│  STEP 3: IMAGE GENERATION                                       │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Scene 1: [✓ Generated] [Image Preview]                 │    │
│  │  Scene 2: [⏳ Generating...] [Loading...]               │    │
│  │  Scene 3: [○ Pending]                                   │    │
│  │                                                         │    │
│  │              [Render Video]                             │    │
│  └─────────────────────────────────────────────────────────┘    │
│                           ↓                                     │
│  STEP 4: RENDERING                                              │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Progress: [████████░░░░░░░░] 45%                       │    │
│  │  Elapsed: 0:23                                          │    │
│  └─────────────────────────────────────────────────────────┘    │
│                           ↓                                     │
│  STEP 5: COMPLETE                                               │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  [Video Player with final rendered video]               │    │
│  │                                                         │    │
│  │  [Copy URL] [Download] [Open in New Tab]                │    │
│  │                                                         │    │
│  │              [Create Another Video]                     │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Summary

This implementation transforms the Shotstack test page into a full faceless video creation workflow:

1. **User enters topic** → AI generates script with scenes
2. **User reviews/edits scenes** → AI generates images for each
3. **User triggers render** → Shotstack assembles video from images + text
4. **User downloads video** → Complete workflow

The key difference from JSON2Video faceless flow is that Shotstack will handle the video assembly directly from images and text overlays, without requiring TTS audio (though that can be added later).
