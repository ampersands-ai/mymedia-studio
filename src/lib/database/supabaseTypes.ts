/**
 * Supabase type extensions and workarounds
 * 
 * The auto-generated types.ts sometimes has mismatches with actual schema.
 * This file provides type-safe wrappers to handle these cases.
 */

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

/**
 * Extended generation insert type that includes user_id
 * (The auto-generated Insert type incorrectly excludes it)
 */
type GenerationInsertFixed = Omit<Database['public']['Tables']['generations']['Insert'], 'user_id'> & {
  user_id: string; // Required field missing from generated types
};

/**
 * Type-safe generation insert with workaround for Supabase types mismatch
 */
export async function insertGeneration(generation: GenerationInsertFixed) {
  return await supabase
    .from("generations")
    .insert(generation as any) // Type assertion required due to auto-generated types mismatch
    .select()
    .single();
}

/**
 * Direct insert with type assertion (for inline use)
 */
export function asGenerationInsert(data: GenerationInsertFixed): any {
  return data as any;
}
