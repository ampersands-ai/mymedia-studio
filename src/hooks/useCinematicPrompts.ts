import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getSurpriseMePrompt as getHardcodedPrompt } from "@/data/surpriseMePrompts";
import { logger } from "@/lib/logger";

type CreationType = 'image_editing' | 'prompt_to_image' | 'prompt_to_video' | 'image_to_video' | 'video_to_video' | 'lip_sync' | 'prompt_to_audio';

/**
 * Calculate current day of year (1-365/366)
 * More efficient than redundant Date constructors
 */
function getDayOfYear(): number {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - startOfYear.getTime();
  return Math.floor(diff / 86400000);
}

/**
 * Map creation types to database categories
 */
const categoryMap: Record<CreationType, string> = {
  'image_editing': 'image_editing',
  'prompt_to_image': 'text_to_image',
  'prompt_to_video': 'text_to_video',
  'image_to_video': 'image_to_video',
  'video_to_video': 'video_to_video',
  'lip_sync': 'lip_sync',
  'prompt_to_audio': 'text_to_audio'
};

/**
 * Fetch cinematic prompts from database
 */
export const useCinematicPrompts = () => {
  return useQuery({
    queryKey: ['cinematic-prompts'],
    queryFn: async () => {
      // Query the public view which is pre-ordered by quality_score
      // and excludes internal metrics (quality_score, use_count)
      const { data, error } = await supabase
        .from('cinematic_prompts_public')
        .select('*');

      if (error) {
        logger.error('Error fetching cinematic prompts', error);
        return [];
      }
      
      return data || [];
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  });
};

/**
 * Get a random surprise me prompt from database or fallback to hardcoded
 */
export const getSurpriseMePromptFromDb = (
  creationType: CreationType,
  dbPrompts: Array<{ prompt: string | null; category: string | null }> | undefined
): string => {
  // If no database prompts, use hardcoded fallback
  if (!dbPrompts || dbPrompts.length === 0) {
    return getHardcodedPrompt(creationType);
  }

  // Filter prompts by category (handle null values)
  const category = categoryMap[creationType];
  const filteredPrompts = dbPrompts.filter(
    (p): p is { prompt: string; category: string } => 
      p.prompt !== null && p.category !== null && p.category === category
  );
  
  // If no prompts for this category, use hardcoded fallback
  if (filteredPrompts.length === 0) {
    return getHardcodedPrompt(creationType);
  }

  // Select a random prompt with some consistency (day-based + random offset)
  const dayOfYear = getDayOfYear();
  const randomOffset = Math.floor(Math.random() * 30);
  const index = (dayOfYear * 7 + randomOffset) % filteredPrompts.length;

  return filteredPrompts[index].prompt;
};
