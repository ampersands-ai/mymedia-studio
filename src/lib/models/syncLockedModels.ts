/**
 * DEPRECATED: Locked model sync disabled
 * ai_models table removed - fully file-based system now
 */

export interface LockedModelSyncData {
  recordId: string;
  modelId: string;
  modelName: string;
  filePath: string;
  content: string;
  groups: any;
}

export async function fetchLockedModelsForSync(): Promise<LockedModelSyncData[]> {
  console.warn('fetchLockedModelsForSync: ai_models table removed');
  return [];
}
