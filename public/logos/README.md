# Provider Logos

This directory contains SVG logos for AI model providers displayed in the UI.

## Current Status

All 70 models now have logo placeholders. Currently showing **simple placeholder SVGs** - replace with official branded logos for production.

## Logo Files

### Core Providers (Original)
1. **elevenlabs.svg** - ElevenLabs (Audio models)
2. **flux.svg** - FLUX models (Image generation)
3. **google.svg** - Google Imagen, Veo, Nano Banana (Image/Video)
4. **ideogram.svg** - Ideogram (Image generation)
5. **kling.svg** - Kling (Video generation)
6. **midjourney.svg** - Midjourney (Image generation)
7. **openai.svg** - ChatGPT, Sora (Image/Video)
8. **runware.svg** - Runware (Multiple models)
9. **runway.svg** - Runway (Video generation)
10. **suno.svg** - Suno (Audio/Music)
11. **xai.svg** - Grok/X.AI (Image/Video)

### Additional Providers
12. **seedream.svg** - Seedream (Image/Video)
13. **seedance.svg** - Seedance (Video)
14. **wan.svg** - WAN (Video)
15. **removebg.svg** - Background Removal
16. **recraft.svg** - Recraft (Image editing)
17. **qwen.svg** - Qwen (Image/Text)
18. **jasper.svg** - Jasper (Image)
19. **hidream.svg** - HiDream (Image)
20. **ultradetail.svg** - Ultra Detail (Image)
21. **kie.svg** - Kie.ai (Multiple models)

## How to Upload Real Logos

### Option 1: Direct File Replacement (Simplest)
1. Download official SVG logos from provider websites/brand kits
2. Replace files in `public/logos/` with same filenames
3. Commit changes to git: `git add public/logos/ && git commit -m "Update provider logos"`
4. Deploy - logos update automatically

### Option 2: Using an Admin Interface (Recommended)
If you want a user-friendly way to upload logos without touching code:

**Create an Admin Logo Manager**:
- Add a "Logo Manager" section to Admin Dashboard
- Upload SVG files directly through UI
- Stores in Supabase Storage or public/logos
- Updates automatically

Would you like me to create this admin interface for you?

### Option 3: Model File Editing (Per-Model Custom Logos)
You can manually change logoUrl in any model file:

```typescript
// In src/lib/models/locked/prompt_to_image/FLUX_1_Pro.ts
export const MODEL_CONFIG = {
  // ... other fields
  logoUrl: "/logos/flux.svg", // ← Change this path
  // or use external URL:
  logoUrl: "https://your-cdn.com/logos/flux-official.svg",
}
```

## Logo Requirements

### Format
- **Required**: SVG format
- **Size**: 100x100px recommended (square aspect ratio)
- **File size**: < 50KB (optimize with SVGO)

### Design Guidelines
- Works on light AND dark backgrounds
- Monochrome or minimal colors preferred
- Clear at small sizes (32x32px minimum)
- Transparent background recommended

### Where Logos Appear
- Model selection cards (80x80px)
- Dropdown menus (32x32px)
- Mobile dialogs (48x48px)
- Model details pages (120x120px)

## Logo Optimization

Before uploading, optimize SVGs:

```bash
# Using SVGO
npx svgo input.svg -o output.svg

# Or use online tool
https://jakearchibald.github.io/svgomg/
```

## Provider Brand Resources

Where to find official logos:
- **FLUX**: https://blackforestlabs.ai/press
- **OpenAI**: https://openai.com/brand
- **Google**: https://about.google/brand-resources/
- **Runway**: https://runwayml.com/press
- **Midjourney**: https://www.midjourney.com/brand
- **ElevenLabs**: https://elevenlabs.io/brand
- **Ideogram**: Contact for brand assets
- **X.AI/Grok**: https://x.ai/brand

## Technical Notes

- Logos loaded from `/public/logos/` directory
- Path resolves to `/logos/*.svg` in production
- logoUrl field in MODEL_CONFIG (src/lib/models/locked)
- Falls back gracefully if logo missing (shows text only)

## Current Placeholders

The current placeholders are simple colored squares with initials. They:
- ✅ Work functionally
- ✅ Display correctly in UI
- ❌ Are NOT official branding
- ❌ Should be replaced before production launch

**Priority**: Replace before public launch to maintain professional appearance and respect brand guidelines.
