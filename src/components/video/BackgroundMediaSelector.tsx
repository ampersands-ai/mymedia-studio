import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Search, Loader2, Image, Video, RefreshCw, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { logger } from '@/lib/logger';

interface PixabayMedia {
  id: number;
  type: 'video' | 'image';
  preview: string;
  fullHDURL?: string;
  imageURL?: string;
  largeImageURL?: string;
  vectorURL?: string;
  videoURL?: string;
  duration?: number;
  width: number;
  height: number;
}

export interface SelectedMedia {
  url: string;
  thumbnail: string;
  type: 'video' | 'image';
  duration?: number;
}

interface BackgroundMediaSelectorProps {
  style: string;
  duration: number;
  aspectRatio: string;
  selectedMedia: SelectedMedia[];
  onSelectMedia: (mediaList: SelectedMedia[]) => void;
}

export function BackgroundMediaSelector({
  style,
  duration,
  aspectRatio,
  selectedMedia,
  onSelectMedia,
}: BackgroundMediaSelectorProps) {
  const [open, setOpen] = useState(false);
  const [mediaItems, setMediaItems] = useState<PixabayMedia[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mediaType, setMediaType] = useState<'video' | 'image'>('video');
  const [previewMedia, setPreviewMedia] = useState<PixabayMedia | null>(null);

  useEffect(() => {
    if (open && mediaItems.length === 0) {
      searchMedia(getDefaultQuery(style), mediaType);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const getDefaultQuery = (style: string): string => {
    const styleQueries: Record<string, string> = {
      modern: 'abstract geometric patterns',
      minimal: 'minimalist clean backgrounds',
      cinematic: 'cinematic footage nature',
      vibrant: 'colorful vibrant abstract',
      nature: 'nature landscapes',
      urban: 'city urban skyline',
      tech: 'technology digital abstract',
    };
    return styleQueries[style] || 'abstract backgrounds';
  };

  const getOrientation = (aspectRatio: string): string => {
    if (aspectRatio === '9:16') return 'vertical';
    if (aspectRatio === '16:9') return 'horizontal';
    return 'all';
  };

  const searchMedia = async (query: string, type: 'video' | 'image') => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('search-pixabay-content', {
        body: {
          query,
          type,
          orientation: getOrientation(aspectRatio),
          per_page: 100,
        },
      });

      if (error) throw error;

      // Filter videos by duration if searching videos
      const filteredItems = type === 'video' 
        ? data.items.filter((item: PixabayMedia) => {
            const itemDuration = item.duration || 0;
            return itemDuration >= duration - 5 && itemDuration <= duration + 10;
          })
        : data.items;

      setMediaItems(filteredItems);
      
      if (filteredItems.length === 0) {
        toast.info(`No ${type}s found matching your criteria. Try a different search.`);
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Error searching Pixabay', error instanceof Error ? error : new Error(String(error)), {
        component: 'BackgroundMediaSelector',
        operation: 'handleSearch',
        type,
        query,
        errorMessage: error?.message
      });
      toast.error(error.message || `Failed to search ${type}s`);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectMedia = (media: PixabayMedia) => {
    let mediaUrl: string;
    const thumbnail: string = media.preview;

    if (media.type === 'video') {
      mediaUrl = media.videoURL || '';
    } else {
      // Prefer fullHDURL > largeImageURL > imageURL for best quality
      mediaUrl = media.fullHDURL || media.largeImageURL || media.imageURL || '';
    }

    if (mediaUrl) {
      // Check if already selected
      const isAlreadySelected = selectedMedia.some(item => item.url === mediaUrl);
      
      if (isAlreadySelected) {
        // Remove from selection
        const updatedMedia = selectedMedia.filter(item => item.url !== mediaUrl);
        onSelectMedia(updatedMedia);
        toast.success('Removed from selection');
      } else {
        // Add to selection
        const newMedia: SelectedMedia = {
          url: mediaUrl,
          thumbnail,
          type: media.type,
          duration: media.duration
        };
        onSelectMedia([...selectedMedia, newMedia]);
        toast.success(`${media.type === 'video' ? 'Video' : 'Image'} added (${selectedMedia.length + 1} total)`);
      }
    }
  };

  const handleRemoveMedia = (url: string) => {
    const updatedMedia = selectedMedia.filter(item => item.url !== url);
    onSelectMedia(updatedMedia);
    toast.success('Removed from selection');
  };

  const isMediaSelected = (media: PixabayMedia): boolean => {
    const mediaUrl = media.type === 'video' ? media.videoURL : (media.fullHDURL || media.largeImageURL || media.imageURL);
    return selectedMedia.some(item => item.url === mediaUrl);
  };

  const handleCustomSearch = () => {
    if (searchQuery.trim()) {
      searchMedia(searchQuery, mediaType);
    }
  };

  const handleRefresh = () => {
    searchMedia(getDefaultQuery(style), mediaType);
  };

  const handleMediaTypeChange = (newType: 'video' | 'image') => {
    setMediaType(newType);
    setMediaItems([]);
    searchMedia(searchQuery || getDefaultQuery(style), newType);
  };

  return (
    <>
      <div className="space-y-2">
        <Button
          variant="outline"
          onClick={() => setOpen(true)}
          className="w-full justify-start"
        >
          <div className="flex items-center gap-2">
            <Video className="h-4 w-4" />
            <span>Choose Background Media ({selectedMedia.length} selected)</span>
          </div>
        </Button>
        
        {/* Selected Media Preview */}
        {selectedMedia.length > 0 && (
          <div className="p-3 bg-accent/30 rounded-lg border space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{selectedMedia.length} media file{selectedMedia.length > 1 ? 's' : ''} selected</span>
              <span className="text-primary">Will play in sequence</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedMedia.map((media, index) => (
                <div key={index} className="relative group">
                  <img
                    src={media.thumbnail}
                    alt={`Selected ${media.type} ${index + 1}`}
                    className="h-16 w-20 object-cover rounded border-2 border-primary/50"
                  />
                  <button
                    onClick={() => handleRemoveMedia(media.url)}
                    className="absolute -top-1 -right-1 h-5 w-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                  >
                    ×
                  </button>
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] px-1 py-0.5 text-center">
                    {index + 1}. {media.type}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] w-full">
          <DialogHeader>
            <DialogTitle>Select Background Media</DialogTitle>
            <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2">
              <span>Powered by</span>
              <a 
                href="https://pixabay.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="font-semibold hover:underline text-primary"
              >
                Pixabay
              </a>
            </div>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Left Side - Controls */}
            <div className="lg:col-span-1 space-y-4">
            {/* Media Type Toggle */}
            <Tabs value={mediaType} onValueChange={handleMediaTypeChange as any}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="video" className="flex items-center gap-2">
                  <Video className="h-4 w-4" />
                  Videos
                </TabsTrigger>
                <TabsTrigger value="image" className="flex items-center gap-2">
                  <Image className="h-4 w-4" />
                  Images
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Search Bar */}
            <div className="flex flex-col gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={`Search for ${mediaType}s...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCustomSearch()}
                  className="pl-9"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleCustomSearch} disabled={loading} className="flex-1">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
                <Button variant="outline" onClick={handleRefresh} disabled={loading}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Selection Info */}
            {selectedMedia.length > 0 && (
              <div className="p-3 bg-primary/10 rounded-lg border border-primary/30">
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="default">{selectedMedia.length}</Badge>
                  <span className="font-medium">
                    media file{selectedMedia.length > 1 ? 's' : ''} selected
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Will play in sequence
                </p>
              </div>
            )}
            </div>

            {/* Right Side - Media Grid & Preview */}
            <div className="lg:col-span-2 space-y-4">
              {/* Preview Section */}
              {previewMedia && (
                <div className="rounded-lg border bg-accent/50 overflow-hidden">
                  <div className="p-3 border-b bg-background/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        {previewMedia.type === 'video' ? (
                          <Video className="h-4 w-4 text-primary" />
                        ) : (
                          <Image className="h-4 w-4 text-primary" />
                        )}
                        Preview
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => setPreviewMedia(null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="aspect-video bg-black flex items-center justify-center p-4">
                    {previewMedia.type === 'video' ? (
                      <video
                        key={previewMedia.videoURL}
                        src={previewMedia.videoURL}
                        className="max-h-full max-w-full rounded"
                        controls
                        autoPlay
                        muted
                        loop
                      />
                    ) : (
                      <img
                        src={previewMedia.largeImageURL || previewMedia.fullHDURL || previewMedia.imageURL}
                        alt="Preview"
                        className="max-h-full max-w-full rounded object-contain"
                      />
                    )}
                  </div>
                  <div className="p-3 bg-background/50 text-xs text-muted-foreground">
                    {previewMedia.width} × {previewMedia.height}
                    {previewMedia.duration && ` • ${Math.round(previewMedia.duration)}s`}
                  </div>
                </div>
              )}

            {/* Media Grid */}
            <ScrollArea className="h-[calc(95vh-280px)] rounded-md border p-4">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : mediaItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  {mediaType === 'video' ? <Video className="h-12 w-12 text-muted-foreground mb-2" /> : <Image className="h-12 w-12 text-muted-foreground mb-2" />}
                  <p className="text-muted-foreground">No {mediaType}s found</p>
                  <p className="text-sm text-muted-foreground">Try a different search term</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                  {mediaItems.map((media) => (
                    <div
                      key={media.id}
                      className={`relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all hover:border-primary ${
                        isMediaSelected(media)
                          ? 'border-primary ring-2 ring-primary'
                          : 'border-transparent'
                      }`}
                    >
                      <div 
                        onClick={() => handleSelectMedia(media)}
                        onMouseEnter={() => setPreviewMedia(media)}
                      >
                        <img
                          src={media.preview}
                          alt={`${media.type} ${media.id}`}
                          className="w-full h-24 object-cover"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                          {media.type === 'video' ? (
                            <Video className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          ) : (
                            <Image className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          )}
                        </div>
                        <div className="absolute bottom-1 left-1 right-1 flex items-center justify-between">
                          {media.type === 'video' && media.duration && (
                            <Badge variant="secondary" className="text-[10px] h-5">
                              {Math.round(media.duration)}s
                            </Badge>
                          )}
                          <Badge variant="secondary" className="text-[10px] h-5 ml-auto">
                            {media.width}×{media.height}
                          </Badge>
                        </div>
                        {isMediaSelected(media) && (
                          <div className="absolute top-1 right-1">
                            <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                              <svg className="h-3 w-3 text-primary-foreground" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
