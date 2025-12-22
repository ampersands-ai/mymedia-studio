import React, { useEffect } from 'react';
import { useAnimationEditor } from './hooks/useAnimationEditor';
import { EditorCanvas } from './EditorCanvas';
import { EditorToolbar } from './EditorToolbar';
import { EditorTimeline } from './EditorTimeline';
import { PropertyPanel } from './PropertyPanel';
import { ScenePanel } from './ScenePanel';
import { CaptionPanel } from './CaptionPanel';
import { injectAnimationStyles } from '../primitives';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { VideoInstructions } from './types';

interface AnimationEditorProps {
  initialProject?: VideoInstructions;
  onSave?: (project: VideoInstructions) => void;
}

export const AnimationEditor: React.FC<AnimationEditorProps> = ({
  initialProject,
  onSave,
}) => {
  const editor = useAnimationEditor(initialProject);

  // Inject animation CSS on mount
  useEffect(() => {
    injectAnimationStyles();
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Space - play/pause
      if (e.code === 'Space') {
        e.preventDefault();
        editor.togglePlay();
      }

      // Delete/Backspace - delete selected element
      if ((e.code === 'Delete' || e.code === 'Backspace') && editor.selectedElementId) {
        e.preventDefault();
        editor.deleteElement(editor.selectedElementId);
      }

      // Ctrl+Z - undo
      if (e.ctrlKey && e.code === 'KeyZ' && !e.shiftKey) {
        e.preventDefault();
        editor.undo();
      }

      // Ctrl+Shift+Z or Ctrl+Y - redo
      if ((e.ctrlKey && e.shiftKey && e.code === 'KeyZ') || (e.ctrlKey && e.code === 'KeyY')) {
        e.preventDefault();
        editor.redo();
      }

      // G - toggle grid
      if (e.code === 'KeyG' && !e.ctrlKey) {
        e.preventDefault();
        editor.toggleGrid();
      }

      // D - duplicate element
      if (e.code === 'KeyD' && e.ctrlKey && editor.selectedElementId) {
        e.preventDefault();
        editor.duplicateElement(editor.selectedElementId);
      }

      // Escape - deselect
      if (e.code === 'Escape') {
        editor.selectElement(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editor]);

  // Save callback - exposed for parent to use via Ctrl+S
  useEffect(() => {
    if (!onSave) return;
    
    const handleSaveShortcut = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.code === 'KeyS') {
        e.preventDefault();
        onSave(editor.project);
      }
    };
    window.addEventListener('keydown', handleSaveShortcut);
    return () => window.removeEventListener('keydown', handleSaveShortcut);
  }, [editor.project, onSave]);

  const sceneStartTime = editor.selectedSceneId 
    ? editor.sceneStartTimes.get(editor.selectedSceneId) || 0 
    : 0;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Toolbar */}
      <EditorToolbar
        mode={editor.mode}
        isPlaying={editor.isPlaying}
        currentTime={editor.currentTime}
        totalDuration={editor.totalDuration}
        zoom={editor.settings.zoom}
        showGrid={editor.settings.showGrid}
        snapToGrid={editor.settings.snapToGrid}
        canUndo={editor.canUndo}
        canRedo={editor.canRedo}
        onModeToggle={editor.toggleMode}
        onPlay={editor.play}
        onPause={editor.pause}
        onRestart={editor.restart}
        onSeek={editor.seek}
        onAddElement={editor.addElement}
        onUndo={editor.undo}
        onRedo={editor.redo}
        onToggleGrid={editor.toggleGrid}
        onToggleSnap={editor.toggleSnap}
        onZoomChange={editor.setZoom}
      />

      {/* Main content */}
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* Left Panel - Scene List */}
        <ResizablePanel defaultSize={18} minSize={15} maxSize={25}>
          <ScenePanel
            scenes={editor.project.scenes}
            selectedSceneId={editor.selectedSceneId}
            onSelectScene={editor.selectScene}
            onAddScene={editor.addScene}
            onDeleteScene={editor.deleteScene}
            onDuplicateScene={editor.duplicateScene}
            onUpdateScene={editor.updateScene}
            onUpdateBackground={editor.updateBackground}
          />
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Center - Canvas + Timeline */}
        <ResizablePanel defaultSize={57}>
          <div className="flex flex-col h-full">
            {/* Canvas area */}
            <div className="flex-1 min-h-0">
              {editor.selectedScene ? (
                <EditorCanvas
                  scene={editor.selectedScene}
                  currentTime={editor.currentTime}
                  sceneStartTime={sceneStartTime}
                  selectedElementId={editor.selectedElementId}
                  mode={editor.mode}
                  zoom={editor.settings.zoom}
                  showGrid={editor.settings.showGrid}
                  snapToGrid={editor.settings.snapToGrid}
                  gridSize={editor.settings.gridSize}
                  onSelectElement={editor.selectElement}
                  onUpdateElement={editor.updateElement}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Select or create a scene to start editing
                </div>
              )}
            </div>

            {/* Timeline */}
            <EditorTimeline
              scenes={editor.project.scenes}
              currentTime={editor.currentTime}
              totalDuration={editor.totalDuration}
              selectedSceneId={editor.selectedSceneId}
              selectedElementId={editor.selectedElementId}
              isPlaying={editor.isPlaying}
              onSeek={editor.seek}
              onPlay={editor.play}
              onPause={editor.pause}
              onRestart={editor.restart}
              onSelectScene={editor.selectScene}
              onSelectElement={editor.selectElement}
              onUpdateElement={editor.updateElement}
            />
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Right Panel - Properties/Captions */}
        <ResizablePanel defaultSize={25} minSize={20} maxSize={35}>
          <Tabs defaultValue="properties" className="h-full flex flex-col">
            <TabsList className="w-full justify-start rounded-none border-b">
              <TabsTrigger value="properties">Properties</TabsTrigger>
              <TabsTrigger value="captions">Captions</TabsTrigger>
            </TabsList>
            <TabsContent value="properties" className="flex-1 m-0">
              <PropertyPanel
                element={editor.selectedElement}
                sceneDuration={editor.selectedScene?.duration || 5}
                onUpdate={(updates) => {
                  if (editor.selectedElementId) {
                    editor.updateElement(editor.selectedElementId, updates);
                  }
                }}
                onDelete={() => {
                  if (editor.selectedElementId) {
                    editor.deleteElement(editor.selectedElementId);
                  }
                }}
                onDuplicate={() => {
                  if (editor.selectedElementId) {
                    editor.duplicateElement(editor.selectedElementId);
                  }
                }}
              />
            </TabsContent>
            <TabsContent value="captions" className="flex-1 m-0">
              <CaptionPanel
                caption={editor.selectedScene?.caption}
                sceneDuration={editor.selectedScene?.duration || 5}
                onUpdate={editor.updateCaption}
              />
            </TabsContent>
          </Tabs>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};
