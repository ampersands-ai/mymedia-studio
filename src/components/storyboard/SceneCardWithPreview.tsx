/**
 * Scene Card With Preview Component
 * Individual scene card wrapped with preview generator in grid layout
 */

import { SceneCard } from './SceneCard';
import { ScenePreviewGenerator } from './ScenePreviewGenerator';
import type { Scene } from '@/types/storyboard';

interface SceneCardWithPreviewProps {
  scene: Scene;
  sceneNumber: number;
  isActive: boolean;
  onUpdate: (sceneId: string, field: string, value: string) => void;
  onRegenerate: (sceneId: string) => void;
  onClick: () => void;
  onImageGenerated: (sceneId: string, imageUrl: string) => void;
  aspectRatio?: string | null;
  nextSceneImageUrl?: string | null;
}

/**
 * Grid wrapper for scene card and preview
 * Maintains lg:grid-cols-3 layout (2 cols for card, 1 col for preview)
 */
export const SceneCardWithPreview = ({
  scene,
  sceneNumber,
  isActive,
  onUpdate,
  onRegenerate,
  onClick,
  onImageGenerated,
  aspectRatio,
  nextSceneImageUrl,
}: SceneCardWithPreviewProps) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
      <div className="lg:col-span-2 h-full">
        <SceneCard
          scene={scene}
          sceneNumber={sceneNumber}
          isActive={isActive}
          onUpdate={onUpdate}
          onRegenerate={onRegenerate}
          onClick={onClick}
        />
      </div>
      <div className="lg:col-span-1 h-full">
        <ScenePreviewGenerator
          scene={scene}
          sceneNumber={sceneNumber}
          onImageGenerated={onImageGenerated}
          aspectRatio={aspectRatio}
          nextSceneImageUrl={nextSceneImageUrl}
        />
      </div>
    </div>
  );
};
