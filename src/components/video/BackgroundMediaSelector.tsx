import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Search, Loader2, Image, Video, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

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

interface BackgroundMediaSelectorProps {
  style: string;
  duration: number;
  aspectRatio: string;
  selectedMediaUrl: string;
  selectedMediaType: 'video' | 'image';
  onSelectMedia: (url: string, thumbnail: string, type: 'video' | 'image') => void;
}

export function BackgroundMediaSelector({
  style,
  duration,
  aspectRatio,
  selectedMediaUrl,
  selectedMediaType,
  onSelectMedia,
}: BackgroundMediaSelectorProps) {
  const [open, setOpen] = useState(false);
  const [mediaItems, setMediaItems] = useState<PixabayMedia[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mediaType, setMediaType] = useState<'video' | 'image'>('video');
  const [selectedThumbnail, setSelectedThumbnail] = useState<string>('');

  useEffect(() => {
    if (open && mediaItems.length === 0) {
      searchMedia(getDefaultQuery(style), mediaType);
    }
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
          per_page: 20,
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
    } catch (error: any) {
      console.error('Error searching Pixabay:', error);
      toast.error(error.message || `Failed to search ${type}s`);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectMedia = (media: PixabayMedia) => {
    let mediaUrl: string;
    let thumbnail: string = media.preview;

    if (media.type === 'video') {
      mediaUrl = media.videoURL || '';
    } else {
      // Prefer fullHDURL > largeImageURL > imageURL for best quality
      mediaUrl = media.fullHDURL || media.largeImageURL || media.imageURL || '';
    }

    if (mediaUrl) {
      setSelectedThumbnail(thumbnail);
      onSelectMedia(mediaUrl, thumbnail, media.type);
      toast.success(`${media.type === 'video' ? 'Video' : 'Image'} selected`);
      setOpen(false);
    }
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
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="w-full justify-start"
      >
        {selectedMediaUrl ? (
          <div className="flex items-center gap-2 w-full">
            {selectedMediaType === 'video' ? <Video className="h-4 w-4" /> : <Image className="h-4 w-4" />}
            <span className="truncate">Custom {selectedMediaType} selected</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Video className="h-4 w-4" />
            <span>Choose Background Media</span>
          </div>
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Select Background Media</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
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
            <div className="flex gap-2">
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
              <Button onClick={handleCustomSearch} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
              <Button variant="outline" onClick={handleRefresh} disabled={loading}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>

            {/* Current Selection Display */}
            {selectedMediaUrl && (
              <div className="p-3 bg-accent/50 rounded-lg border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {selectedMediaType === 'video' ? (
                      <Video className="h-4 w-4 text-primary" />
                    ) : (
                      <Image className="h-4 w-4 text-primary" />
                    )}
                    <span className="text-sm font-medium">
                      Currently Selected {selectedMediaType === 'video' ? 'Video' : 'Image'}
                    </span>
                  </div>
                  {selectedThumbnail && (
                    <img
                      src={selectedThumbnail}
                      alt="Selected preview"
                      className="h-12 w-20 object-cover rounded"
                    />
                  )}
                </div>
              </div>
            )}

            {/* Media Grid */}
            <ScrollArea className="h-[400px] rounded-md border p-4">
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
                <div className="grid grid-cols-3 gap-4">
                  {mediaItems.map((media) => (
                    <div
                      key={media.id}
                      className={`relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all hover:border-primary ${
                        selectedMediaUrl === (media.type === 'video' ? media.videoURL : (media.fullHDURL || media.largeImageURL || media.imageURL))
                          ? 'border-primary ring-2 ring-primary'
                          : 'border-transparent'
                      }`}
                      onClick={() => handleSelectMedia(media)}
                    >
                      <img
                        src={media.preview}
                        alt={`${media.type} ${media.id}`}
                        className="w-full h-32 object-cover"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                        {media.type === 'video' ? (
                          <Video className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        ) : (
                          <Image className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </div>
                      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                        {media.type === 'video' && media.duration && (
                          <Badge variant="secondary" className="text-xs">
                            {Math.round(media.duration)}s
                          </Badge>
                        )}
                        {media.type === 'image' && (
                          <div className="flex gap-1">
                            {media.fullHDURL && <Badge variant="secondary" className="text-xs">Full HD</Badge>}
                            {media.vectorURL && <Badge variant="secondary" className="text-xs">Vector</Badge>}
                          </div>
                        )}
                        <Badge variant="secondary" className="text-xs ml-auto">
                          {media.width}×{media.height}
                        </Badge>
                      </div>
                      {selectedMediaUrl === (media.type === 'video' ? media.videoURL : (media.fullHDURL || media.largeImageURL || media.imageURL)) && (
                        <div className="absolute top-2 right-2">
                          <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                            <svg className="h-4 w-4 text-primary-foreground" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
