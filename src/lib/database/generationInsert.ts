/**
 * Helper for inserting generations with proper typing
 * Workaround for Supabase types mismatch where user_id is required but not in Insert type
 */

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type GenerationInsert = Database['public']['Tables']['generations']['Insert'] & {
  user_id: string; // Override: user_id is required but missing from generated types
};

/**
 * Type-safe generation insert
 */
export async function insertGeneration(generation: GenerationInsert) {
  return await supabase
    .from("generations")
    .insert(generation as any) // Type assertion needed due to Supabase types mismatch
    .select()
    .single();
}
