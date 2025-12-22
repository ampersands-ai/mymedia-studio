import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useUndoRedo } from './useUndoRedo';
import {
  VideoInstructions,
  SceneInstruction,
  ElementInstruction,
  CaptionInstruction,
  BackgroundInstruction,
  ElementType,
  createDefaultElement,
  createDefaultScene,
  DEFAULT_CAPTION,
} from '../types';

interface EditorSettings {
  zoom: number;
  showGrid: boolean;
  snapToGrid: boolean;
  gridSize: number;
}

interface UseAnimationEditorReturn {
  // Project state
  project: VideoInstructions;
  
  // Selection
  selectedSceneId: string | null;
  selectedElementId: string | null;
  selectedScene: SceneInstruction | null;
  selectedElement: ElementInstruction | null;
  
  // Playback
  isPlaying: boolean;
  currentTime: number;
  mode: 'edit' | 'preview';
  
  // Settings
  settings: EditorSettings;
  
  // Computed
  totalDuration: number;
  sceneStartTimes: Map<string, number>;
  
  // History
  canUndo: boolean;
  canRedo: boolean;
  
  // Actions
  setProject: (project: VideoInstructions) => void;
  selectScene: (sceneId: string | null) => void;
  selectElement: (elementId: string | null) => void;
  
  // Scene operations
  addScene: () => void;
  deleteScene: (sceneId: string) => void;
  updateScene: (sceneId: string, updates: Partial<SceneInstruction>) => void;
  duplicateScene: (sceneId: string) => void;
  reorderScenes: (fromIndex: number, toIndex: number) => void;
  
  // Element operations
  addElement: (type: ElementType) => void;
  deleteElement: (elementId: string) => void;
  updateElement: (elementId: string, updates: Partial<ElementInstruction>) => void;
  duplicateElement: (elementId: string) => void;
  
  // Background operations
  updateBackground: (updates: Partial<BackgroundInstruction>) => void;
  
  // Caption operations
  updateCaption: (updates: Partial<CaptionInstruction>) => void;
  importCaptionTimestamps: (words: Array<{ word: string; start: number; end: number }>) => void;
  
  // Playback controls
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  seek: (time: number) => void;
  restart: () => void;
  
  // Mode
  setMode: (mode: 'edit' | 'preview') => void;
  toggleMode: () => void;
  
  // Settings
  setZoom: (zoom: number) => void;
  toggleGrid: () => void;
  toggleSnap: () => void;
  setGridSize: (size: number) => void;
  
  // History
  undo: () => void;
  redo: () => void;
}

const createInitialProject = (): VideoInstructions => ({
  name: 'Untitled Project',
  scenes: [createDefaultScene(crypto.randomUUID(), 'Scene 1')],
  width: 1920,
  height: 1080,
  fps: 30,
});

export function useAnimationEditor(
  initialProject?: VideoInstructions
): UseAnimationEditorReturn {
  // Core state with undo/redo
  const [project, { set: setProjectWithHistory, undo, redo, canUndo, canRedo, reset }] = 
    useUndoRedo<VideoInstructions>(initialProject || createInitialProject());
  
  // Selection state
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(
    project.scenes[0]?.id || null
  );
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  
  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  
  // Settings
  const [settings, setSettings] = useState<EditorSettings>({
    zoom: 1,
    showGrid: true,
    snapToGrid: true,
    gridSize: 20,
  });
  
  // Animation frame ref
  const animationFrameRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);

  // Computed values
  const totalDuration = useMemo(() => 
    project.scenes.reduce((sum, scene) => sum + scene.duration, 0),
    [project.scenes]
  );

  const sceneStartTimes = useMemo(() => {
    const map = new Map<string, number>();
    let time = 0;
    for (const scene of project.scenes) {
      map.set(scene.id, time);
      time += scene.duration;
    }
    return map;
  }, [project.scenes]);

  const selectedScene = useMemo(() => 
    project.scenes.find(s => s.id === selectedSceneId) || null,
    [project.scenes, selectedSceneId]
  );

  const selectedElement = useMemo(() => 
    selectedScene?.elements.find(e => e.id === selectedElementId) || null,
    [selectedScene, selectedElementId]
  );

  // Playback loop
  useEffect(() => {
    if (!isPlaying) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      return;
    }

    lastTimeRef.current = performance.now();

    const animate = (timestamp: number) => {
      const delta = (timestamp - lastTimeRef.current) / 1000;
      lastTimeRef.current = timestamp;

      setCurrentTime(prev => {
        const next = prev + delta;
        if (next >= totalDuration) {
          setIsPlaying(false);
          return 0;
        }
        return next;
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, totalDuration]);

  // Update selected scene based on current time during playback
  useEffect(() => {
    if (!isPlaying && mode !== 'preview') return;
    
    let accumulatedTime = 0;
    for (const scene of project.scenes) {
      if (currentTime >= accumulatedTime && currentTime < accumulatedTime + scene.duration) {
        if (selectedSceneId !== scene.id) {
          setSelectedSceneId(scene.id);
        }
        break;
      }
      accumulatedTime += scene.duration;
    }
  }, [currentTime, isPlaying, mode, project.scenes, selectedSceneId]);

  // Actions
  const setProject = useCallback((newProject: VideoInstructions) => {
    reset(newProject);
    setSelectedSceneId(newProject.scenes[0]?.id || null);
    setSelectedElementId(null);
  }, [reset]);

  const selectScene = useCallback((sceneId: string | null) => {
    setSelectedSceneId(sceneId);
    setSelectedElementId(null);
  }, []);

  const selectElement = useCallback((elementId: string | null) => {
    setSelectedElementId(elementId);
  }, []);

  // Scene operations
  const addScene = useCallback(() => {
    const newScene = createDefaultScene(
      crypto.randomUUID(),
      `Scene ${project.scenes.length + 1}`
    );
    setProjectWithHistory({
      ...project,
      scenes: [...project.scenes, newScene],
    });
    setSelectedSceneId(newScene.id);
    setSelectedElementId(null);
  }, [project, setProjectWithHistory]);

  const deleteScene = useCallback((sceneId: string) => {
    if (project.scenes.length <= 1) return;
    
    const newScenes = project.scenes.filter(s => s.id !== sceneId);
    setProjectWithHistory({ ...project, scenes: newScenes });
    
    if (selectedSceneId === sceneId) {
      setSelectedSceneId(newScenes[0]?.id || null);
      setSelectedElementId(null);
    }
  }, [project, selectedSceneId, setProjectWithHistory]);

  const updateScene = useCallback((sceneId: string, updates: Partial<SceneInstruction>) => {
    setProjectWithHistory({
      ...project,
      scenes: project.scenes.map(s => 
        s.id === sceneId ? { ...s, ...updates } : s
      ),
    });
  }, [project, setProjectWithHistory]);

  const duplicateScene = useCallback((sceneId: string) => {
    const scene = project.scenes.find(s => s.id === sceneId);
    if (!scene) return;
    
    const newScene: SceneInstruction = {
      ...scene,
      id: crypto.randomUUID(),
      name: `${scene.name} (Copy)`,
      elements: scene.elements.map(e => ({ ...e, id: crypto.randomUUID() })),
    };
    
    const index = project.scenes.findIndex(s => s.id === sceneId);
    const newScenes = [...project.scenes];
    newScenes.splice(index + 1, 0, newScene);
    
    setProjectWithHistory({ ...project, scenes: newScenes });
    setSelectedSceneId(newScene.id);
  }, [project, setProjectWithHistory]);

  const reorderScenes = useCallback((fromIndex: number, toIndex: number) => {
    const newScenes = [...project.scenes];
    const [removed] = newScenes.splice(fromIndex, 1);
    newScenes.splice(toIndex, 0, removed);
    setProjectWithHistory({ ...project, scenes: newScenes });
  }, [project, setProjectWithHistory]);

  // Element operations
  const addElement = useCallback((type: ElementType) => {
    if (!selectedSceneId) return;
    
    const newElement = createDefaultElement(type, crypto.randomUUID());
    
    setProjectWithHistory({
      ...project,
      scenes: project.scenes.map(s => 
        s.id === selectedSceneId
          ? { ...s, elements: [...s.elements, newElement] }
          : s
      ),
    });
    setSelectedElementId(newElement.id);
  }, [project, selectedSceneId, setProjectWithHistory]);

  const deleteElement = useCallback((elementId: string) => {
    if (!selectedSceneId) return;
    
    setProjectWithHistory({
      ...project,
      scenes: project.scenes.map(s => 
        s.id === selectedSceneId
          ? { ...s, elements: s.elements.filter(e => e.id !== elementId) }
          : s
      ),
    });
    
    if (selectedElementId === elementId) {
      setSelectedElementId(null);
    }
  }, [project, selectedSceneId, selectedElementId, setProjectWithHistory]);

  const updateElement = useCallback((elementId: string, updates: Partial<ElementInstruction>) => {
    if (!selectedSceneId) return;
    
    setProjectWithHistory({
      ...project,
      scenes: project.scenes.map(s => 
        s.id === selectedSceneId
          ? {
              ...s,
              elements: s.elements.map(e => 
                e.id === elementId ? { ...e, ...updates } : e
              ),
            }
          : s
      ),
    });
  }, [project, selectedSceneId, setProjectWithHistory]);

  const duplicateElement = useCallback((elementId: string) => {
    if (!selectedSceneId) return;
    
    const scene = project.scenes.find(s => s.id === selectedSceneId);
    const element = scene?.elements.find(e => e.id === elementId);
    if (!element) return;
    
    const newElement: ElementInstruction = {
      ...element,
      id: crypto.randomUUID(),
      x: Math.min(element.x + 5, 95),
      y: Math.min(element.y + 5, 95),
    };
    
    setProjectWithHistory({
      ...project,
      scenes: project.scenes.map(s => 
        s.id === selectedSceneId
          ? { ...s, elements: [...s.elements, newElement] }
          : s
      ),
    });
    setSelectedElementId(newElement.id);
  }, [project, selectedSceneId, setProjectWithHistory]);

  // Background operations
  const updateBackground = useCallback((updates: Partial<BackgroundInstruction>) => {
    if (!selectedSceneId) return;
    
    setProjectWithHistory({
      ...project,
      scenes: project.scenes.map(s => 
        s.id === selectedSceneId
          ? { ...s, background: { ...s.background, ...updates } }
          : s
      ),
    });
  }, [project, selectedSceneId, setProjectWithHistory]);

  // Caption operations
  const updateCaption = useCallback((updates: Partial<CaptionInstruction>) => {
    if (!selectedSceneId) return;
    
    const scene = project.scenes.find(s => s.id === selectedSceneId);
    const currentCaption = scene?.caption || DEFAULT_CAPTION;
    
    setProjectWithHistory({
      ...project,
      scenes: project.scenes.map(s => 
        s.id === selectedSceneId
          ? { ...s, caption: { ...currentCaption, ...updates } }
          : s
      ),
    });
  }, [project, selectedSceneId, setProjectWithHistory]);

  const importCaptionTimestamps = useCallback((
    words: Array<{ word: string; start: number; end: number }>
  ) => {
    if (!selectedSceneId) return;
    
    const scene = project.scenes.find(s => s.id === selectedSceneId);
    const currentCaption = scene?.caption || DEFAULT_CAPTION;
    const sceneStart = sceneStartTimes.get(selectedSceneId) || 0;
    
    const captionWords = words.map((w) => ({
      id: crypto.randomUUID(),
      word: w.word,
      start: w.start - sceneStart,
      end: w.end - sceneStart,
    }));
    
    setProjectWithHistory({
      ...project,
      scenes: project.scenes.map(s => 
        s.id === selectedSceneId
          ? { ...s, caption: { ...currentCaption, words: captionWords } }
          : s
      ),
    });
  }, [project, selectedSceneId, sceneStartTimes, setProjectWithHistory]);

  // Playback controls
  const play = useCallback(() => setIsPlaying(true), []);
  const pause = useCallback(() => setIsPlaying(false), []);
  const togglePlay = useCallback(() => setIsPlaying(p => !p), []);
  const seek = useCallback((time: number) => {
    setCurrentTime(Math.max(0, Math.min(time, totalDuration)));
  }, [totalDuration]);
  const restart = useCallback(() => {
    setCurrentTime(0);
    setIsPlaying(true);
  }, []);

  // Mode
  const toggleMode = useCallback(() => {
    setMode(m => m === 'edit' ? 'preview' : 'edit');
  }, []);

  // Settings
  const setZoom = useCallback((zoom: number) => {
    setSettings(s => ({ ...s, zoom: Math.max(0.25, Math.min(2, zoom)) }));
  }, []);
  
  const toggleGrid = useCallback(() => {
    setSettings(s => ({ ...s, showGrid: !s.showGrid }));
  }, []);
  
  const toggleSnap = useCallback(() => {
    setSettings(s => ({ ...s, snapToGrid: !s.snapToGrid }));
  }, []);
  
  const setGridSize = useCallback((size: number) => {
    setSettings(s => ({ ...s, gridSize: size }));
  }, []);

  return {
    project,
    selectedSceneId,
    selectedElementId,
    selectedScene,
    selectedElement,
    isPlaying,
    currentTime,
    mode,
    settings,
    totalDuration,
    sceneStartTimes,
    canUndo,
    canRedo,
    setProject,
    selectScene,
    selectElement,
    addScene,
    deleteScene,
    updateScene,
    duplicateScene,
    reorderScenes,
    addElement,
    deleteElement,
    updateElement,
    duplicateElement,
    updateBackground,
    updateCaption,
    importCaptionTimestamps,
    play,
    pause,
    togglePlay,
    seek,
    restart,
    setMode,
    toggleMode,
    setZoom,
    toggleGrid,
    toggleSnap,
    setGridSize,
    undo,
    redo,
  };
}
