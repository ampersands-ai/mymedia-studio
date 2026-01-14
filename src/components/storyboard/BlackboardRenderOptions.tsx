import { useState, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { Music, ImageIcon, Video, Upload, X, Loader2, Volume2 } from 'lucide-react';
import { toast } from 'sonner';

export interface RenderOptions {
  backgroundAudioUrl?: string;
  backgroundAudioVolume: number;
  backgroundAudioFadeIn: boolean;
  backgroundAudioFadeOut: boolean;
  outroMediaUrl?: string;
  outroMediaType?: 'image' | 'video';
  outroDuration: number;
}

interface BlackboardRenderOptionsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRender: (options: RenderOptions) => void;
  isRendering: boolean;
}

const AUDIO_UPLOAD_CONFIG = {
  maxFileSize: 50 * 1024 * 1024, // 50MB
  validTypes: ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/aac', 'audio/m4a', 'audio/x-m4a'],
};

const MEDIA_UPLOAD_CONFIG = {
  maxFileSize: 100 * 1024 * 1024, // 100MB
  validImageTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  validVideoTypes: ['video/mp4', 'video/webm', 'video/quicktime'],
};

export function BlackboardRenderOptions({
  open,
  onOpenChange,
  onRender,
  isRendering,
}: BlackboardRenderOptionsProps) {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const [audioVolume, setAudioVolume] = useState(50);
  const [audioFadeIn, setAudioFadeIn] = useState(false);
  const [audioFadeOut, setAudioFadeOut] = useState(true);
  
  const [outroFile, setOutroFile] = useState<File | null>(null);
  const [outroPreviewUrl, setOutroPreviewUrl] = useState<string | null>(null);
  const [outroMediaType, setOutroMediaType] = useState<'image' | 'video' | null>(null);
  const [outroDuration, setOutroDuration] = useState(3);
  
  const [isUploading, setIsUploading] = useState(false);
  
  const audioInputRef = useRef<HTMLInputElement>(null);
  const outroInputRef = useRef<HTMLInputElement>(null);

  const handleAudioSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!AUDIO_UPLOAD_CONFIG.validTypes.includes(file.type)) {
      toast.error('Invalid audio format. Please use MP3, WAV, OGG, or AAC.');
      return;
    }
    
    if (file.size > AUDIO_UPLOAD_CONFIG.maxFileSize) {
      toast.error('Audio file too large. Maximum size is 50MB.');
      return;
    }
    
    setAudioFile(file);
    setAudioPreviewUrl(URL.createObjectURL(file));
  }, []);

  const handleOutroSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const isImage = MEDIA_UPLOAD_CONFIG.validImageTypes.includes(file.type);
    const isVideo = MEDIA_UPLOAD_CONFIG.validVideoTypes.includes(file.type);
    
    if (!isImage && !isVideo) {
      toast.error('Invalid format. Please use JPG, PNG, WebP, GIF, MP4, or WebM.');
      return;
    }
    
    if (file.size > MEDIA_UPLOAD_CONFIG.maxFileSize) {
      toast.error('File too large. Maximum size is 100MB.');
      return;
    }
    
    setOutroFile(file);
    setOutroPreviewUrl(URL.createObjectURL(file));
    setOutroMediaType(isImage ? 'image' : 'video');
  }, []);

  const removeAudio = useCallback(() => {
    if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl);
    setAudioFile(null);
    setAudioPreviewUrl(null);
    if (audioInputRef.current) audioInputRef.current.value = '';
  }, [audioPreviewUrl]);

  const removeOutro = useCallback(() => {
    if (outroPreviewUrl) URL.revokeObjectURL(outroPreviewUrl);
    setOutroFile(null);
    setOutroPreviewUrl(null);
    setOutroMediaType(null);
    if (outroInputRef.current) outroInputRef.current.value = '';
  }, [outroPreviewUrl]);

  const handleRender = async () => {
    setIsUploading(true);
    
    try {
      let uploadedAudioUrl: string | undefined;
      let uploadedOutroUrl: string | undefined;
      
      // Upload files to storage if present
      if (audioFile) {
        const { supabase } = await import('@/integrations/supabase/client');
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');
        
        const audioPath = `${user.id}/blackboard/audio/${Date.now()}_${audioFile.name}`;
        const { error: audioError } = await supabase.storage
          .from('generated-content')
          .upload(audioPath, audioFile, { upsert: true });
        
        if (audioError) throw audioError;
        
        const { data: audioUrlData } = await supabase.storage
          .from('generated-content')
          .createSignedUrl(audioPath, 60 * 60 * 24 * 7); // 7 days
        
        uploadedAudioUrl = audioUrlData?.signedUrl;
      }
      
      if (outroFile) {
        const { supabase } = await import('@/integrations/supabase/client');
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');
        
        const outroPath = `${user.id}/blackboard/outro/${Date.now()}_${outroFile.name}`;
        const { error: outroError } = await supabase.storage
          .from('generated-content')
          .upload(outroPath, outroFile, { upsert: true });
        
        if (outroError) throw outroError;
        
        const { data: outroUrlData } = await supabase.storage
          .from('generated-content')
          .createSignedUrl(outroPath, 60 * 60 * 24 * 7); // 7 days
        
        uploadedOutroUrl = outroUrlData?.signedUrl;
      }
      
      const options: RenderOptions = {
        backgroundAudioUrl: uploadedAudioUrl,
        backgroundAudioVolume: audioVolume / 100,
        backgroundAudioFadeIn: audioFadeIn,
        backgroundAudioFadeOut: audioFadeOut,
        outroMediaUrl: uploadedOutroUrl,
        outroMediaType: outroMediaType || undefined,
        outroDuration,
      };
      
      onRender(options);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload files. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSkipRender = () => {
    onRender({
      backgroundAudioVolume: 0.5,
      backgroundAudioFadeIn: false,
      backgroundAudioFadeOut: true,
      outroDuration: 3,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="w-5 h-5" />
            Render Options
          </DialogTitle>
          <DialogDescription>
            Optionally add background audio or an outro before rendering.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Background Audio Section */}
          <Card className="p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Music className="w-4 h-4 text-primary" />
              <Label className="font-semibold">Background Audio (Optional)</Label>
            </div>
            
            <input
              ref={audioInputRef}
              type="file"
              accept="audio/*"
              onChange={handleAudioSelect}
              className="hidden"
            />
            
            {!audioFile ? (
              <Button
                variant="outline"
                className="w-full h-20 border-dashed"
                onClick={() => audioInputRef.current?.click()}
              >
                <Upload className="w-5 h-5 mr-2" />
                Upload Audio File
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 min-w-0">
                    <Music className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm truncate">{audioFile.name}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 flex-shrink-0"
                    onClick={removeAudio}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                
                {audioPreviewUrl && (
                  <audio 
                    src={audioPreviewUrl} 
                    controls 
                    className="w-full h-10"
                  />
                )}
                
                {/* Volume Slider */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm flex items-center gap-1">
                      <Volume2 className="w-3 h-3" />
                      Volume
                    </Label>
                    <span className="text-xs text-muted-foreground">{audioVolume}%</span>
                  </div>
                  <Slider
                    value={[audioVolume]}
                    onValueChange={([v]) => setAudioVolume(v)}
                    min={0}
                    max={100}
                    step={5}
                    className="w-full"
                  />
                </div>
                
                {/* Fade Options */}
                <div className="flex gap-6">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={audioFadeIn}
                      onCheckedChange={setAudioFadeIn}
                      id="fade-in"
                    />
                    <Label htmlFor="fade-in" className="text-sm cursor-pointer">
                      Fade In
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={audioFadeOut}
                      onCheckedChange={setAudioFadeOut}
                      id="fade-out"
                    />
                    <Label htmlFor="fade-out" className="text-sm cursor-pointer">
                      Fade Out
                    </Label>
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Outro Media Section */}
          <Card className="p-4 space-y-4">
            <div className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-primary" />
              <Label className="font-semibold">Outro Media (Optional)</Label>
            </div>
            <p className="text-xs text-muted-foreground">
              Add an image or video to display at the end of your video (e.g., logo, CTA).
            </p>
            
            <input
              ref={outroInputRef}
              type="file"
              accept="image/*,video/*"
              onChange={handleOutroSelect}
              className="hidden"
            />
            
            {!outroFile ? (
              <Button
                variant="outline"
                className="w-full h-20 border-dashed"
                onClick={() => outroInputRef.current?.click()}
              >
                <Upload className="w-5 h-5 mr-2" />
                Upload Image or Video
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 min-w-0">
                    {outroMediaType === 'video' ? (
                      <Video className="w-4 h-4 flex-shrink-0" />
                    ) : (
                      <ImageIcon className="w-4 h-4 flex-shrink-0" />
                    )}
                    <span className="text-sm truncate">{outroFile.name}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 flex-shrink-0"
                    onClick={removeOutro}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                
                {/* Preview */}
                {outroPreviewUrl && (
                  <div className="rounded-lg overflow-hidden bg-black/5 max-h-40">
                    {outroMediaType === 'video' ? (
                      <video 
                        src={outroPreviewUrl} 
                        controls 
                        className="w-full max-h-40 object-contain"
                      />
                    ) : (
                      <img 
                        src={outroPreviewUrl} 
                        alt="Outro preview"
                        className="w-full max-h-40 object-contain"
                      />
                    )}
                  </div>
                )}
                
                {/* Duration for images */}
                {outroMediaType === 'image' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Display Duration</Label>
                      <span className="text-xs text-muted-foreground">{outroDuration}s</span>
                    </div>
                    <Slider
                      value={[outroDuration]}
                      onValueChange={([v]) => setOutroDuration(v)}
                      min={1}
                      max={10}
                      step={1}
                      className="w-full"
                    />
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isUploading || isRendering}
          >
            Cancel
          </Button>
          <Button
            variant="secondary"
            onClick={handleSkipRender}
            disabled={isUploading || isRendering}
          >
            Skip & Render
          </Button>
          <Button
            onClick={handleRender}
            disabled={isUploading || isRendering}
          >
            {isUploading || isRendering ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {isUploading ? 'Uploading...' : 'Rendering...'}
              </>
            ) : (
              'Render Video'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
