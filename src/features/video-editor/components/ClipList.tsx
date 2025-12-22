import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { useVideoEditorStore } from '../store';
import { Clip, TransitionType } from '../types';
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

const TRANSITIONS: { value: TransitionType; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'fade', label: 'Fade' },
  { value: 'fadeToBlack', label: 'Fade to Black' },
  { value: 'fadeToWhite', label: 'Fade to White' },
  { value: 'slideLeft', label: 'Slide Left' },
  { value: 'slideRight', label: 'Slide Right' },
  { value: 'slideUp', label: 'Slide Up' },
  { value: 'slideDown', label: 'Slide Down' },
  { value: 'zoom', label: 'Zoom' },
  { value: 'wipeLeft', label: 'Wipe Left' },
  { value: 'wipeRight', label: 'Wipe Right' },
];

const FIT_OPTIONS: { value: Clip['fit']; label: string }[] = [
  { value: 'cover', label: 'Cover' },
  { value: 'contain', label: 'Contain' },
  { value: 'crop', label: 'Crop' },
  { value: 'none', label: 'None' },
];

const SortableClip = ({ clip, index }: { clip: Clip; index: number }) => {
  const { removeClip, selectClip, selectedClipId, assets, updateClip } = useVideoEditorStore();
  const asset = assets.find(a => a.id === clip.assetId);
  const isExpanded = selectedClipId === clip.id;

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

  const maxTrimStart = asset?.type === 'video' && asset.duration 
    ? Math.max(0, asset.duration - clip.duration) 
    : 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "bg-card border rounded-lg overflow-hidden",
        isDragging && "opacity-50",
        isExpanded && "ring-2 ring-primary"
      )}
    >
      {/* Clip Row */}
      <div className="flex items-center gap-3 p-3">
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
          onClick={() => selectClip(isExpanded ? null : clip.id)}
          className={cn(isExpanded && "bg-muted")}
        >
          <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
        </Button>

        <Button
          size="icon"
          variant="ghost"
          onClick={() => removeClip(clip.id)}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>

      {/* Inline Settings Accordion */}
      <Collapsible open={isExpanded}>
        <CollapsibleContent className="border-t bg-muted/30">
          <div className="p-4 space-y-4">
            {/* Duration */}
            <div className="space-y-2">
              <Label className="text-sm">Duration: {clip.duration.toFixed(1)}s</Label>
              <Slider
                value={[clip.duration]}
                min={0.5}
                max={30}
                step={0.1}
                onValueChange={([value]) => updateClip(clip.id, { duration: value })}
              />
            </div>

            {/* Trim Start (for videos) */}
            {asset?.type === 'video' && maxTrimStart > 0 && (
              <div className="space-y-2">
                <Label className="text-sm">Trim Start: {(clip.trimStart || 0).toFixed(1)}s</Label>
                <Slider
                  value={[clip.trimStart || 0]}
                  min={0}
                  max={maxTrimStart}
                  step={0.1}
                  onValueChange={([value]) => updateClip(clip.id, { trimStart: value })}
                />
              </div>
            )}

            {/* Volume (for videos) */}
            {asset?.type === 'video' && (
              <div className="space-y-2">
                <Label className="text-sm">Volume: {Math.round((clip.volume ?? 1) * 100)}%</Label>
                <Slider
                  value={[clip.volume ?? 1]}
                  min={0}
                  max={1}
                  step={0.05}
                  onValueChange={([value]) => updateClip(clip.id, { volume: value })}
                />
              </div>
            )}

            {/* Transitions */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm">Transition In</Label>
                <Select
                  value={clip.transitionIn || 'none'}
                  onValueChange={(value) => updateClip(clip.id, { transitionIn: value as TransitionType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TRANSITIONS.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Transition Out</Label>
                <Select
                  value={clip.transitionOut || 'none'}
                  onValueChange={(value) => updateClip(clip.id, { transitionOut: value as TransitionType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TRANSITIONS.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Fit Mode & Scale */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm">Fit Mode</Label>
                <Select
                  value={clip.fit || 'cover'}
                  onValueChange={(value) => updateClip(clip.id, { fit: value as Clip['fit'] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FIT_OPTIONS.map(f => (
                      <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Scale: {(clip.scale ?? 1).toFixed(2)}x</Label>
                <Slider
                  value={[clip.scale ?? 1]}
                  min={0.5}
                  max={2}
                  step={0.05}
                  onValueChange={([value]) => updateClip(clip.id, { scale: value })}
                />
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
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
