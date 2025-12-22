import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useVideoEditorStore } from '../store';
import { Clip } from '../types';
import { cn } from '@/lib/utils';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

const SortableClip = ({ clip, index }: { clip: Clip; index: number }) => {
  const { removeClip, selectClip, selectedClipId, assets } = useVideoEditorStore();
  const asset = assets.find(a => a.id === clip.assetId);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: clip.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-3 p-3 bg-card border rounded-lg",
        isDragging && "opacity-50",
        selectedClipId === clip.id && "ring-2 ring-primary"
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>

      <div className="w-16 h-10 bg-muted rounded overflow-hidden flex-shrink-0">
        {asset?.thumbnailUrl ? (
          <img src={asset.thumbnailUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
            {index + 1}
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{asset?.name || 'Unknown'}</p>
        <p className="text-xs text-muted-foreground">
          {clip.duration.toFixed(1)}s
          {clip.transitionIn && clip.transitionIn !== 'none' && ` • ${clip.transitionIn}`}
        </p>
      </div>

      <Button
        size="icon"
        variant="ghost"
        onClick={() => selectClip(selectedClipId === clip.id ? null : clip.id)}
      >
        <Settings className="h-4 w-4" />
      </Button>

      <Button
        size="icon"
        variant="ghost"
        onClick={() => removeClip(clip.id)}
      >
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  );
};

export const ClipList = () => {
  const { clips, assets, reorderClips } = useVideoEditorStore();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = clips.findIndex(c => c.id === active.id);
      const newIndex = clips.findIndex(c => c.id === over.id);
      reorderClips(oldIndex, newIndex);
    }
  };

  if (clips.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
        <p>No clips added yet</p>
        <p className="text-sm">
          {assets.length > 0 
            ? `You have ${assets.length} asset(s) in your library. Go to "Upload Media" tab to add them.`
            : 'Upload media to get started'}
        </p>
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={clips.map(c => c.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {clips.map((clip, index) => (
            <SortableClip key={clip.id} clip={clip} index={index} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
};
