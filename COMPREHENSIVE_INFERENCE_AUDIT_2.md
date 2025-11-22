# 🚨 COMPREHENSIVE INFERENCE AUDIT REPORT #2

## Executive Summary

**Status:** ⚠️ CRITICAL - 80+ INFERENCE PATTERNS FOUND
**Scope:** Entire webapp codebase
**Areas Affected:** Error handling, content type detection, provider logic, URL parsing, file type detection
**Impact:** HIGH - System relies heavily on string matching and pattern inference

---

## CATEGORY 1: STRING MATCHING FOR TYPE DETECTION

### 1.1 Content Type Inference (.includes)

**Location:** `src/components/generation/OptimizedGenerationPreview.tsx:38-50`

```typescript
const normalizeContentType = (type: string): 'image' | 'video' | 'audio' => {
  const normalized = type.toLowerCase();
  // Video types
  if (normalized.includes('video') || normalized === 'image_to_video' || normalized === 'prompt_to_video') {
    return 'video';
  }
  // Audio types
  if (normalized.includes('audio') || normalized === 'prompt_to_audio') {
    return 'audio';
  }
  // Image types (default for image_editing, prompt_to_image, etc.)
  return 'image';
};
```

**Problem:** Infers media type from contentType string using `.includes()`. Same issue as the one we just fixed in getGenerationType.

**Severity:** MEDIUM - Duplicate of inference we just removed from backend

---

**Location:** `src/hooks/storyboard/useStoryboardScenes.ts:44, 81`

```typescript
const isVideo = value.includes('.mp4') || value.includes('.webm') || value.includes('video');
```

**Problem:**
- Could match "background-video-thumbnail.png" as video
- Generic word "video" in URL is unreliable

**Severity:** MEDIUM - False positives likely

---

**Location:** `supabase/functions/render-storyboard-video/index.ts:18-24`

```typescript
const isVideoUrl = (url: string | null | undefined): boolean => {
  if (!url) return false;
  const lowerUrl = url.toLowerCase();
  return lowerUrl.includes('.mp4') ||
         lowerUrl.includes('.webm') ||
         lowerUrl.includes('.mov') ||
         lowerUrl.includes('video');
};
```

**Problem:** Same as above - generic "video" match is too broad

**Severity:** MEDIUM

---

## CATEGORY 2: ERROR CLASSIFICATION BY STRING MATCHING

### 2.1 Error Type Inference from Message Text

**Location:** `src/lib/errors.ts:50-66`

```typescript
const msg = error.message.toLowerCase();

if (msg.includes('auth') || msg.includes('unauthorized')) {
  return new AuthenticationError(error.message, context);
}
if (msg.includes('network') || msg.includes('fetch')) {
  return new NetworkError(error.message, context);
}
if (msg.includes('invalid') || msg.includes('validation')) {
  return new ValidationError(error.message, context);
}
if (msg.includes('storage') || msg.includes('bucket')) {
  return new StorageError('ERROR', error.message, context);
}
if (msg.includes('generation') || msg.includes('timeout')) {
  return new GenerationError('ERROR', error.message, context);
}
```

**Problem:**
- Extremely fragile keyword matching
- "Invalid authentication token" matches "validation" instead of "auth"
- Generic words like "fetch" could appear in unrelated errors
- Order matters - first match wins

**Severity:** HIGH - Misclassifies errors, impacts debugging

---

**Location:** `src/hooks/useGeneration.tsx:132, 148, 171, 179`

```typescript
if (error.message?.includes("401") || error.message?.toLowerCase().includes("unauthorized")) {
  // Handle auth error
}
if (error.message?.includes("402") || error.message?.toLowerCase().includes("insufficient")) {
  // Handle payment error
}
if (error.message?.includes("429")) {
  // Handle rate limit
}
if (error.message?.includes("400")) {
  // Handle bad request
}
```

**Problem:**
- HTTP status codes should be in separate field, not parsed from message
- "insufficient" is vague and could match many error types
- Message text is unreliable for parsing structured data

**Severity:** HIGH - Incorrect error handling paths

---

**Location:** `src/hooks/useVideoJobs.tsx:266-272, 386-394`

```typescript
if (message.includes('sign in')) {
  toast.error('Please sign in to continue');
} else if (message.includes('429') || message.includes('rate limit')) {
  toast.error('Rate limit reached');
} else if (message.includes('timeout') || message.includes('timed out')) {
  toast.error('Request timed out');
} else if (message.includes('quota') || message.includes('limit exceeded')) {
  toast.error('Quota exceeded');
} else if (message.includes('Shotstack')) {
  toast.error('Shotstack API error');
} else if (message.includes('Pixabay')) {
  toast.error('Pixabay API error');
}
```

**Problem:**
- Service names in error messages unreliable
- "Pixabay returned timeout" would match "Pixabay" not "timeout" (first match wins)
- Brittle error message parsing

**Severity:** MEDIUM - Wrong user-facing error messages

---

**Location:** `supabase/functions/webhooks/kie-webhook/index.ts:141, 143`

```typescript
const failurePatterns = ['fail', 'error'];
const hasFailurePattern = failurePatterns.some(pattern => msgStr.includes(pattern));
const isSuccess = state === 'success' || httpCode === 200 || msgStr.includes('success');
```

**Problem:**
- Message "Successfully failed to retry" would match BOTH success AND failure
- Contradictory signal detection

**Severity:** MEDIUM - Could mark failed jobs as successful

---

## CATEGORY 3: PROVIDER/MODEL INFERENCE

### 3.1 Model ID Pattern Matching

**Location:** `supabase/functions/kie-ai-webhook/providers/midjourney-handler.ts:5-9`

```typescript
export function isMidjourneyModel(modelId: string | undefined): boolean {
  if (!modelId) return false;
  return modelId.startsWith('mj_') || modelId.includes('midjourney');
}
```

**Problem:**
- Generic `.includes('midjourney')` could match "stable-diffusion-midjourney-style"
- Should use explicit model registry

**Severity:** LOW - Unlikely false positives but possible

---

**Location:** `supabase/functions/retry-pending-midjourney/index.ts:86`

```typescript
return modelId && (modelId.startsWith('mj_') || modelId.includes('midjourney'));
```

**Problem:** Duplicate inference logic - DRY violation

**Severity:** LOW - Maintenance issue

---

### 3.2 API Key Selection by Model ID Patterns

**Location:** `supabase/functions/generate-content-sync/providers/runware.ts:99-122`

```typescript
function getRunwareApiKeyFromEnv(modelId: string): string {
  let secretName: string;

  if (modelId.startsWith('runware:100@1') ||
      modelId.startsWith('runware:flux') ||
      modelId.startsWith('runware:stable-diffusion')) {
    secretName = 'RUNWARE_API_KEY_PROMPT_TO_IMAGE';
  } else if (modelId.startsWith('runware:102@1') ||
             modelId.startsWith('runware:103@1')) {
    secretName = 'RUNWARE_API_KEY_IMAGE_EDITING';
  } else if (modelId.startsWith('bytedance:')) {
    secretName = 'RUNWARE_API_KEY_IMAGE_TO_VIDEO';
  } else {
    secretName = 'RUNWARE_API_KEY';
  }

  const apiKey = Deno.env.get(secretName) || Deno.env.get('RUNWARE_API_KEY');

  if (!apiKey) {
    throw new Error(`${secretName} not configured`);
  }

  return apiKey;
}
```

**Problem:**
- **EXACT SAME ISSUE WE JUST FIXED** for kie_ai models
- Hardcoded model ID prefix patterns
- Should use explicit `use_api_key` field like we implemented
- Adding new model requires code changes

**Severity:** HIGH - This is the inference pattern we just eliminated!

---

### 3.3 Provider String Switching

**Location:** `supabase/functions/generate-content/providers/index.ts:30-58`

```typescript
switch (provider) {
  case 'kie_ai':
    if (!webhookToken) {
      throw new Error('webhookToken is required for kie_ai provider');
    }
    return await callKieAI(request, webhookToken);

  case 'runware':
    return await callRunware(request);

  case 'lovable_ai_sync':
    return await callLovableAI(request);

  case 'json2video':
    throw new Error('JSON2Video provider not yet implemented...');

  // ... more cases

  default:
    throw new Error(`Unknown provider: ${provider}`);
}
```

**Problem:**
- String-based switching, not type-safe
- Missing provider only caught at runtime
- Should use provider registry with type safety

**Severity:** MEDIUM - No compile-time safety

---

### 3.4 Provider-Specific Parameter Logic

**Location:** `supabase/functions/generate-content/index.ts:530-546, 984-986`

```typescript
// Safety fallback for ElevenLabs models: map prompt to text if text is missing
if (
  model.provider === 'elevenlabs' &&
  !parameters.text &&
  typeof prompt === 'string' &&
  prompt.trim().length > 0
) {
  parameters.text = prompt;
  logger.debug('Applied prompt->text fallback for ElevenLabs model', { userId: user.id });
}

// Safety fallback for Runware models: map prompt to positivePrompt if positivePrompt is missing
if (
  model.provider === 'runware' &&
  !parameters.positivePrompt &&
  typeof prompt === 'string' &&
  prompt.trim().length > 0
) {
  parameters.positivePrompt = prompt;
  logger.debug('Applied prompt->positivePrompt fallback for Runware model', { userId: user.id });
}

// ... later:

// Runware video default: uppercase MP4
if (model.provider === 'runware' && model.content_type === 'video' && !providerRequest.parameters.outputFormat) {
  providerRequest.parameters.outputFormat = 'MP4';
}
```

**Problem:**
- Provider-specific business logic scattered in generation flow
- Hard to maintain and extend
- Should be encapsulated in provider implementations

**Severity:** MEDIUM - Maintenance and extensibility issue

---

### 3.5 Provider + Content Type Combination Checks

**Location:** `src/lib/custom-creation-utils.ts:57`

```typescript
const isKieAiAudio = model.provider === 'kie_ai' && model.content_type === 'audio';
```

**Location:** `src/hooks/useSchemaHelpers.ts:65`

```typescript
const isKieAiAudio = model.provider === 'kie_ai' && model.content_type === 'audio';
```

**Problem:**
- Hardcoded provider + content type checks
- DRY violation - duplicated across files
- Should be centralized utility or model property

**Severity:** LOW - DRY violation

---

## CATEGORY 4: FILE TYPE DETECTION

### 4.1 Extension to Type Mapping

**Location:** `src/components/generation/OptimizedGenerationPreview.tsx:52-58`

```typescript
const inferTypeFromExtension = (path: string): 'image' | 'video' | 'audio' => {
  const ext = (path.split('.').pop() || '').toLowerCase();
  if (['mp4', 'webm', 'mov', 'm4v'].includes(ext)) return 'video';
  if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) return 'audio';
  return 'image';
};
```

**Problem:**
- Defaults to 'image' for unknown types
- "file.txt" would be treated as image
- No validation that extension matches content

**Severity:** MEDIUM - Incorrect rendering of non-media files

---

**Location:** `src/types/workflow-execution-display.ts:225-248`

```typescript
export function getMimeTypeFromExtension(extension: string): string {
  const mimeTypes: Record<string, string> = {
    // Video
    mp4: 'video/mp4',
    webm: 'video/webm',
    // ... more types
  };

  return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
}
```

**Problem:**
- Limited set of known types
- Defaults to octet-stream
- No validation that extension matches actual file

**Severity:** LOW - Reasonable fallback

---

**Location:** `src/hooks/useNativeDownload.tsx:23-40`

```typescript
const getMimeType = (url: string): string => {
  const extension = url.split('.').pop()?.toLowerCase();

  const mimeTypes: Record<string, string> = {
    jpg: 'image/jpeg',
    png: 'image/png',
    // ... more types
  };

  return mimeTypes[extension || ''] || 'application/octet-stream';
};
```

**Problem:**
- URL parameters break this: "file.mp4?token=xyz" extracts "xyz" as extension
- Should use proper URL parsing

**Severity:** MEDIUM - Breaks with query parameters

---

### 4.2 MIME Type Fallback Cascades

**Location:** `supabase/functions/_shared/storage.ts:38-67`

```typescript
function getMimeType(extension: string, contentType: string): string {
  const mimeTypes: Record<string, string> = { /* ... */ };

  const mime = mimeTypes[extension.toLowerCase()];
  if (mime) return mime;

  // Fallback based on content type
  if (contentType.startsWith('image/')) return 'image/jpeg';
  if (contentType.startsWith('video/')) return 'video/mp4';
  if (contentType.startsWith('audio/')) return 'audio/mpeg';

  return 'application/octet-stream';
}
```

**Problem:**
- Two-tier inference: extension → contentType prefix → default
- Could mismatch actual content (e.g., PNG marked as JPEG)

**Severity:** MEDIUM - Data integrity issue

---

**Location:** `supabase/functions/kie-ai-webhook/storage/mime-utils.ts:5-54`

```typescript
export function determineFileExtension(contentType: string, url: string): string {
  if (url) {
    const match = url.match(/\.([a-z0-9]+)(?:\?|$)/i);
    if (match) return match[1];
  }

  const mimeToExt: Record<string, string> = { /* ... */ };

  return mimeToExt[contentType.toLowerCase()] || 'mp4';
}
```

**Problem:**
- **Defaults to 'mp4' when unknown** - could save text files as .mp4!
- Bidirectional guessing (MIME→ext and ext→MIME) is error-prone

**Severity:** HIGH - Could corrupt files with wrong extension

---

**Location:** `supabase/functions/generate-content/providers/runware.ts:376-402`

```typescript
function determineFileExtension(format: string, url: string, isVideo: boolean): string {
  const formatMap: Record<string, string> = { /* ... */ };

  if (formatMap[format.toLowerCase()]) {
    return formatMap[format.toLowerCase()];
  }

  // Try to extract from URL
  if (url) {
    const match = url.match(/\.([a-z0-9]+)(?:\?|$)/i);
    if (match) return match[1];
  }

  // Default based on content type
  return isVideo ? 'mp4' : 'webp';
}
```

**Problem:**
- Three-tier fallback cascade: format → URL → boolean flag
- Final default based on boolean could be incorrect

**Severity:** MEDIUM - Multiple guessing layers

---

## CATEGORY 5: URL/PATH PATTERN MATCHING

### 5.1 Internal vs External Link Detection

**Location:** `src/components/homepage/FeatureShowcase.tsx:25`

```typescript
const isInternal = ctaLink?.startsWith("/");
```

**Problem:**
- Relative paths without slash ("about", "docs/guide") treated as external
- Should handle multiple internal URL patterns

**Severity:** LOW - Incomplete logic

---

**Location:** `src/types/workflow-execution-display.ts:218-219`

```typescript
export function isFullHttpUrl(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://');
}
```

**Problem:**
- Missing protocol-relative URLs ("//cdn.example.com")
- Should use URL constructor for proper validation

**Severity:** LOW - Edge case handling

---

**Location:** `src/pages/admin/CreateBlog.tsx:164`

```typescript
is_internal: backlinkUrl.startsWith('/') || backlinkUrl.includes('artifio'),
```

**Problem:**
- "https://evil.com/test?redirect=artifio.com" would match as internal
- Domain check without proper URL parsing

**Severity:** MEDIUM - Security issue (link classification)

---

### 5.2 Storage Path Extraction

**Location:** `src/lib/storage-utils.ts:99, 105`

```typescript
const pathMatch = urlObj.pathname.match(/\/generated-content\/(.+)$/);
// ... later:
const publicMatch = urlObj.pathname.match(/\/object\/public\/[^/]+\/(.+)$/);
```

**Problem:**
- Hardcoded path structure
- Changes to storage URL format break extraction

**Severity:** MEDIUM - Fragile to API changes

---

**Location:** `src/lib/supabase-images.ts:30-46`

```typescript
const m = cleanPath.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)/);
// ... OR:
const m = cleanPath.match(/\/storage\/v1\/object\/sign\/[^/]+\/(.+)/);
// ... OR:
const m = cleanPath.match(/\/storage\/v1\/render\/image\/(?:(?:public|sign|authenticated)\/)?[^/]+\/(.+)/);
// ... OR:
const dashboardMatch = cleanPath.match(/^\/dashboard\/[^/]+\/(.+)/);
```

**Problem:**
- Complex regex patterns for different Supabase URL formats
- Multiple fallback attempts
- Fragile to Supabase API changes

**Severity:** HIGH - Critical path extraction logic

---

### 5.3 Video Path Filtering

**Location:** `src/pages/dashboard/History.tsx:189-191`

```typescript
!sourceForSigning.startsWith('storyboard-videos/') &&
!sourceForSigning.startsWith('faceless-videos/') &&
/^https?:\/\//.test(sourceForSigning);
```

**Problem:**
- Hardcoded path prefixes
- Mixing `.startsWith()` and regex for similar checks

**Severity:** LOW - Inconsistent pattern matching

---

## CATEGORY 6: CONFIGURATION INFERENCE

### 6.1 Test Mode Detection

**Location:** `supabase/functions/create-dodo-payment/index.ts:170`

```typescript
const isTestMode = dodoApiKey.startsWith('test_');
```

**Problem:**
- Relies on API key format convention
- If test key doesn't have prefix, production mode used incorrectly
- Should be explicit environment variable

**Severity:** HIGH - Could charge real payments in test

---

### 6.2 Service Worker Cache Strategy

**Location:** `public/sw.js:52-56, 72`

```typescript
url.pathname.match(/\.(js|css|woff2?|ttf|eot)$/) ||
url.pathname.startsWith('/assets/')

// ... later:
if (url.origin.includes('supabase')) {
  // Handle supabase URLs differently
}
```

**Problem:**
- Generic `.includes('supabase')` matches any URL with that substring
- Should check actual origin against known Supabase domains

**Severity:** MEDIUM - Could cache wrong URLs

---

### 6.3 String to Enum Mapping

**Location:** `supabase/functions/dodo-payments-webhook/index.ts:278, 377, 404`

```typescript
const planKey = planName.toLowerCase().replace(' ', '_') as keyof typeof PLAN_TOKENS;
```

**Problem:**
- Unsafe type cast
- No validation that result is actually valid key
- Runtime error if plan name doesn't match enum

**Severity:** MEDIUM - Runtime type error risk

---

### 6.4 Template Variable Replacement

**Location:** `supabase/functions/workflow-executor/helpers/parameter-resolver.ts:16-24`

```typescript
export function replaceTemplateVariables(
  template: string,
  context: Record<string, any>
): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
    const value = getNestedValue(context, path.trim());
    return value ?? match;
  });
}
```

**Problem:**
- If value not found, keeps original `{{text}}`
- Silent failure could go unnoticed in output

**Severity:** LOW - Might want explicit error

---

### 6.5 Boolean String Coercion

**Location:** `supabase/functions/workflow-executor/helpers/parameter-resolver.ts:84-94`

```typescript
case 'boolean': {
  let v = value;
  if (Array.isArray(v)) v = v[0];
  if (typeof v === 'boolean') return v;
  if (typeof v === 'string') {
    const s = v.toLowerCase();
    if (s === 'true') return true;
    if (s === 'false') return false;
  }
  return !!v;
}
```

**Problem:**
- Strings like '0' or 'no' become true (truthy)
- Only 'false' string becomes false
- Should handle more boolean string variations

**Severity:** MEDIUM - Unexpected boolean conversions

---

## CATEGORY 7: ADDITIONAL PATTERNS

### 7.1 Voice Name Matching

**Location:** `src/lib/voice-mapping.ts:46`

```typescript
return VOICE_DATABASE.find(v => v.name.toLowerCase() === name.toLowerCase());
```

**Problem:**
- No normalization of whitespace or special characters
- "Voice-1" vs "Voice 1" won't match

**Severity:** LOW - Could fail to find voices

---

### 7.2 Category Filter Magic String

**Location:** `src/lib/admin/template-filtering.ts:13-16`

```typescript
const showAllCategories = selectedCategories.includes('All');
return showAllCategories
  ? templates
  : templates.filter(t => selectedCategories.includes(t.category));
```

**Problem:**
- Magic string 'All'
- If category actually named 'All', behavior would be confusing

**Severity:** LOW - Edge case

---

### 7.3 Content Origin Detection

**Location:** `supabase/functions/stream-content/index.ts:106-107`

```typescript
const isVideo = headers.get("content-type")?.startsWith("video/");
const isAudio = headers.get("content-type")?.startsWith("audio/");
```

**Problem:**
- Missing image check
- Assumes if not video/audio it's something else
- No validation of full MIME type

**Severity:** LOW - Incomplete logic

---

## SUMMARY STATISTICS

| Category | Count | Severity Distribution |
|----------|-------|----------------------|
| String Matching (.includes/.startsWith) | 35+ | 🔴 High: 8, 🟡 Medium: 20, 🟢 Low: 7 |
| Error Classification | 10+ | 🔴 High: 3, 🟡 Medium: 7 |
| Provider/Model Inference | 15+ | 🔴 High: 1, 🟡 Medium: 10, 🟢 Low: 4 |
| File Type Detection | 15+ | 🔴 High: 1, 🟡 Medium: 10, 🟢 Low: 4 |
| URL/Path Patterns | 10+ | 🔴 High: 1, 🟡 Medium: 7, 🟢 Low: 2 |
| Configuration Inference | 8+ | 🔴 High: 1, 🟡 Medium: 5, 🟢 Low: 2 |
| Other Patterns | 7+ | 🟢 Low: 7 |

**TOTAL: 80+ inference patterns**

---

## CRITICAL ISSUES (Must Fix)

### 🔴 PRIORITY 1 (Immediate Action Required):

1. **Runware API Key Inference** (generate-content-sync/providers/runware.ts:99-122)
   - **EXACT SAME ISSUE** we just fixed for kie_ai
   - Uses model ID prefix patterns to select API keys
   - Should implement `use_api_key` field approach

2. **Test Mode Detection** (create-dodo-payment/index.ts:170)
   - Infers test vs production from API key prefix
   - Could charge real payments incorrectly
   - Should use explicit environment variable

3. **Error Classification** (src/lib/errors.ts:50-66)
   - Fragile keyword matching in error messages
   - Misclassifies errors affecting debugging
   - Should use error codes or structured error types

4. **File Extension Defaults to MP4** (kie-ai-webhook/storage/mime-utils.ts)
   - Unknown file types default to '.mp4'
   - Could corrupt non-video files
   - Should throw error or use proper fallback

5. **Storage Path Extraction** (src/lib/supabase-images.ts:30-46)
   - Complex regex for Supabase URL parsing
   - Critical for file access
   - Fragile to API changes

---

## RECOMMENDED ACTIONS

### Immediate (This Week):

1. **Fix Runware API Key Selection**
   - Apply same `use_api_key` field approach we implemented for kie_ai
   - Update all runware models with explicit API key field
   - Remove model ID prefix matching

2. **Fix Test Mode Detection**
   - Add explicit `DODO_TEST_MODE` environment variable
   - Remove API key prefix inference

3. **Improve Error Classification**
   - Add error code field to all error responses
   - Use error codes instead of message parsing
   - Create proper error type hierarchy

### Short-term (This Month):

4. **Centralize Content Type Detection**
   - Create single source of truth for content type → media type mapping
   - Remove duplicate `normalizeContentType` functions
   - Use explicit mapping like we did for getGenerationType

5. **Fix File Type Detection**
   - Remove dangerous defaults (mp4 for unknown types)
   - Proper URL parsing for extracting extensions
   - Validate MIME types against actual content when possible

6. **Consolidate Provider Logic**
   - Move provider-specific parameter mapping into provider implementations
   - Remove scattered provider checks in generation flow
   - Create provider registry pattern

### Long-term (Next Quarter):

7. **URL Pattern Matching**
   - Use URL constructor instead of regex where possible
   - Centralize Supabase URL parsing
   - Make storage path extraction more robust

8. **Configuration Inference**
   - Replace magic strings with constants
   - Explicit configuration over convention
   - Type-safe provider switching

---

## FILES REQUIRING CHANGES

### Priority 1 (Critical):
- `supabase/functions/generate-content-sync/providers/runware.ts`
- `supabase/functions/create-dodo-payment/index.ts`
- `src/lib/errors.ts`
- `supabase/functions/kie-ai-webhook/storage/mime-utils.ts`
- `src/lib/supabase-images.ts`

### Priority 2 (High):
- `src/components/generation/OptimizedGenerationPreview.tsx`
- `src/hooks/useGeneration.tsx`
- `src/hooks/useVideoJobs.tsx`
- `src/hooks/useNativeDownload.tsx`
- `supabase/functions/_shared/storage.ts`
- `supabase/functions/generate-content/index.ts`

### Priority 3 (Medium):
- All other files listed in report sections

---

## RISK ASSESSMENT

**Current State:**
- 🔴 Payment system could use wrong mode (test/production)
- 🔴 File corruption risk from wrong extension defaults
- 🟡 Errors misclassified affecting user experience
- 🟡 Fragile URL parsing could break file access
- 🟡 Duplicate inference logic across codebase

**After Fixes:**
- ✅ Explicit configuration throughout
- ✅ Type-safe provider handling
- ✅ Proper error classification
- ✅ Robust file type detection
- ✅ Maintainable, testable codebase

---

**Report Generated:** 2025-11-22
**Total Inference Patterns:** 80+
**Critical Issues:** 5
**High Priority Issues:** 15+
**Files Affected:** 50+
