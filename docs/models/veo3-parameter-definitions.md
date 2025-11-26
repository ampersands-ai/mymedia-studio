# Veo 3.1 Model Parameter Definitions

This document captures the exact UI/input schema and payload expectations for every Veo 3.1 model we support. It is derived from the official Kie.ai documentation for the `/api/v1/veo/generate` endpoint.  
Reference: [Kie.ai Veo 3.1 API](https://docs.kie.ai/veo3-api/generate-veo-3-video)

The intent is to keep one canonical definition per model that we can feed directly into the code generator that produces the isolated `.ts` files (one file per model, no shared dependencies). Whenever a parameter changes, update it here first, then regenerate the model file.

---

## 1. Shared Field Reference (from Kie.ai spec)

| Field | Type | Required | Allowed Values / Constraints | Notes |
| --- | --- | --- | --- | --- |
| `prompt` | `string` | ✅ | Free-form text | Detailed description of desired video |
| `imageUrls` | `string[]` | ⭕ | 0–3 items (URLs) | Used for image-to-video / reference modes |
| `model` | `string` | ✅ | `veo3`, `veo3_fast` (plus internal variants) | Selects Veo variant |
| `generationType` | `string` | ⭕ | `TEXT_2_VIDEO`, `FIRST_AND_LAST_FRAMES_2_VIDEO`, `REFERENCE_2_VIDEO` | Mode-specific requirements noted below |
| `aspectRatio` | `string` | ⭕ | `16:9`, `9:16`, `Auto` | 16:9 required for 1080p and fallback |
| `seeds` | `integer` | ⭕ | 10,000 – 99,999 | Controls determinism |
| `callBackUrl` | `string` | ⭕ | Valid URL | Optional webhook |
| `enableFallback` | `boolean` | ⭕ | Default `false` (deprecated) | Leave out unless we must support legacy flow |
| `enableTranslation` | `boolean` | ⭕ | Default `true` | Translate prompt to English |
| `watermark` | `string` | ⭕ | Text | Applies watermark |

> ✅ = Required by API; ⭕ = Optional (may become required per model/mode)

---

## 2. Model Definition Template

For each model below, fill in the following items:

1. **Identifier** — exact `model` value passed to the API (e.g., `veo3_fast`)
2. **Display Name** — text shown to users in UI (e.g., “Veo 3.1 Fast”)
3. **Default Generation Type** — which `generationType` the script enforces by default
4. **Supported Modes** — subset of the allowed `generationType` options
5. **UI Parameter Matrix** — table detailing how each UI control maps to payload fields, including renderers, validation, defaults, and whether the field is hidden
6. **Provider Payload Notes** — any transformations (e.g., merging `startFrame`/`endFrame` into `imageUrls`) or constants that must always ship with the request

Once a section is complete, the generator can read from it to produce the locked `.ts` file.

---

## 3. Veo 3.1 Model Slots

Fill out each slot with the specifics for the five Veo 3.1 variants in the Image-to-Video group.

### 3.1 Veo 3.1 HQ — Text to Video
- **Identifier:** `veo3`
- **Display Name:** `Google Veo 3.1 HQ`
- **Group:** `prompt_to_video`
- **Default Generation Type:** `TEXT_2_VIDEO`
- **Supported Modes:** `TEXT_2_VIDEO`
- **UI Parameter Matrix:**

| UI Field | Payload Field | Type / Renderer | Required | Default | Notes |
| --- | --- | --- | --- | --- | --- |
| Prompt | `prompt` | `string` / prompt renderer | ✅ | — | Detailed text description |
| Aspect Ratio | `aspectRatio` | select (`16:9`,`9:16`,`Auto`) | ⭕ | `16:9` | 16:9 required for 1080p |
| Seeds | `seeds` | number | ⭕ | — | 10,000–99,999 |
| Callback URL | `callBackUrl` | url | ⭕ | — | Optional webhook |
| Watermark | `watermark` | text | ⭕ | `""` | Keep empty by default |
| Enable Translation (hidden) | `enableTranslation` | boolean | ✅ | `true` | Always send `true` |
| Enable Fallback (hidden) | `enableFallback` | boolean | ✅ | `false` | Deprecated – keep false |
| Model (hidden) | `model` | text | ✅ | `veo3` | Do not expose |
| Generation Type (hidden) | `generationType` | text | ✅ | `TEXT_2_VIDEO` | Fixed |

- **Provider Payload Notes:**  
  - Always send `watermark: ""`, `enableFallback: false`, `enableTranslation: true`.  
  - No `imageUrls` for text-to-video flow.

---

### 3.2 Veo 3.1 Fast — Text to Video
- **Identifier:** `veo3_fast`
- **Display Name:** `Google Veo 3.1 Fast`
- **Group:** `prompt_to_video`
- **Default Generation Type:** `TEXT_2_VIDEO`
- **Supported Modes:** `TEXT_2_VIDEO`
- **UI Parameter Matrix:**

| UI Field | Payload Field | Type / Renderer | Required | Default | Notes |
| --- | --- | --- | --- | --- | --- |
| Prompt | `prompt` | `string` / prompt renderer | ✅ | — | Same rules as HQ |
| Aspect Ratio | `aspectRatio` | select (`16:9`,`9:16`,`Auto`) | ⭕ | `16:9` | 16:9 for HD |
| Seeds | `seeds` | number | ⭕ | — | 10,000–99,999 |
| Callback URL | `callBackUrl` | url | ⭕ | — | Optional |
| Watermark | `watermark` | text | ⭕ | `""` | Optional |
| Enable Translation (hidden) | `enableTranslation` | boolean | ✅ | `true` | Always true |
| Enable Fallback (hidden) | `enableFallback` | boolean | ✅ | `false` | Always false |
| Model (hidden) | `model` | text | ✅ | `veo3_fast` | Fixed |
| Generation Type (hidden) | `generationType` | text | ✅ | `TEXT_2_VIDEO` | Fixed |

- **Provider Payload Notes:**  
  - Mirror HQ text-to-video payload with `model: veo3_fast`.

---

### 3.3 Veo 3.1 HQ — Image to Video
- **Identifier:** `veo3`
- **Display Name:** `Google Veo 3.1 HQ`
- **Group:** `image_to_video`
- **Default Generation Type:** `FIRST_AND_LAST_FRAMES_2_VIDEO`
- **Supported Modes:** `FIRST_AND_LAST_FRAMES_2_VIDEO`
- **UI Parameter Matrix:**

| UI Field | Payload Field | Type / Renderer | Required | Default | Notes |
| --- | --- | --- | --- | --- | --- |
| Prompt | `prompt` | string / prompt renderer | ✅ | — | Describe motion/style |
| Start Frame | `startFrame` → `imageUrls[0]` | image upload | ✅ | — | Required first frame |
| End Frame | `endFrame` → `imageUrls[1]` | image upload | ⭕ | — | Optional last frame |
| Aspect Ratio | `aspectRatio` | select (`16:9`,`9:16`,`Auto`) | ⭕ | `16:9` | 16:9 recommended |
| Seeds | `seeds` | number | ⭕ | — | 10,000–99,999 |
| Callback URL | `callBackUrl` | url | ⭕ | — | Optional |
| Watermark | `watermark` | text | ⭕ | `""` | Optional |
| Enable Translation (hidden) | `enableTranslation` | boolean | ✅ | `true` | Fixed |
| Enable Fallback (hidden) | `enableFallback` | boolean | ✅ | `false` | Fixed |
| Model (hidden) | `model` | text | ✅ | `veo3` | Fixed |
| Generation Type (hidden) | `generationType` | text | ✅ | `FIRST_AND_LAST_FRAMES_2_VIDEO` | Fixed |

- **Provider Payload Notes:**  
  - Before calling API, merge `startFrame`/`endFrame` into `imageUrls` array.  
  - Always include constant flags (`watermark`, `enableFallback`, `enableTranslation`).

---

### 3.4 Veo 3.1 Fast — Image to Video
- **Identifier:** `veo3_fast`
- **Display Name:** `Google Veo 3.1 Fast`
- **Group:** `image_to_video`
- **Default Generation Type:** `FIRST_AND_LAST_FRAMES_2_VIDEO`
- **Supported Modes:** `FIRST_AND_LAST_FRAMES_2_VIDEO`
- **UI Parameter Matrix:**

| UI Field | Payload Field | Type / Renderer | Required | Default | Notes |
| --- | --- | --- | --- | --- | --- |
| Prompt | `prompt` | string / prompt renderer | ✅ | — |  |
| Start Frame | `startFrame` → `imageUrls[0]` | image upload | ✅ | — |  |
| End Frame | `endFrame` → `imageUrls[1]` | image upload | ⭕ | — |  |
| Aspect Ratio | `aspectRatio` | select (`16:9`,`9:16`,`Auto`) | ⭕ | `16:9` |  |
| Seeds | `seeds` | number | ⭕ | — |  |
| Callback URL | `callBackUrl` | url | ⭕ | — |  |
| Watermark | `watermark` | text | ⭕ | `""` |  |
| Enable Translation (hidden) | `enableTranslation` | boolean | ✅ | `true` |  |
| Enable Fallback (hidden) | `enableFallback` | boolean | ✅ | `false` |  |
| Model (hidden) | `model` | text | ✅ | `veo3_fast` |  |
| Generation Type (hidden) | `generationType` | text | ✅ | `FIRST_AND_LAST_FRAMES_2_VIDEO` |  |

- **Provider Payload Notes:**  
  - Same as HQ image-to-video, but `model: veo3_fast`.

---

### 3.5 Veo 3.1 Reference — Image to Video
- **Identifier:** `veo3_fast`
- **Display Name:** `Google Veo 3.1 Reference`
- **Group:** `image_to_video`
- **Default Generation Type:** `REFERENCE_2_VIDEO`
- **Supported Modes:** `REFERENCE_2_VIDEO` (per Kie.ai doc: only supported on `veo3_fast` and 16:9)
- **UI Parameter Matrix:**

| UI Field | Payload Field | Type / Renderer | Required | Default | Notes |
| --- | --- | --- | --- | --- | --- |
| Prompt | `prompt` | string / prompt renderer | ✅ | — |  |
| Reference Images | `imageUrls` (1–3) | multi-image upload | ✅ | — | Need at least 1, up to 3 |
| Aspect Ratio | `aspectRatio` | select (`16:9`) | ✅ | `16:9` | Reference mode requires 16:9 |
| Seeds | `seeds` | number | ⭕ | — |  |
| Callback URL | `callBackUrl` | url | ⭕ | — |  |
| Watermark | `watermark` | text | ⭕ | `""` |  |
| Enable Translation (hidden) | `enableTranslation` | boolean | ✅ | `true` |  |
| Enable Fallback (hidden) | `enableFallback` | boolean | ✅ | `false` |  |
| Model (hidden) | `model` | text | ✅ | `veo3_fast` |  |
| Generation Type (hidden) | `generationType` | text | ✅ | `REFERENCE_2_VIDEO` |  |

- **Provider Payload Notes:**  
  - Accept multiple image URLs directly (no start/end transformation).  
  - Validate that the number of images is between 1 and 3.  
  - Hard-code aspect ratio to `16:9` per provider requirement.

---

## 4. Next Steps
1. Product/ML team fills in Sections 3.1–3.5 with definitive values.  
2. Engineering scripts consume this document (or an extracted JSON version) to generate the per-model `.ts` files.  
3. UI references those files for schema + execution; Supabase `ai_models` table becomes legacy only.  
4. Any updates must follow: edit doc ➜ regenerate file ➜ commit.

Once this doc is populated, we’ll have the single source of truth needed to finish the per-model isolation work.

