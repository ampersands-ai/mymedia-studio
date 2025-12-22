import React, { useRef, useCallback, useState } from 'react';
import { SceneInstruction, ElementInstruction } from './types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Play, Pause, SkipBack, ZoomIn, ZoomOut } from 'lucide-react';

interface EditorTimelineProps {
  scenes: SceneInstruction[];
  currentTime: number;
  totalDuration: number;
  selectedSceneId: string | null;
  selectedElementId: string | null;
  isPlaying: boolean;
  onSeek: (time: number) => void;
  onPlay: () => void;
  onPause: () => void;
  onRestart: () => void;
  onSelectScene: (sceneId: string) => void;
  onSelectElement: (elementId: string | null) => void;
  onUpdateElement: (elementId: string, updates: Partial<ElementInstruction>) => void;
}

export const EditorTimeline: React.FC<EditorTimelineProps> = ({
  scenes,
  currentTime,
  totalDuration,
  selectedSceneId,
  selectedElementId,
  isPlaying,
  onSeek,
  onPlay,
  onPause,
  onRestart,
  onSelectScene,
  onSelectElement,
  onUpdateElement,
}) => {
  const timelineRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1); // pixels per second
  const [isDragging, setIsDragging] = useState(false);
  const [dragType, setDragType] = useState<'scrubber' | 'element-start' | 'element-end' | 'element-move' | null>(null);
  const [dragData, setDragData] = useState<{ elementId: string; sceneId: string; initialValue: number } | null>(null);

  const pixelsPerSecond = 80 * zoom;
  const timelineWidth = totalDuration * pixelsPerSecond;

  // Calculate scene start times
  const sceneStartTimes = React.useMemo(() => {
    const map = new Map<string, number>();
    let time = 0;
    for (const scene of scenes) {
      map.set(scene.id, time);
      time += scene.duration;
    }
    return map;
  }, [scenes]);

  const handleTimelineClick = useCallback((e: React.MouseEvent) => {
    if (!timelineRef.current || dragType) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const scrollLeft = timelineRef.current.scrollLeft;
    const x = e.clientX - rect.left + scrollLeft;
    const time = x / pixelsPerSecond;
    onSeek(Math.max(0, Math.min(time, totalDuration)));
  }, [pixelsPerSecond, totalDuration, onSeek, dragType]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !timelineRef.current) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const scrollLeft = timelineRef.current.scrollLeft;
    const x = e.clientX - rect.left + scrollLeft;
    const time = Math.max(0, Math.min(x / pixelsPerSecond, totalDuration));

    if (dragType === 'scrubber') {
      onSeek(time);
    } else if (dragType && dragData) {
      const scene = scenes.find(s => s.id === dragData.sceneId);
      if (!scene) return;

      const sceneStart = sceneStartTimes.get(dragData.sceneId) || 0;
      const localTime = time - sceneStart;
      const clampedTime = Math.max(0, Math.min(localTime, scene.duration));

      if (dragType === 'element-start') {
        onUpdateElement(dragData.elementId, { enterAt: clampedTime });
      } else if (dragType === 'element-end') {
        onUpdateElement(dragData.elementId, { exitAt: clampedTime });
      }
    }
  }, [isDragging, dragType, dragData, pixelsPerSecond, totalDuration, onSeek, onUpdateElement, scenes, sceneStartTimes]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragType(null);
    setDragData(null);
  }, []);

  const handleScrubberMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDragging(true);
    setDragType('scrubber');
  }, []);

  const handleElementEdgeMouseDown = useCallback((
    e: React.MouseEvent,
    elementId: string,
    sceneId: string,
    type: 'element-start' | 'element-end',
    initialValue: number
  ) => {
    e.stopPropagation();
    setIsDragging(true);
    setDragType(type);
    setDragData({ elementId, sceneId, initialValue });
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms}`;
  };

  const renderTimeRuler = () => {
    const markers = [];
    const interval = zoom >= 1.5 ? 0.5 : zoom >= 0.75 ? 1 : 2;
    
    for (let t = 0; t <= totalDuration; t += interval) {
      const x = t * pixelsPerSecond;
      const isMajor = t % (interval * 2) === 0;
      
      markers.push(
        <div
          key={t}
          className="absolute top-0 flex flex-col items-center"
          style={{ left: x }}
        >
          <div 
            className={cn(
              'w-px bg-muted-foreground/30',
              isMajor ? 'h-4' : 'h-2'
            )}
          />
          {isMajor && (
            <span className="text-[10px] text-muted-foreground mt-0.5">
              {formatTime(t)}
            </span>
          )}
        </div>
      );
    }
    return markers;
  };

  const renderScenes = () => {
    return scenes.map((scene) => {
      const sceneStart = sceneStartTimes.get(scene.id) || 0;
      const sceneWidth = scene.duration * pixelsPerSecond;
      const x = sceneStart * pixelsPerSecond;

      return (
        <div
          key={scene.id}
          className={cn(
            'absolute top-0 bottom-0 border-r border-border cursor-pointer',
            selectedSceneId === scene.id && 'bg-primary/5'
          )}
          style={{ left: x, width: sceneWidth }}
          onClick={(e) => {
            e.stopPropagation();
            onSelectScene(scene.id);
          }}
        >
          {/* Scene header */}
          <div 
            className={cn(
              'h-6 px-2 text-xs font-medium truncate flex items-center border-b',
              selectedSceneId === scene.id 
                ? 'bg-primary/20 text-primary' 
                : 'bg-muted/50 text-muted-foreground'
            )}
          >
            {scene.name}
          </div>

          {/* Element bars */}
          <div className="relative flex-1">
            {scene.elements.map((element, index) => {
              const elementStart = element.enterAt * pixelsPerSecond;
              const elementEnd = element.exitAt * pixelsPerSecond;
              const elementWidth = elementEnd - elementStart;
              const isSelected = element.id === selectedElementId;

              return (
                <div
                  key={element.id}
                  className={cn(
                    'absolute h-5 rounded-sm cursor-pointer transition-all',
                    isSelected 
                      ? 'bg-primary ring-2 ring-primary ring-offset-1 ring-offset-background z-10' 
                      : 'bg-secondary hover:bg-secondary/80'
                  )}
                  style={{
                    left: elementStart,
                    width: Math.max(elementWidth, 20),
                    top: 8 + index * 24,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectElement(element.id);
                  }}
                >
                  {/* Element label */}
                  <div className="px-1 text-[10px] truncate text-foreground">
                    {element.type === 'emoji' ? element.content : element.type}
                  </div>

                  {/* Resize handles */}
                  {isSelected && (
                    <>
                      <div
                        className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-primary-foreground/20"
                        onMouseDown={(e) => handleElementEdgeMouseDown(e, element.id, scene.id, 'element-start', element.enterAt)}
                      />
                      <div
                        className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-primary-foreground/20"
                        onMouseDown={(e) => handleElementEdgeMouseDown(e, element.id, scene.id, 'element-end', element.exitAt)}
                      />
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );
    });
  };

  return (
    <div 
      className="flex flex-col border-t bg-card"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Controls */}
      <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/30">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onRestart}
        >
          <SkipBack className="h-4 w-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={isPlaying ? onPause : onPlay}
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>

        <div className="text-xs font-mono text-muted-foreground min-w-[80px]">
          {formatTime(currentTime)} / {formatTime(totalDuration)}
        </div>

        <div className="flex-1" />

        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => setZoom(z => Math.max(0.25, z - 0.25))}
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        
        <span className="text-xs text-muted-foreground w-12 text-center">
          {Math.round(zoom * 100)}%
        </span>
        
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => setZoom(z => Math.min(3, z + 0.25))}
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
      </div>

      {/* Timeline */}
      <div 
        ref={timelineRef}
        className="relative h-40 overflow-x-auto overflow-y-hidden cursor-crosshair"
        onClick={handleTimelineClick}
      >
        <div 
          className="relative h-full"
          style={{ width: timelineWidth + 100 }}
        >
          {/* Time ruler */}
          <div className="h-6 relative border-b bg-muted/20">
            {renderTimeRuler()}
          </div>

          {/* Scenes and elements */}
          <div className="relative" style={{ height: 'calc(100% - 24px)' }}>
            {renderScenes()}
          </div>

          {/* Playhead / Scrubber */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-destructive z-20 cursor-ew-resize"
            style={{ left: currentTime * pixelsPerSecond }}
            onMouseDown={handleScrubberMouseDown}
          >
            {/* Playhead handle */}
            <div className="absolute -top-1 -left-2 w-4 h-4 bg-destructive rotate-45 transform" />
          </div>
        </div>
      </div>
    </div>
  );
};