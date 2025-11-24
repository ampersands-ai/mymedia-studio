# Provider Adapters

Provider adapters translate between our schema-driven system and external AI provider APIs (Runware, KIE.ai, etc.).

## Architecture Pattern

```
┌─────────────────┐
│  Model Schema   │ ← Single source of truth (.ts registry files)
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│ Edge Function   │ ← Validates & filters params using schema
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│ Provider Adapter│ ← Maps schema params to API-specific format
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  External API   │ ← Receives properly formatted request
└─────────────────┘
```

## Acceptable Hardcoding

Provider adapters **MAY** hardcode:
- ✅ API-specific field name mappings (e.g., `promptAliases: { prompt: 'positivePrompt' }`)
- ✅ Provider authentication patterns (API key headers, bearer tokens)
- ✅ API endpoint URLs specific to the provider
- ✅ Content type mappings (translating between our types and provider types)
- ✅ Provider-specific validation rules that differ from our schema

**Example:**
```typescript
// kie-ai.ts - Provider-specific mappings
const promptAliases: Record<string, string[]> = {
  'prompt_to_image': ['positivePrompt', 'positive_prompt'],
  'image_editing': ['prompt', 'instruction']
};
```

Provider adapters **MUST NOT** hardcode:
- ❌ Business logic or feature flags
- ❌ User-facing strings or error messages (use internationalization)
- ❌ Status codes (use constants: `EXECUTION_CONTEXTS`, `GENERATION_STATUS`)
- ❌ Execution contexts or workflow logic
- ❌ Token costs or pricing (define in model schema)
- ❌ Model capabilities or constraints (define in model schema)

## Schema-First Principle

**CRITICAL**: All parameters MUST be validated against the model's JSON schema BEFORE being passed to providers.

```typescript
// ✅ CORRECT: Edge function validates first
const validatedParams = validateAndFilterParameters(userParams, model.input_schema);
const apiRequest = providerAdapter.formatRequest(validatedParams);

// ❌ WRONG: Provider receives unvalidated data
const apiRequest = providerAdapter.formatRequest(userParams); // Security risk!
```

### Why Schema-First?

1. **Security**: Prevents injection attacks and malformed data from reaching providers
2. **Type Safety**: Ensures parameters match expected types before API calls
3. **Cost Control**: Validates parameter combinations that affect token costs
4. **Error Prevention**: Catches invalid values before expensive API calls
5. **Single Source of Truth**: Model schema defines what's valid, not provider code

## Provider Responsibilities

Each provider adapter is responsible for:

1. **Field Mapping**: Translating our schema field names to provider field names
   ```typescript
   // Our schema uses 'positivePrompt', provider expects 'prompt'
   positivePrompt: parameters.positivePrompt || parameters.prompt
   ```

2. **Format Conversion**: Converting between our data formats and provider formats
   ```typescript
   // Convert aspect ratio string to width/height
   const [width, height] = aspectRatio.split(':').map(Number);
   ```

3. **Authentication**: Adding provider-specific auth headers or tokens
   ```typescript
   headers: { 'Authorization': `Bearer ${apiKey}` }
   ```

4. **Response Normalization**: Converting provider responses to our standard format
   ```typescript
   return {
     output_data: providerResponse.imageData,
     file_extension: 'png',
     metadata: { provider: 'runware', ... }
   };
   ```

5. **Error Handling**: Translating provider errors to our error format
   ```typescript
   catch (error) {
     throw new Error(`Runware API error: ${error.message}`);
   }
   ```

## Adding a New Provider

1. **Create Provider File**: `supabase/functions/generate-content-sync/providers/new-provider.ts`

2. **Implement Required Interface**:
   ```typescript
   export interface ProviderRequest {
     model: string;
     prompt: string;
     parameters: Record<string, unknown>;
     input_schema?: any;
   }
   
   export interface ProviderResponse {
     output_data: Uint8Array;
     file_extension: string;
     file_size?: number;
     metadata?: Record<string, unknown>;
   }
   
   export async function callNewProvider(
     request: ProviderRequest
   ): Promise<ProviderResponse> {
     // Implementation
   }
   ```

3. **Register in Provider Index**: Update `providers/index.ts` to route to new provider

4. **Define Prompt Aliases**: Document any field name mappings specific to this provider

5. **Test with Model Schema**: Ensure all model schema parameters are correctly mapped

## Security Considerations

- Never log API keys or sensitive authentication tokens
- Validate all parameters against schema BEFORE API calls
- Implement proper error handling (no stack traces in responses)
- Use structured logging for debugging (EdgeLogger)
- Always sanitize provider responses before storing

## Examples

### Field Mapping Example (KIE.ai)
```typescript
// Different models use different prompt field names
const modelPromptField = promptAliases[modelId]?.[0] || 'prompt';
const payload: any = { [modelPromptField]: parameters.prompt };
```

### Format Conversion Example (Runware)
```typescript
// Convert our enum to provider enum
const qualityMap = { 'hd': 'ultra', 'high': 'high' };
const providerQuality = qualityMap[parameters.quality] || 'standard';
```

### Response Normalization Example
```typescript
// Convert provider response to our format
return {
  output_data: new Uint8Array(await imageResponse.arrayBuffer()),
  file_extension: contentType.includes('png') ? 'png' : 'jpg',
  file_size: imageResponse.headers.get('content-length'),
  metadata: { provider: 'runware', model_used: response.model }
};
```

## Maintenance Guidelines

1. **Update Schema First**: When adding parameters, update model schema THEN provider adapter
2. **Document Mappings**: Keep prompt aliases and field mappings documented
3. **Test End-to-End**: Always test with actual model schema from registry
4. **Version APIs**: Document provider API versions used (for future upgrades)
5. **Monitor Costs**: Track how parameters affect API costs per provider

## Related Documentation

- Model Registry: `src/lib/models/locked/README.md`
- Validation Schemas: `supabase/functions/_shared/jsonb-validation-schemas.ts`
- Security Layers: `supabase/functions/kie-ai-webhook/security/`
- ADR 007: Locked Model Registry System

---

**Remember**: Providers are dumb transport layers. Intelligence lives in the model schemas. Keep it that way.
