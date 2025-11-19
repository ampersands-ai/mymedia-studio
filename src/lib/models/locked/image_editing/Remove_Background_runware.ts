/** Remove Background runware (image_editing) - Record: d2f8b5e4-3a9c-4c72-8f61-2e4d9a7b6c3f */

export const MODEL_CONFIG = { modelId: "runware:110@1", recordId: "d1d8b152-e123-4375-8f55-c0d0a699009b", modelName: "Remove Background", provider: "runware", contentType: "image", baseCreditCost: 0.06, estimatedTimeSeconds: 15, costMultipliers: {}, apiEndpoint: "https://api.runware.ai/v1", payloadStructure: "flat", maxImages: 1, defaultOutputs: 1 } as const;

export const SCHEMA = { imageInputField: "inputImage", properties: { includeCost: { default: true, showToUser: false, type: "boolean" }, inputImage: { renderer: "image", type: "string" }, outputFormat: { default: "PNG", enum: ["PNG", "JPEG", "WEBP"], type: "string" }, outputType: { default: ["URL"], items: { format: "uri", type: "string" }, showToUser: false, type: "array" }, taskType: { default: "imageBackgroundRemoval", showToUser: false, type: "string" } }, required: ["inputImage"], type: "object" } as const;

export function validate(inputs: Record<string, any>) { return inputs.inputImage ? { valid: true } : { valid: false, error: "Image required" }; }
export function preparePayload(inputs: Record<string, any>) { return { taskType: "imageBackgroundRemoval", inputImage: inputs.inputImage, outputFormat: inputs.outputFormat || "PNG", outputType: ["URL"], includeCost: true }; }
export function calculateCost(inputs: Record<string, any>) { return MODEL_CONFIG.baseCreditCost; }

