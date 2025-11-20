# Provider Logos

This directory contains SVG logos for AI model providers displayed in the UI.

## Required Logo Files

The following SVG files are referenced by model files:

1. **elevenlabs.svg** - ElevenLabs (Audio)
2. **flux.svg** - FLUX models (Image)
3. **google.svg** - Google Imagen, Veo, Nano Banana (Image/Video)
4. **ideogram.svg** - Ideogram (Image)
5. **kling.svg** - Kling (Video)
6. **midjourney.svg** - Midjourney (Image)
7. **openai.svg** - ChatGPT, Sora (Image/Video)
8. **runware.svg** - Runware (Image)
9. **runway.svg** - Runway (Video)
10. **suno.svg** - Suno (Audio)
11. **xai.svg** - Grok (Image/Video)

## File Requirements

- **Format**: SVG
- **Recommended size**: 100x100px or similar square aspect ratio
- **Color**: Should work on both light and dark backgrounds
- **Optimization**: Optimize SVGs before committing

## Where Logos Appear

Logos are displayed in:
- Model selection dropdown (ModelFamilySelector component)
- Model cards in the Custom Creation page
- Mobile model selection dialog

## Adding Logos

1. Obtain official logo SVGs from each provider's brand assets
2. Save with exact filenames listed above
3. Optimize using tools like SVGO
4. Test in both light and dark themes

## Temporary Fallback

If a logo file is missing, the UI will simply not display a logo for that model family. The model will still function normally with just the text name displayed.
