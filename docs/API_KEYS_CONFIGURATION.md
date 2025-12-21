# API Keys Configuration Reference

This document lists all API keys used by the platform, organized by provider and model type.

## How It Works

The `get-api-key` Edge Function automatically routes to the correct API key based on:
1. **Provider** (runware or kie_ai)
2. **Model type** or **Specific model ID**

## Provider Parameter (Required)

The `provider` parameter is **required** and must be explicitly passed by all models:
- Provider models: `provider: "kie_ai"`
- Runware models: `provider: "runware"`

**Why explicit provider (industry standard):**
- ✅ **Explicit over implicit** - No magic inference logic
- ✅ **Self-documenting code** - Clear which provider each model uses
- ✅ **Type safety** - Required parameters catch errors at compile time
- ✅ **Easier debugging** - No guessing what was inferred
- ✅ **Maintainability** - Future developers understand immediately

All 28 model files now explicitly pass `provider: MODEL_CONFIG.provider` to the `get-api-key` Edge Function.

---

## Provider API Keys (provider = "kie_ai")

### Specific Model Keys (Priority)

These are checked first by model record ID:

| Environment Variable | Used For | Record IDs |
|---------------------|----------|------------|
| `KIE_AI_API_KEY_VEO3` | Google Veo 3.1 models | `8aac94cb-5625-47f4-880c-4f0fd8bd83a1`<br>`a5c2ec16-6294-4588-86b6-7b4182601cda`<br>`6e8a863e-8630-4eef-bdbb-5b41f4c883f9`<br>`f8e9c7a5-9d4b-6f2c-8a1e-5d7b3c9f4a6e`<br>`e9c8b7a6-8d5c-4f3e-9a2f-6d8b5c9e4a7f` |
| `KIE_AI_API_KEY_SORA2` | OpenAI Sora 2 models | `d7f8c5a3-9b2e-6f4d-8c9a-5e7b3a6d4f8c`<br>`c6e5b4a3-5d2f-1c0e-6a9f-3d5b6c7e4a8f` |
| `KIE_AI_API_KEY_NANO_BANANA` | Nano Banana models | `c7e9a5f3-8d4b-6f2c-9a1e-5d8b3c7f4a6e` |
| `KIE_AI_API_KEY_SEEDREAM_V4` | Seedream V4 models | `d2ffb834-fc59-4c80-bf48-c2cc25281fdd`<br>`a6c8e4f7-9d2b-5f3c-8a6e-7d4b9c5f3a8e` |

### Content Type Keys (Fallback)

If no specific model key matches, it checks by content type:

| Environment Variable | Used For | Model IDs Containing |
|---------------------|----------|---------------------|
| `KIE_AI_API_KEY_IMAGE_EDITING` | Image editing models | `image_editing` |
| `KIE_AI_API_KEY_IMAGE_TO_VIDEO` | Image to video models | `image_to_video` |
| `KIE_AI_API_KEY_PROMPT_TO_IMAGE` | Text to image models | `prompt_to_image` |
| `KIE_AI_API_KEY_PROMPT_TO_VIDEO` | Text to video models | `prompt_to_video` |
| `KIE_AI_API_KEY_PROMPT_TO_AUDIO` | Text to audio models | `prompt_to_audio` |

### Global Fallback

| Environment Variable | Used For |
|---------------------|----------|
| `KIE_AI_API_KEY` | Fallback for any provider model if no specific key is found |

---

## Runware API Keys (provider = "runware")

| Environment Variable | Used For | Model ID Patterns |
|---------------------|----------|-------------------|
| `RUNWARE_API_KEY_PROMPT_TO_IMAGE` | Text to image models | `runware:100@1`<br>`runware:flux*`<br>`runware:stable-diffusion*` |
| `RUNWARE_API_KEY_IMAGE_EDITING` | Image editing models | `runware:102@1`<br>`runware:103@1` |
| `RUNWARE_API_KEY_IMAGE_TO_VIDEO` | Image to video models | `bytedance:*` |

### Global Fallback

| Environment Variable | Used For |
|---------------------|----------|
| `RUNWARE_API_KEY` | Fallback for any Runware model if no specific key is found |

---

## Other Providers

| Environment Variable | Provider | Used For |
|---------------------|----------|----------|
| `ELEVENLABS_API_KEY` | elevenlabs | Text-to-speech models |
| `JSON2VIDEO_API_KEY` | json2video | Video generation |
| `SHOTSTACK_API_KEY` | shotstack | Video editing |

---

## API Key Lookup Logic

### For Provider Models

```
1. Check specific model keys by recordId (VEO3, SORA2, Nano Banana, Seedream V4)
2. If no match, check content type keys (image_editing, image_to_video, etc.)
3. If no match, use KIE_AI_API_KEY (global fallback)
```

### For Runware Models

```
1. Check model ID pattern (flux, stable-diffusion, bytedance, etc.)
2. If no match, use RUNWARE_API_KEY (global fallback)
```

---

## Where to Configure API Keys

**Supabase Dashboard:**
1. Go to your Supabase project
2. Navigate to **Project Settings** → **Edge Functions** → **Secrets**
3. Add each API key as an environment variable

**Example:**
```
KIE_AI_API_KEY_VEO3 = your-veo3-api-key-here
KIE_AI_API_KEY_PROMPT_TO_IMAGE = your-prompt-to-image-key-here
RUNWARE_API_KEY = your-runware-api-key-here
```

---

## Debugging

If you see "Failed to retrieve API key" error:

1. **Check the logs** in Supabase Edge Functions dashboard
2. **Look for console logs** showing which API key is being requested
3. **Verify the API key is set** in Supabase Edge Function secrets
4. **Check the exact name** matches the table above (case-sensitive)

**Common Issues:**
- ❌ API key not set in Supabase secrets
- ❌ Typo in environment variable name
- ❌ Using wrong provider name (must be exactly "kie_ai" or "runware")

---

## Testing API Keys

To test if an API key is configured correctly:

1. Go to **Supabase Dashboard** → **Edge Functions** → **Logs**
2. Use an AI model that should use that key
3. Check logs for:
   - `Inferred provider 'kie_ai' from presence of recordId: xxx` (shows provider detection)
   - Error messages showing which secret name it's looking for
   - Success/failure responses

---

## Summary

**You need to configure:**

### Minimum Setup (Fallback Keys Only)
- `KIE_AI_API_KEY` - for all provider models
- `RUNWARE_API_KEY` - for all Runware models

### Recommended Setup (Organized by Model Type)
- All specific model keys listed above
- Fallback keys as backup

**Your current setup:** API keys organized by provider and model groups ✅

This matches the system's expectations perfectly!
