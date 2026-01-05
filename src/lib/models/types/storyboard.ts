/**
 * Storyboard Types for Model Defaults
 * 
 * These types define the context and defaults for storyboard-specific
 * generation parameters. Each model file exports a getStoryboardDefaults()
 * function that returns exactly the parameters needed for that provider.
 */

/**
 * Context passed to getStoryboardDefaults() functions
 */
export interface StoryboardContext {
  /** The prompt/description for the generation */
  prompt: string;
  
  /** Aspect ratio from storyboard settings (e.g., "16:9", "9:16") */
  aspectRatio?: string | null;
  
  /** Input image URL for animation (I2V models only) */
  inputImage?: string | null;
  
  /** Duration in seconds (for video models) */
  duration?: number;
  
  /** Next scene's image URL for end-frame transitions */
  nextSceneImage?: string | null;
  
  /** Whether to connect to next scene (use next scene image as end frame) */
  connectToNextScene?: boolean;
}

/**
 * Return type for getStoryboardDefaults() - exact provider-ready parameters
 */
export type StoryboardDefaults = Record<string, unknown>;

/**
 * Function signature for model storyboard defaults
 */
export type GetStoryboardDefaultsFn = (ctx: StoryboardContext) => StoryboardDefaults;
