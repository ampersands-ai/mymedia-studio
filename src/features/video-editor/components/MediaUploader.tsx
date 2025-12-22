import { useCallback } from 'react';
import { Upload, Film, Image, Music } from 'lucide-react';
import { useMediaUpload } from '../hooks/useMediaUpload';
import { MAX_FILE_SIZE_MB, MAX_FILES } from '../types';
import { useVideoEditorAssets } from '../hooks/useVideoEditorAssets';
import { cn } from '@/lib/utils';

export const MediaUploader = () => {
  const { uploadFiles, isUploading, uploadProgress } = useMediaUpload();
  const { assets } = useVideoEditorAssets();

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

  const remainingSlots = MAX_FILES - assets.length;

  return (
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
  );
};
