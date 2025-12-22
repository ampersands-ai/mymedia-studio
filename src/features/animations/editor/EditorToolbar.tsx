import React from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Toggle } from '@/components/ui/toggle';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Play,
  Pause,
  RotateCcw,
  Undo2,
  Redo2,
  Grid3X3,
  Magnet,
  Eye,
  Edit3,
  Type,
  Smile,
  Square,
  Hash,
  Image,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { ElementType } from './types';


interface EditorToolbarProps {
  mode: 'edit' | 'preview';
  isPlaying: boolean;
  currentTime: number;
  totalDuration: number;
  zoom: number;
  showGrid: boolean;
  snapToGrid: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onModeToggle: () => void;
  onPlay: () => void;
  onPause: () => void;
  onRestart: () => void;
  onSeek: (time: number) => void;
  onAddElement: (type: ElementType) => void;
  onUndo: () => void;
  onRedo: () => void;
  onToggleGrid: () => void;
  onToggleSnap: () => void;
  onZoomChange: (zoom: number) => void;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  mode,
  isPlaying,
  currentTime,
  totalDuration,
  zoom,
  showGrid,
  snapToGrid,
  canUndo,
  canRedo,
  onModeToggle,
  onPlay,
  onPause,
  onRestart,
  onSeek,
  onAddElement,
  onUndo,
  onRedo,
  onToggleGrid,
  onToggleSnap,
  onZoomChange,
}) => {
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms}`;
  };

  return (
    <div className="flex items-center gap-2 p-2 bg-card border-b">
      {/* Mode Toggle */}
      <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
        <Button
          variant={mode === 'edit' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={mode === 'preview' ? onModeToggle : undefined}
          className="gap-1"
        >
          <Edit3 className="h-4 w-4" />
          Edit
        </Button>
        <Button
          variant={mode === 'preview' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={mode === 'edit' ? onModeToggle : undefined}
          className="gap-1"
        >
          <Eye className="h-4 w-4" />
          Preview
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Playback Controls */}
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={onRestart}>
              <RotateCcw className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Restart</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={isPlaying ? onPause : onPlay}
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{isPlaying ? 'Pause' : 'Play'} (Space)</TooltipContent>
        </Tooltip>
      </div>

      {/* Time Scrubber */}
      <div className="flex items-center gap-2 flex-1 max-w-md">
        <span className="text-xs font-mono text-muted-foreground w-16">
          {formatTime(currentTime)}
        </span>
        <Slider
          value={[currentTime]}
          min={0}
          max={totalDuration || 1}
          step={0.1}
          onValueChange={([v]) => onSeek(v)}
          className="flex-1"
        />
        <span className="text-xs font-mono text-muted-foreground w-16">
          {formatTime(totalDuration)}
        </span>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Add Elements (Edit mode only) */}
      {mode === 'edit' && (
        <>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => onAddElement('emoji')}>
                  <Smile className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Add Emoji</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => onAddElement('text')}>
                  <Type className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Add Text</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => onAddElement('shape')}>
                  <Square className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Add Shape</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => onAddElement('counter')}>
                  <Hash className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Add Counter</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => onAddElement('image')}>
                  <Image className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Add Image</TooltipContent>
            </Tooltip>
          </div>

          <Separator orientation="vertical" className="h-6" />
        </>
      )}

      {/* Undo/Redo */}
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onUndo}
              disabled={!canUndo}
            >
              <Undo2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Undo (Ctrl+Z)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onRedo}
              disabled={!canRedo}
            >
              <Redo2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Redo (Ctrl+Shift+Z)</TooltipContent>
        </Tooltip>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Grid/Snap Controls */}
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Toggle 
              pressed={showGrid} 
              onPressedChange={onToggleGrid}
              size="sm"
            >
              <Grid3X3 className="h-4 w-4" />
            </Toggle>
          </TooltipTrigger>
          <TooltipContent>Toggle Grid (G)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Toggle 
              pressed={snapToGrid} 
              onPressedChange={onToggleSnap}
              size="sm"
            >
              <Magnet className="h-4 w-4" />
            </Toggle>
          </TooltipTrigger>
          <TooltipContent>Snap to Grid</TooltipContent>
        </Tooltip>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Zoom Controls */}
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => onZoomChange(zoom - 0.25)}
              disabled={zoom <= 0.25}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Zoom Out</TooltipContent>
        </Tooltip>

        <span className="text-xs font-mono w-12 text-center">
          {Math.round(zoom * 100)}%
        </span>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => onZoomChange(zoom + 0.25)}
              disabled={zoom >= 2}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Zoom In</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
};
