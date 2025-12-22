import { useRef } from 'react';
import { Music, Upload, Trash2, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { useVideoEditorStore } from '../store';
import { useMediaUpload } from '../hooks/useMediaUpload';

export const AudioTrackPanel = () => {
  const { audioTrack, setAudioTrack, updateAudioTrack, assets } = useVideoEditorStore();
  const { uploadFiles, isUploading } = useMediaUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Upload the file - the hook will automatically set audio track for audio files
    await uploadFiles([file]);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAudioTrack = () => {
    setAudioTrack(null);
  };

  const audioAsset = audioTrack ? assets.find(a => a.id === audioTrack.assetId) : null;

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {!audioTrack ? (
        <Button
          variant="outline"
          className="w-full h-20 border-dashed"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          <div className="flex flex-col items-center gap-2">
            <Music className="h-6 w-6" />
            <span className="text-sm">
              {isUploading ? 'Uploading...' : 'Add Background Music'}
            </span>
          </div>
        </Button>
      ) : (
        <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
          {/* Audio file info */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded">
              <Music className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">
                {audioAsset?.name || 'Audio Track'}
              </p>
              {audioAsset?.duration && (
                <p className="text-xs text-muted-foreground">
                  {Math.floor(audioAsset.duration / 60)}:{Math.floor(audioAsset.duration % 60).toString().padStart(2, '0')}
                </p>
              )}
            </div>
            <Button size="icon" variant="ghost" onClick={removeAudioTrack}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>

          {/* Volume control */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm flex items-center gap-2">
                <Volume2 className="h-4 w-4" />
                Volume
              </Label>
              <span className="text-sm text-muted-foreground">
                {Math.round(audioTrack.volume * 100)}%
              </span>
            </div>
            <Slider
              value={[audioTrack.volume]}
              max={1}
              step={0.01}
              onValueChange={([value]) => updateAudioTrack({ volume: value })}
            />
          </div>

          {/* Fade controls */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="fadeIn" className="text-sm">Fade In</Label>
              <Switch
                id="fadeIn"
                checked={audioTrack.fadeIn}
                onCheckedChange={(checked) => updateAudioTrack({ fadeIn: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="fadeOut" className="text-sm">Fade Out</Label>
              <Switch
                id="fadeOut"
                checked={audioTrack.fadeOut}
                onCheckedChange={(checked) => updateAudioTrack({ fadeOut: checked })}
              />
            </div>
          </div>

          {/* Loop control */}
          <div className="flex items-center justify-between">
            <Label htmlFor="loop" className="text-sm">Loop Audio</Label>
            <Switch
              id="loop"
              checked={audioTrack.loop}
              onCheckedChange={(checked) => updateAudioTrack({ loop: checked })}
            />
          </div>

          {/* Replace button */}
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            <Upload className="h-4 w-4 mr-2" />
            Replace Audio
          </Button>
        </div>
      )}
    </div>
  );
};
