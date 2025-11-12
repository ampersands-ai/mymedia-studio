import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

export async function failStuckVideoJobs() {
  const videoJobIds = [
    '765f873b-38fb-47df-8926-6faa0126c8d5', // Diderot Effect
    '2612ad69-873e-495c-824f-e0466745d800', // Invisible Ink
    '1aafa413-dfed-49ca-ab9c-eedcb3303ec1'  // Invisible Labor
  ];

  const { data, error } = await supabase.functions.invoke('manual-fail-video-jobs', {
    body: { video_job_ids: videoJobIds }
  });

  if (error) {
    logger.error('Failed to manually fail video jobs', error as Error, {
      component: 'failStuckVideoJobs',
      operation: 'invoke',
      videoJobIds
    });
    return { success: false, error };
  }

  logger.info('Successfully failed stuck video jobs', {
    component: 'failStuckVideoJobs',
    operation: 'invoke',
    data
  });
  return { success: true, data };
}

// Auto-execute
failStuckVideoJobs();
