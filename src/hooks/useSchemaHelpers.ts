/**
 * Schema helper utilities as a hook for consistency
 * Re-exports utility functions from custom-creation-utils
 */
export {
  getSchemaRequiredFields,
  getImageFieldInfo,
  findPrimaryTextKey,
  findPrimaryVoiceKey,
  getMaxPromptLength,
  buildCustomParameters,
  validateGenerationInputs,
} from "@/lib/custom-creation-utils";
