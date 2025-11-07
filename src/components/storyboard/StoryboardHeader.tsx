/**
 * Storyboard Header Component
 * Simple header showing scene count and estimated duration
 */

interface StoryboardHeaderProps {
  sceneCount: number;
  estimatedDuration: number;
}

/**
 * Header bar with storyboard metadata
 */
export const StoryboardHeader = ({
  sceneCount,
  estimatedDuration,
}: StoryboardHeaderProps) => {
  return (
    <div className="flex items-center justify-between">
      <div className="text-sm text-muted-foreground">
        {sceneCount} scenes • ~{estimatedDuration}s video
      </div>
    </div>
  );
};
