import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { MODEL_METADATA, modelExists } from "../_shared/model-metadata.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Sync Model Pages Edge Function
 * 
 * Checks all model pages and unpublishes any that have inactive models.
 * This ensures pages for disabled models are automatically hidden.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Starting model pages sync...");

    // Fetch all model pages
    const { data: modelPages, error: fetchError } = await supabase
      .from("model_pages")
      .select("id, model_name, model_record_id, model_record_ids, is_published");

    if (fetchError) {
      throw new Error(`Failed to fetch model pages: ${fetchError.message}`);
    }

    console.log(`Found ${modelPages?.length || 0} model pages to check`);

    const updates: { id: string; unpublished: boolean; reason: string }[] = [];
    const stillActive: string[] = [];

    for (const page of modelPages || []) {
      // Get all record IDs to check (from both old and new columns)
      const recordIds: string[] = [];
      
      if (page.model_record_id) {
        recordIds.push(page.model_record_id);
      }
      
      if (page.model_record_ids && Array.isArray(page.model_record_ids)) {
        recordIds.push(...page.model_record_ids);
      }

      // Remove duplicates
      const uniqueRecordIds = [...new Set(recordIds)];

      if (uniqueRecordIds.length === 0) {
        console.log(`Skipping ${page.model_name}: No record IDs found`);
        continue;
      }

      // Check if ALL models are active
      let allModelsActive = true;
      let inactiveModelId = "";

      for (const recordId of uniqueRecordIds) {
        const metadata = MODEL_METADATA[recordId];
        
        if (!metadata) {
          console.log(`Model ${recordId} not found in registry`);
          allModelsActive = false;
          inactiveModelId = recordId;
          break;
        }

        if (!metadata.isActive) {
          console.log(`Model ${recordId} is inactive`);
          allModelsActive = false;
          inactiveModelId = recordId;
          break;
        }
      }

      // Unpublish if any model is inactive
      if (!allModelsActive && page.is_published) {
        const { error: updateError } = await supabase
          .from("model_pages")
          .update({ is_published: false })
          .eq("id", page.id);

        if (updateError) {
          console.error(`Failed to unpublish ${page.model_name}: ${updateError.message}`);
        } else {
          updates.push({
            id: page.id,
            unpublished: true,
            reason: `Linked model ${inactiveModelId} is inactive`,
          });
          console.log(`Unpublished: ${page.model_name}`);
        }
      } else if (allModelsActive) {
        stillActive.push(page.model_name);
      }
    }

    console.log(`Sync complete. ${updates.length} pages unpublished, ${stillActive.length} pages still active`);

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          total_checked: modelPages?.length || 0,
          unpublished: updates.length,
          still_active: stillActive.length,
        },
        updates,
        active_pages: stillActive,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error syncing model pages:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
