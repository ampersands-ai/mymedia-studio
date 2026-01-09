import { Film, Image, Music, Plus, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useVideoEditorStore } from '../store';
import { useVideoEditorAssets } from '../hooks/useVideoEditorAssets';
import { MediaAsset } from '../types';
import { cn } from '@/lib/utils';

const formatDuration = (seconds?: number) => {
  if (!seconds) return '';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const formatSize = (bytes: number) => {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const MediaIcon = ({ type }: { type: MediaAsset['type'] }) => {
  switch (type) {
    case 'video': return <Film className="h-4 w-4" />;
    case 'image': return <Image className="h-4 w-4" />;
    case 'audio': return <Music className="h-4 w-4" />;
  }
};

export const MediaLibrary = () => {
  const { addClipFromAsset, setAudioTrack, addAsset } = useVideoEditorStore();
  const { 
    assets, 
    isLoading, 
    deleteAsset, 
    isDeletingAsset,
    clearAllAssets,
    isClearingAssets
  } = useVideoEditorAssets();

  const handleAddToSequence = (asset: MediaAsset) => {
    // First add asset to store so clips can reference it
    addAsset(asset);
    
    if (asset.type === 'audio') {
      setAudioTrack({
        id: crypto.randomUUID(),
        assetId: asset.id,
        asset,
        volume: 0.5,
        fadeIn: true,
        fadeOut: true,
        fadeInDuration: 1,
        fadeOutDuration: 1,
        trimStart: 0,
        loop: false,
      });
    } else {
      addClipFromAsset(asset.id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading media...</span>
      </div>
    );
  }

  if (assets.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No media uploaded yet</p>
        <p className="text-xs mt-1">Upload videos, images, or audio above</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button
          size="sm"
          variant="outline"
          onClick={() => clearAllAssets()}
          disabled={isClearingAssets}
          className="text-destructive hover:text-destructive"
        >
          {isClearingAssets ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4 mr-2" />
          )}
          Clear All
        </Button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {assets.map((asset: MediaAsset) => (
        <div
          key={asset.id}
          className="group relative bg-card border border-border rounded-lg overflow-hidden"
        >
          {/* Thumbnail */}
          <div className="aspect-video bg-muted flex items-center justify-center">
            {asset.thumbnailUrl ? (
              <img
                src={asset.thumbnailUrl}
                alt={asset.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <MediaIcon type={asset.type} />
            )}
          </div>

          {/* Type badge */}
          <div className={cn(
            "absolute top-2 left-2 px-2 py-0.5 rounded text-xs font-medium",
            asset.type === 'video' && "bg-blue-500/80 text-white",
            asset.type === 'image' && "bg-green-500/80 text-white",
            asset.type === 'audio' && "bg-purple-500/80 text-white",
          )}>
            {asset.type}
          </div>

          {/* Duration badge */}
          {asset.duration && (
            <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-black/60 text-white text-xs">
              {formatDuration(asset.duration)}
            </div>
          )}

          {/* Info + Always visible Add button */}
          <div className="p-2 flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" title={asset.name}>
                {asset.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatSize(asset.size)}
              </p>
            </div>
            <Button
              size="sm"
              variant="secondary"
              className="shrink-0"
              onClick={() => handleAddToSequence(asset)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Delete button on hover */}
          <div className="absolute top-2 right-10 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="icon"
              variant="destructive"
              className="h-7 w-7"
              onClick={() => deleteAsset(asset.id)}
              disabled={isDeletingAsset}
            >
              {isDeletingAsset ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Trash2 className="h-3 w-3" />
              )}
            </Button>
          </div>
        </div>
      ))}
      </div>
    </div>
  );
};
