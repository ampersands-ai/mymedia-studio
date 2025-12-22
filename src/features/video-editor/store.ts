import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { 
  VideoEditorState, 
  MediaAsset, 
  Clip, 
  AudioTrack, 
  SubtitleConfig, 
  OutputSettings,
  RenderStatus,
  CREDITS_PER_SECOND,
  ShotstackPayload,
  ShotstackTrack,
  TransitionType,
  ASPECT_RATIO_DIMENSIONS
} from './types';

interface VideoEditorActions {
  // Media assets
  addAsset: (asset: MediaAsset) => void;
  removeAsset: (assetId: string) => void;
  clearAssets: () => void;
  
  // Clips
  addClipFromAsset: (assetId: string) => void;
  removeClip: (clipId: string) => void;
  updateClip: (clipId: string, updates: Partial<Clip>) => void;
  reorderClips: (fromIndex: number, toIndex: number) => void;
  selectClip: (clipId: string | null) => void;
  clearClips: () => void;
  
  // Audio
  setAudioTrack: (track: AudioTrack | null) => void;
  updateAudioTrack: (updates: Partial<AudioTrack>) => void;
  
  // Subtitles
  updateSubtitleConfig: (updates: Partial<SubtitleConfig>) => void;
  
  // Output settings
  updateOutputSettings: (updates: Partial<OutputSettings>) => void;
  
  // Render state
  setRenderStatus: (status: RenderStatus) => void;
  setRenderProgress: (progress: number) => void;
  setCurrentJobId: (jobId: string | null) => void;
  setFinalVideoUrl: (url: string | null) => void;
  setErrorMessage: (message: string | null) => void;
  
  // Upload state
  setIsUploading: (uploading: boolean) => void;
  setUploadProgress: (progress: number) => void;
  
  // Computed
  getTotalDuration: () => number;
  getEstimatedCredits: () => number;
  buildShotstackPayload: () => ShotstackPayload;
  
  // Reset
  resetEditor: () => void;
}

const defaultSubtitleConfig: SubtitleConfig = {
  mode: 'none',
  fontSize: 24,
  fontColor: '#FFFFFF',
  backgroundColor: '#000000',
  showBackground: true,
  position: 'bottom',
};

const defaultOutputSettings: OutputSettings = {
  aspectRatio: '16:9',
  format: 'mp4',
  backgroundColor: '#000000',
  fps: 30,
  quality: 'hd',
};

const initialState: VideoEditorState = {
  assets: [],
  clips: [],
  audioTrack: null,
  subtitleConfig: defaultSubtitleConfig,
  outputSettings: defaultOutputSettings,
  currentJobId: null,
  renderStatus: 'idle',
  renderProgress: 0,
  finalVideoUrl: null,
  errorMessage: null,
  selectedClipId: null,
  isUploading: false,
  uploadProgress: 0,
};

// Helper to map transition type to Shotstack transition name
const mapTransition = (transition?: TransitionType): string | undefined => {
  if (!transition || transition === 'none') return undefined;
  
  const transitionMap: Record<TransitionType, string> = {
    none: '',
    fade: 'fade',
    fadeToBlack: 'fadeBlack',
    fadeToWhite: 'fadeWhite',
    slideLeft: 'slideLeft',
    slideRight: 'slideRight',
    slideUp: 'slideUp',
    slideDown: 'slideDown',
    zoom: 'zoom',
    wipeLeft: 'wipeLeft',
    wipeRight: 'wipeRight',
  };
  
  return transitionMap[transition];
};

export const useVideoEditorStore = create<VideoEditorState & VideoEditorActions>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,
        
        // Media assets
        addAsset: (asset) => set((state) => ({
          assets: [...state.assets, asset]
        })),
        
        removeAsset: (assetId) => set((state) => ({
          assets: state.assets.filter(a => a.id !== assetId),
          clips: state.clips.filter(c => c.assetId !== assetId),
          audioTrack: state.audioTrack?.assetId === assetId ? null : state.audioTrack,
        })),
        
        clearAssets: () => set({ assets: [], clips: [], audioTrack: null }),
        
        // Clips
        addClipFromAsset: (assetId) => {
          const state = get();
          const asset = state.assets.find(a => a.id === assetId);
          if (!asset || asset.type === 'audio') return;
          
          const newClip: Clip = {
            id: crypto.randomUUID(),
            assetId,
            asset,
            duration: asset.type === 'video' ? (asset.duration || 5) : 5,
            trimStart: 0,
            transitionIn: 'fade',
            transitionOut: 'fade',
            transitionDuration: 0.5,
            volume: 1,
            fit: 'cover',
            position: { x: 0.5, y: 0.5 },
            scale: 1,
          };
          
          set((state) => ({
            clips: [...state.clips, newClip]
          }));
        },
        
        removeClip: (clipId) => set((state) => ({
          clips: state.clips.filter(c => c.id !== clipId),
          selectedClipId: state.selectedClipId === clipId ? null : state.selectedClipId,
        })),
        
        updateClip: (clipId, updates) => set((state) => ({
          clips: state.clips.map(c => 
            c.id === clipId ? { ...c, ...updates } : c
          )
        })),
        
        reorderClips: (fromIndex, toIndex) => set((state) => {
          const clips = [...state.clips];
          const [removed] = clips.splice(fromIndex, 1);
          clips.splice(toIndex, 0, removed);
          return { clips };
        }),
        
        selectClip: (clipId) => set({ selectedClipId: clipId }),
        
        clearClips: () => set({ clips: [], selectedClipId: null }),
        
        // Audio
        setAudioTrack: (track) => set({ audioTrack: track }),
        
        updateAudioTrack: (updates) => set((state) => ({
          audioTrack: state.audioTrack ? { ...state.audioTrack, ...updates } : null
        })),
        
        // Subtitles
        updateSubtitleConfig: (updates) => set((state) => ({
          subtitleConfig: { ...state.subtitleConfig, ...updates }
        })),
        
        // Output settings
        updateOutputSettings: (updates) => set((state) => ({
          outputSettings: { ...state.outputSettings, ...updates }
        })),
        
        // Render state
        setRenderStatus: (status) => set({ renderStatus: status }),
        setRenderProgress: (progress) => set({ renderProgress: progress }),
        setCurrentJobId: (jobId) => set({ currentJobId: jobId }),
        setFinalVideoUrl: (url) => set({ finalVideoUrl: url }),
        setErrorMessage: (message) => set({ errorMessage: message }),
        
        // Upload state
        setIsUploading: (uploading) => set({ isUploading: uploading }),
        setUploadProgress: (progress) => set({ uploadProgress: progress }),
        
        // Computed
        getTotalDuration: () => {
          const state = get();
          return state.clips.reduce((total, clip) => total + clip.duration, 0);
        },
        
        getEstimatedCredits: () => {
          const state = get();
          const totalDuration = state.clips.reduce((total, clip) => total + clip.duration, 0);
          return Math.ceil(totalDuration * CREDITS_PER_SECOND * 10) / 10; // Round to 1 decimal
        },
        
        buildShotstackPayload: () => {
          const state = get();
          const { clips, audioTrack, outputSettings } = state;
          
          // Build video/image track
          let currentTime = 0;
          const mainTrack: ShotstackTrack = {
            clips: clips.map((clip) => {
              const asset = state.assets.find(a => a.id === clip.assetId);
              if (!asset) throw new Error(`Asset not found: ${clip.assetId}`);
              
              // Build asset object - only include volume for video assets (not images)
              const assetObj: any = {
                type: asset.type as 'video' | 'image',
                src: asset.url,
              };
              
              // Only add volume and trim for video assets (images don't support these)
              if (asset.type === 'video') {
                assetObj.volume = clip.volume;
                if (clip.trimStart > 0) {
                  assetObj.trim = clip.trimStart;
                }
              }
              
              const shotstackClip = {
                asset: assetObj,
                start: currentTime,
                length: clip.duration,
                transition: {
                  in: mapTransition(clip.transitionIn),
                  out: mapTransition(clip.transitionOut),
                },
                fit: clip.fit,
                scale: clip.scale !== 1 ? clip.scale : undefined,
              };
              
              currentTime += clip.duration;
              return shotstackClip;
            }),
          };
          
          const timeline: any = {
            tracks: [mainTrack],
            background: outputSettings.backgroundColor,
          };
          
          // Add soundtrack if present
          if (audioTrack) {
            const audioAsset = state.assets.find(a => a.id === audioTrack.assetId);
            if (audioAsset) {
              timeline.soundtrack = {
                src: audioAsset.url,
                volume: audioTrack.volume,
                effect: audioTrack.fadeIn && audioTrack.fadeOut 
                  ? 'fadeInFadeOut' 
                  : audioTrack.fadeIn 
                    ? 'fadeIn' 
                    : audioTrack.fadeOut 
                      ? 'fadeOut' 
                      : undefined,
              };
            }
          }
          
          const dimensions = ASPECT_RATIO_DIMENSIONS[outputSettings.aspectRatio];
          
          return {
            timeline,
            output: {
              format: 'mp4' as const,
              aspectRatio: outputSettings.aspectRatio.replace(':', ':'),
              fps: outputSettings.fps,
              size: dimensions, // Use size only, not resolution (they are mutually exclusive in Shotstack)
            },
          };
        },
        
        // Reset
        resetEditor: () => set(initialState),
      }),
      {
        name: 'video-editor-storage',
        partialize: (state) => ({
          // Only persist output settings and subtitle config
          outputSettings: state.outputSettings,
          subtitleConfig: state.subtitleConfig,
        }),
      }
    ),
    { name: 'VideoEditorStore' }
  )
);
