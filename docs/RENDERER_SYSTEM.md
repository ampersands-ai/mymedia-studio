# Explicit Renderer System

## Overview
Each parameter explicitly declares which specialized renderer it uses via the `renderer` property in its schema definition. **No heuristic detection or guessing occurs.**

## Available Renderers

| Renderer | Use For | Example Parameters |
|----------|---------|-------------------|
| `prompt` | Text prompts with enhancement features, character count, "Surprise Me" | `prompt`, `positive_prompt`, `text_input` |
| `image` | Image upload with preview, drag-and-drop, camera support | `inputImage`, `image_url`, `reference_image` |
| `voice` | Voice/speaker selection (ElevenLabs, Azure TTS) | `voice`, `speaker_id`, `voice_model` |
| `duration` | Time duration slider for audio/video length | `duration`, `length`, `time` |
| `increment` | Toggle for incremental generation | `increment` |
| `output-format` | Format selection with examples | `output_format`, `format` |
| `null` / omitted | Generic input (default) - SchemaInput component | All other parameters |

## Schema Example

```json
{
  "type": "object",
  "properties": {
    "prompt": {
      "type": "string",
      "title": "Enter Your Prompt",
      "description": "Describe what you want to create",
      "renderer": "prompt",
      "maxLength": 1000,
      "showToUser": true
    },
    "inputImage": {
      "type": "string",
      "title": "Upload Image",
      "description": "Reference image for generation",
      "renderer": "image",
      "format": "uri",
      "showToUser": true
    },
    "voice": {
      "type": "string",
      "title": "Voice Selection",
      "description": "Choose voice for audio generation",
      "renderer": "voice",
      "enum": ["voice1", "voice2"],
      "showToUser": true
    },
    "steps": {
      "type": "integer",
      "title": "Generation Steps",
      "description": "Number of diffusion steps",
      "minimum": 1,
      "maximum": 100,
      "default": 20,
      "showToUser": true
      // No renderer property = uses generic integer input (SchemaInput)
    }
  },
  "required": ["prompt"]
}
```

## Setting Renderers in Parameters Inspector

### For Admins/Developers:

1. Navigate to **Comprehensive Model Testing** page (`/admin/model-health/comprehensive-test`)
2. Select a model from the list
3. Click the **"Parameters"** tab
4. For each parameter, you'll see a **"Specialized Renderer"** dropdown in the card
5. Select the appropriate renderer:
   - **Default (Generic Input)** - Standard input based on parameter type
   - **Prompt Renderer** - For main text prompts with enhancements
   - **Image Uploader** - For image file uploads with preview
   - **Voice Selector** - For voice selection UI
   - **Duration Input** - For time duration sliders
   - **Increment Toggle** - For increment checkboxes
   - **Output Format** - For format selection sections
6. Click **"Push to Schema"** to save the changes to the database

## How It Works

### 1. Type Definitions (`src/types/schema.ts`, `src/types/model-schema.ts`)

```typescript
export interface JsonSchemaProperty {
  type: JsonSchemaType;
  title?: string;
  description?: string;
  // ... other properties
  
  // Explicit renderer assignment
  renderer?: 'prompt' | 'image' | 'voice' | 'duration' | 'increment' | 'output-format' | null;
}
```

### 2. Parameters Inspector (`ParameterMetadataCard`)

Each parameter card shows:
- Current renderer as a badge in the header
- Dropdown to select/change the renderer
- Immediate visual feedback

### 3. Input Panel Rendering (`InputPanel.tsx`)

The InputPanel reads each parameter's `renderer` property and renders the appropriate component:

```typescript
// Pseudo-code example
Object.entries(modelSchema.properties).forEach(([key, property]) => {
  switch (property.renderer) {
    case 'prompt':
      return <PromptInput {...props} />;
    case 'image':
      return <ImageUploadSection {...props} />;
    case 'voice':
      return <VoiceSelector {...props} />;
    case 'duration':
      return <DurationSlider {...props} />;
    // ... etc
    default:
      return <SchemaInput {...props} />; // Generic fallback
  }
});
```

**No heuristics. No keyword matching. Purely explicit configuration.**

## Benefits

✅ **100% Predictable** - No guessing which renderer applies to which field  
✅ **Clear Configuration** - Visual dropdown in admin UI  
✅ **Self-Documenting** - Schema clearly shows intent  
✅ **Easy Debugging** - No complex detection logic to trace  
✅ **Flexible** - Can change renderers without modifying code  
✅ **Maintainable** - Simple logic, easy to extend

## Migration from Old System

**Old system** (deprecated):
- Schema-level toggles: `usePromptRenderer`, `useImageRenderer`, etc.
- Heuristic field detection by name/keywords
- Hardcoded field lists

**New system** (current):
- Parameter-level `renderer` property
- Explicit configuration in Parameters Inspector
- Zero heuristics

If you have old schemas with the deprecated toggles, they will be ignored. You should:
1. Open the Parameters Inspector for each model
2. Manually set the `renderer` property for relevant parameters
3. Push changes to the schema

## Best Practices

1. **Use `null` (or omit renderer) for standard inputs** - Don't overcomplicate
2. **Be explicit** - Set renderer only when you want specialized UI
3. **Match renderer to parameter purpose**:
   - Main prompt field → `renderer: "prompt"`
   - Image upload field → `renderer: "image"`
   - Voice selection → `renderer: "voice"`
4. **Test after changes** - Verify the UI renders as expected
5. **Document in schema description** - Help users understand the field's purpose

## Troubleshooting

**Q: My parameter doesn't show the specialized renderer**  
A: Check that `renderer` is set correctly in the schema and pushed to the database

**Q: Can I have multiple parameters with the same renderer?**  
A: Yes! For example, you can have `positive_prompt` and `negative_prompt` both using `renderer: "prompt"`

**Q: What if I don't set a renderer?**  
A: The parameter will use the generic `SchemaInput` component, which renders based on the parameter's `type` (string → text input, integer → number input, boolean → switch, etc.)

**Q: Can I add a custom renderer?**  
A: Yes, but it requires code changes:
1. Add the new renderer type to the `JsonSchemaProperty` type definition
2. Update the Parameters Inspector dropdown
3. Add rendering logic in `InputPanel.tsx`
4. Create the new renderer component

## Example Use Cases

### Image Generation Model
```json
{
  "prompt": { "type": "string", "renderer": "prompt" },
  "inputImage": { "type": "string", "renderer": "image" },
  "steps": { "type": "integer" }, // No renderer = generic input
  "cfg_scale": { "type": "number", "isAdvanced": true } // Generic number input in advanced panel
}
```

### Audio Generation Model  
```json
{
  "text": { "type": "string", "renderer": "prompt" },
  "voice": { "type": "string", "renderer": "voice", "enum": [...voices] },
  "duration": { "type": "integer", "renderer": "duration" },
  "sample_rate": { "type": "integer", "isAdvanced": true }
}
```

### Video Generation Model
```json
{
  "prompt": { "type": "string", "renderer": "prompt" },
  "reference_image": { "type": "string", "renderer": "image" },
  "duration": { "type": "integer", "renderer": "duration" },
  "output_format": { "type": "string", "renderer": "output-format" },
  "fps": { "type": "integer" }, // Generic input
  "motion_intensity": { "type": "number", "isAdvanced": true }
}
```

---

**Remember: Explicit is better than implicit. Set the `renderer` property to get specialized UI, omit it for generic inputs.**
