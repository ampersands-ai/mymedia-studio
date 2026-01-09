import { useCallback, useState } from 'react';
import { Upload, Film, Image, Music, Sparkles, Loader2, ChevronDown } from 'lucide-react';
import { useMediaUpload } from '../hooks/useMediaUpload';
import { MAX_FILE_SIZE_MB, MAX_FILES } from '../types';
import { useVideoEditorAssets } from '../hooks/useVideoEditorAssets';
import { useRecentGenerations } from '../hooks/useRecentGenerations';
import { cn } from '@/lib/utils';

export const MediaUploader = () => {
  const { uploadFiles, isUploading, uploadProgress } = useMediaUpload();
  const { assets, addAssetFromUrl } = useVideoEditorAssets();
  const { generations, isLoading: isLoadingGenerations } = useRecentGenerations(24);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(6);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files.length > 0) {
      uploadFiles(e.dataTransfer.files, assets.length);
    }
  }, [uploadFiles, assets.length]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      uploadFiles(e.target.files, assets.length);
      e.target.value = '';
    }
  }, [uploadFiles, assets.length]);

  const handleAddGeneration = useCallback(async (gen: typeof generations[0]) => {
    if (!gen.fullUrl || addingId) return;
    
    setAddingId(gen.id);
    try {
      await addAssetFromUrl(gen.fullUrl, gen.type, gen.prompt.slice(0, 50) || 'Generation');
    } finally {
      setAddingId(null);
    }
  }, [addAssetFromUrl, addingId]);

  const remainingSlots = MAX_FILES - assets.length;

  // Filter generations that aren't already added
  const availableGenerations = generations.filter(
    gen => gen.fullUrl && !assets.some((a: { url: string }) => a.url === gen.fullUrl)
  );

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className={cn(
          "relative border-2 border-dashed rounded-xl p-8 text-center transition-all",
          "hover:border-primary/50 hover:bg-primary/5",
          isUploading ? "border-primary bg-primary/10" : "border-border"
        )}
      >
        <input
          type="file"
          multiple
          accept="video/*,image/*,audio/*"
          onChange={handleFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={isUploading || remainingSlots <= 0}
        />
        
        <div className="flex justify-center gap-4 mb-4">
          <div className="p-3 rounded-full bg-blue-500/10">
            <Film className="h-6 w-6 text-blue-500" />
          </div>
          <div className="p-3 rounded-full bg-green-500/10">
            <Image className="h-6 w-6 text-green-500" />
          </div>
          <div className="p-3 rounded-full bg-purple-500/10">
            <Music className="h-6 w-6 text-purple-500" />
          </div>
        </div>

        {isUploading ? (
          <div className="space-y-2">
            <p className="text-foreground font-medium">Uploading...</p>
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-sm text-muted-foreground">{uploadProgress}%</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-center gap-2 mb-2">
              <Upload className="h-5 w-5 text-muted-foreground" />
              <p className="text-foreground font-medium">
                Drop files here or click to upload
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              Video, images, or audio • Max {MAX_FILE_SIZE_MB}MB each • {remainingSlots} slots remaining
            </p>
          </>
        )}
      </div>

      {/* Recent generations suggestions */}
      {availableGenerations.length > 0 && remainingSlots > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4 text-primary-orange" />
            <span>Recent generations</span>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {availableGenerations.slice(0, visibleCount).map((gen) => (
              <button
                key={gen.id}
                onClick={() => handleAddGeneration(gen)}
                disabled={!!addingId}
                className={cn(
                  "relative aspect-square rounded-lg overflow-hidden border-2 border-transparent",
                  "hover:border-primary-orange/50 hover:scale-105 transition-all duration-200",
                  "focus:outline-none focus:ring-2 focus:ring-primary-orange/50",
                  "group cursor-pointer",
                  addingId === gen.id && "opacity-50"
                )}
              >
                {gen.type === 'video' ? (
                  <video
                    src={gen.fullUrl || undefined}
                    className="w-full h-full object-cover"
                    muted
                    playsInline
                  />
                ) : (
                  <img
                    src={gen.fullUrl || undefined}
                    alt={gen.prompt.slice(0, 30)}
                    className="w-full h-full object-cover"
                  />
                )}
                
                {/* Overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  {addingId === gen.id ? (
                    <Loader2 className="h-5 w-5 text-white animate-spin" />
                  ) : (
                    <span className="text-white text-xs font-medium">+ Add</span>
                  )}
                </div>
                
                {/* Type badge */}
                <div className="absolute top-1 right-1 p-1 rounded bg-black/60">
                  {gen.type === 'video' ? (
                    <Film className="h-3 w-3 text-white" />
                  ) : (
                    <Image className="h-3 w-3 text-white" />
                  )}
                </div>
              </button>
            ))}
          </div>
          
          {/* Show more button */}
          {availableGenerations.length > visibleCount && (
            <button
              onClick={() => setVisibleCount(prev => Math.min(prev + 6, availableGenerations.length))}
              className="w-full py-2 text-sm text-muted-foreground hover:text-foreground border border-dashed border-border rounded-lg hover:border-primary/50 transition-colors flex items-center justify-center gap-2"
            >
              <ChevronDown className="h-4 w-4" />
              Show more ({availableGenerations.length - visibleCount} remaining)
            </button>
          )}
        </div>
      )}

      {/* Loading state for generations */}
      {isLoadingGenerations && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading recent generations...</span>
        </div>
      )}
    </div>
  );
};
