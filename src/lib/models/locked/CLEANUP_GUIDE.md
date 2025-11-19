# Model Files Cleanup Guide

## Status: Partial Cleanup Complete ✅

### ✅ Completed:
1. Fixed edge function import path (CRITICAL - deployment blocker)
2. Added comprehensive error handling to execute-custom-model edge function
3. Updated client error handling in useCustomGeneration.ts
4. Made `execute()` optional in ModelModule interface
5. Deleted obsolete API key utility files:
   - `getRunwareApiKey.ts`
   - `getKieApiKey.ts`
   - `bulk-update-record-ids.ts`
6. Cleaned up these model files:
   - Remove_Background_runware.ts
   - ChatGPT_4o_Image.ts (image_editing)
   - FLUX_1_Kontext_Max.ts
   - FLUX_1_Kontext_Pro.ts
   - Google_Image_Upscale.ts

### ⏳ Remaining: 59 model files need cleanup

Each file needs the following lines removed:
1. Import statement: `import { getKieApiKey/getRunwareApiKey as getCentral... } from "../get...ApiKey";`
2. The entire `execute()` function
3. Local API key getter functions like `async function getKieApiKey() { ... }`

### Files that need cleanup:

**Image Editing (8):**
- Ideogram_Image_Remix.ts
- Ideogram_V3_Reframe.ts
- Nano_Banana_by_Google_edit.ts
- Qwen_Image_Editor.ts
- Qwen_Image_to_Image.ts
- Remove_Background_kie_ai.ts
- Seedream_V4.ts
- runware_upscale.ts

**Image to Video (13):**
- Google_Veo_3_1_Fast.ts, Google_Veo_3_1_HQ.ts, Google_Veo_3_1_Reference.ts
- Grok_Imagine.ts
- Kling_V2_Master.ts, Kling_V2_Pro.ts, Kling_V2_Standard.ts
- Runway.ts
- Seedance_V1_0_Pro_Fast_runware.ts
- Seedance_V1_Lite.ts
- Seedream_V1_Pro.ts
- Sora_2_by_OpenAI_Watermarked.ts
- WAN_2_2_Turbo.ts

**Prompt to Audio (2):**
- ElevenLabs_TTS.ts
- Suno.ts

**Prompt to Image (23):**
- FLUX_1_Kontext_Max_prompt.ts, FLUX_1_Kontext_Pro_prompt.ts
- FLUX_1_Pro.ts, FLUX_1_Schnell.ts
- Google_Imagen_4.ts, Google_Imagen_4_Fast.ts, Google_Imagen_4_Ultra.ts
- Grok_Imagine.ts
- HiDream_Dev.ts, HiDream_Fast.ts
- Ideogram_Character.ts, Ideogram_V2_Plus.ts, Ideogram_V3.ts
- Jasper_Text_to_Image.ts
- Midjourney.ts
- Nano_Banana_by_Google.ts
- Qwen_QwenVL.ts
- Seedream_V3.ts, Seedream_V4.ts
- Ultra_Detail_V0.ts
- runware_flux_1_1_pro.ts, runware_flux_1_schnell.ts
- runware_stable_diffusion_v3.ts, runware_stable_diffusion_xl.ts

**Prompt to Video (13):**
- Google_Veo_3_1_Fast.ts, Google_Veo_3_1_HQ.ts
- Grok_Imagine.ts
- Kling_V2_Master.ts, Kling_V2_Pro.ts, Kling_V2_Standard.ts
- Runway.ts
- Seedance_V1_0_Pro_Fast_runware.ts
- Seedance_V1_Lite.ts
- Seedream_V1_Pro.ts
- Sora_2_by_OpenAI_Watermarked.ts
- WAN_2_2_Turbo.ts

## What to keep in each file:
✅ MODEL_CONFIG
✅ SCHEMA
✅ validate()
✅ preparePayload()
✅ calculateCost()

## Why this works NOW:
- The `execute-custom-model` edge function handles all execution server-side
- The ModelModule interface no longer requires execute() (made optional)
- All API calls go through the secure edge function
- No API keys are exposed to the client

## Testing:
Once cleanup is complete, test with:
1. Remove Background model (Runware)
2. Any KIE AI model
3. Verify no CORS errors
4. Verify edge function logs show successful execution
