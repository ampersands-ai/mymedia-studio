// DEPRECATED: This file is only here temporarily to prevent build errors
// All models now use the execute-custom-model edge function for API key retrieval
// TODO: Remove all imports of this file from model files

export async function getRunwareApiKey(modelId: string, recordId: string): Promise<string> {
  throw new Error('DEPRECATED: Use execute-custom-model edge function instead');
}
