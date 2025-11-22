# API Key Mapping Guide

## How It Works

Each model explicitly declares which API key secret to use via the `use_api_key` field in `MODEL_CONFIG`. No more inference logic!

## Adding `use_api_key` to Models

### For KIE_AI Models

Add the `use_api_key` field based on `contentType`:

```typescript
export const MODEL_CONFIG = {
  // ... other fields
  provider: "kie_ai",
  contentType: "image_editing",
  use_api_key: "KIE_AI_API_KEY_IMAGE_EDITING",  // ← ADD THIS
  // ... rest of config
} as const;
```

**Mapping by contentType:**
- `image_editing` → `"KIE_AI_API_KEY_IMAGE_EDITING"`
- `image_to_video` → `"KIE_AI_API_KEY_IMAGE_TO_VIDEO"`
- `prompt_to_image` → `"KIE_AI_API_KEY_PROMPT_TO_IMAGE"`
- `prompt_to_video` → `"KIE_AI_API_KEY_PROMPT_TO_VIDEO"`
- `prompt_to_audio` → `"KIE_AI_API_KEY_PROMPT_TO_AUDIO"`

**Special Models (use specific keys):**
- VEO3 models → `"KIE_AI_API_KEY_VEO3"`
- SORA2 models → `"KIE_AI_API_KEY_SORA2"`
- Nano Banana models → `"KIE_AI_API_KEY_NANO_BANANA"`
- Seedream V4 models → `"KIE_AI_API_KEY_SEEDREAM_V4"`

### For RUNWARE Models

```typescript
export const MODEL_CONFIG = {
  // ... other fields
  provider: "runware",
  contentType: "prompt_to_image",
  use_api_key: "RUNWARE_API_KEY_PROMPT_TO_IMAGE",  // ← ADD THIS
  // ... rest of config
} as const;
```

**Mapping by contentType:**
- `prompt_to_image` → `"RUNWARE_API_KEY_PROMPT_TO_IMAGE"`
- `image_editing` → `"RUNWARE_API_KEY_IMAGE_EDITING"`
- `image_to_video` → `"RUNWARE_API_KEY_IMAGE_TO_VIDEO"`

## Update Function Calls

Update the API key retrieval function to pass `use_api_key`:

**Before:**
```typescript
async function getKieApiKey(): Promise<string> {
  return getCentralKieApiKey(MODEL_CONFIG.modelId, MODEL_CONFIG.recordId, MODEL_CONFIG.contentType);
}
```

**After:**
```typescript
async function getKieApiKey(): Promise<string> {
  return getCentralKieApiKey(MODEL_CONFIG.modelId, MODEL_CONFIG.recordId, MODEL_CONFIG.use_api_key);
}
```

## Bulk Update Scripts

### 1. Add `use_api_key` to all KIE_AI image_editing models:
```bash
find src/lib/models/locked/image_editing -name "*.ts" -type f -exec grep -l 'provider.*kie_ai' {} \; | while read file; do
  sed -i '/contentType: "image_editing",/a\  use_api_key: "KIE_AI_API_KEY_IMAGE_EDITING",' "$file"
done
```

### 2. Add `use_api_key` to all KIE_AI prompt_to_image models:
```bash
find src/lib/models/locked/prompt_to_image -name "*.ts" -type f -exec grep -l 'provider.*kie_ai' {} \; | while read file; do
  sed -i '/contentType: "prompt_to_image",/a\  use_api_key: "KIE_AI_API_KEY_PROMPT_TO_IMAGE",' "$file"
done
```

### 3. Add `use_api_key` to all KIE_AI image_to_video models:
```bash
find src/lib/models/locked/image_to_video -name "*.ts" -type f -exec grep -l 'provider.*kie_ai' {} \; | while read file; do
  sed -i '/contentType: "image_to_video",/a\  use_api_key: "KIE_AI_API_KEY_IMAGE_TO_VIDEO",' "$file"
done
```

### 4. Add `use_api_key` to all KIE_AI prompt_to_video models:
```bash
find src/lib/models/locked/prompt_to_video -name "*.ts" -type f -exec grep -l 'provider.*kie_ai' {} \; | while read file; do
  sed -i '/contentType: "prompt_to_video",/a\  use_api_key: "KIE_AI_API_KEY_PROMPT_TO_VIDEO",' "$file"
done
```

### 5. Add `use_api_key` to all KIE_AI prompt_to_audio models:
```bash
find src/lib/models/locked/prompt_to_audio -name "*.ts" -type f -exec grep -l 'provider.*kie_ai' {} \; | while read file; do
  sed -i '/contentType: "prompt_to_audio",/a\  use_api_key: "KIE_AI_API_KEY_PROMPT_TO_AUDIO",' "$file"
done
```

### 6. Update all function calls from contentType to use_api_key:
```bash
find src/lib/models/locked -name "*.ts" -type f -exec sed -i 's/MODEL_CONFIG\.contentType)/MODEL_CONFIG.use_api_key)/g' {} \;
```

### 7. Add `use_api_key` to RUNWARE models:
```bash
# Prompt to image
find src/lib/models/locked/prompt_to_image -name "*.ts" -type f -exec grep -l 'provider.*runware' {} \; | while read file; do
  sed -i '/contentType: "prompt_to_image",/a\  use_api_key: "RUNWARE_API_KEY_PROMPT_TO_IMAGE",' "$file"
done

# Image editing
find src/lib/models/locked/image_editing -name "*.ts" -type f -exec grep -l 'provider.*runware' {} \; | while read file; do
  sed -i '/contentType: "image_editing",/a\  use_api_key: "RUNWARE_API_KEY_IMAGE_EDITING",' "$file"
done

# Image to video
find src/lib/models/locked/image_to_video -name "*.ts" -type f -exec grep -l 'provider.*runware' {} \; | while read file; do
  sed -i '/contentType: "image_to_video",/a\  use_api_key: "RUNWARE_API_KEY_IMAGE_TO_VIDEO",' "$file"
done
```

## Adding a New Model

When adding a new model, simply add the `use_api_key` field to MODEL_CONFIG:

```typescript
export const MODEL_CONFIG = {
  modelId: "your-model/name",
  recordId: "uuid-here",
  modelName: "Your Model",
  provider: "kie_ai",
  contentType: "image_editing",
  use_api_key: "KIE_AI_API_KEY_IMAGE_EDITING",  // ← Explicitly set this!
  // ... rest of config
} as const;
```

That's it! No need to modify edge functions or add recordId arrays.
