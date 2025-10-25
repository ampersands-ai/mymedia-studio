import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Play, Check, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PexelsVideo {
  id: number;
  width: number;
  height: number;
  duration: number;
  image: string;
  video_files: Array<{
    id: number;
    quality: string;
    file_type: string;
    width: number;
    height: number;
    link: string;
  }>;
  video_pictures: Array<{
    id: number;
    picture: string;
  }>;
}

interface BackgroundVideoSelectorProps {
  style: string;
  duration: number;
  aspectRatio: string;
  selectedVideoUrl?: string;
  onSelectVideo: (url: string, thumbnail: string) => void;
}

export function BackgroundVideoSelector({ 
  style, 
  duration,
  aspectRatio,
  selectedVideoUrl, 
  onSelectVideo 
}: BackgroundVideoSelectorProps) {
  const [videos, setVideos] = useState<PexelsVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [customQuery, setCustomQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedThumbnail, setSelectedThumbnail] = useState<string>('');
  const { toast } = useToast();
  const pexelsApiKey = import.meta.env.VITE_PEXELS_API_KEY;

  useEffect(() => {
    if (dialogOpen && videos.length === 0) {
      searchVideos(getDefaultQuery(style));
    }
  }, [dialogOpen, style]);

  const getDefaultQuery = (style: string): string => {
    const queries: Record<string, string> = {
      modern: 'technology abstract motion',
      tech: 'coding programming developer',
      educational: 'books library studying',
      dramatic: 'nature cinematic landscape'
    };
    return queries[style] || 'abstract background';
  };

  const getOrientation = (aspectRatio: string): string => {
    const orientationMap: Record<string, string> = {
      '16:9': 'landscape',
      '9:16': 'portrait',
      '4:5': 'portrait',
      '1:1': 'square'
    };
    return orientationMap[aspectRatio] || 'portrait';
  };

  const searchVideos = async (query: string) => {
    if (!pexelsApiKey) {
      toast({
        title: 'Configuration Error',
        description: 'Pexels API key not configured',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    setSearchQuery(query);

    try {
      const orientation = getOrientation(aspectRatio);
      const response = await fetch(
        `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=20&orientation=${orientation}`,
        {
          headers: { Authorization: pexelsApiKey }
        }
      );

      if (!response.ok) throw new Error('Failed to fetch videos');

      const data = await response.json();
      
      // Filter by minimum duration
      const filtered = data.videos.filter((v: PexelsVideo) => v.duration >= duration);
      
      setVideos(filtered.length > 0 ? filtered : data.videos);
      
      if (filtered.length === 0) {
        toast({
          title: 'Note',
          description: 'Some videos may be shorter than your video duration',
          variant: 'default'
        });
      }
    } catch (error) {
      console.error('Pexels API error:', error);
      toast({
        title: 'Error',
        description: 'Failed to load videos. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectVideo = (video: PexelsVideo) => {
    const hdVideo = video.video_files.find(f => f.quality === 'hd') || video.video_files[0];
    const thumbnail = video.video_pictures[0]?.picture || video.image;
    
    onSelectVideo(hdVideo.link, thumbnail);
    setSelectedThumbnail(thumbnail);
    setDialogOpen(false);
    
    toast({
      title: 'Video Selected',
      description: 'Background video has been updated'
    });
  };

  const handleCustomSearch = () => {
    if (customQuery.trim()) {
      searchVideos(customQuery);
    }
  };

  return (
    <div>
      <Label>Background Video</Label>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="w-full justify-start mt-2">
            <Play className="w-4 h-4 mr-2" />
            {selectedVideoUrl ? 'Change Background Video' : 'Choose Background Video'}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-6xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Choose Background Video</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Search videos (e.g., 'sunset beach', 'city night')"
                value={customQuery}
                onChange={(e) => setCustomQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCustomSearch()}
              />
              <Button onClick={handleCustomSearch} disabled={loading}>
                <Search className="w-4 h-4" />
              </Button>
              <Button 
                variant="outline" 
                onClick={() => searchVideos(getDefaultQuery(style))}
                disabled={loading}
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>

            {searchQuery && (
              <p className="text-sm text-muted-foreground">
                Showing results for: <strong>{searchQuery}</strong>
              </p>
            )}

            <ScrollArea className="h-[600px]">
              {loading ? (
                <div className="text-center py-12">Loading videos...</div>
              ) : videos.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No videos found. Try a different search term.
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pr-4">
                  {videos.map((video) => {
                    const thumbnail = video.video_pictures[0]?.picture || video.image;
                    const isSelected = selectedThumbnail === thumbnail;

                    return (
                      <Card
                        key={video.id}
                        className={`cursor-pointer transition-all hover:shadow-lg ${
                          isSelected ? 'ring-2 ring-primary' : ''
                        }`}
                        onClick={() => handleSelectVideo(video)}
                      >
                        <CardContent className="p-0 relative">
                          <img
                            src={thumbnail}
                            alt="Video preview"
                            className="w-full h-48 object-cover rounded-t-lg"
                          />
                          {isSelected && (
                            <div className="absolute top-2 right-2 bg-primary rounded-full p-1">
                              <Check className="w-4 h-4 text-primary-foreground" />
                            </div>
                          )}
                          <div className="p-2">
                            <p className="text-xs text-muted-foreground">
                              {video.duration}s • {video.width}x{video.height}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {selectedThumbnail && (
        <div className="mt-2">
          <img 
            src={selectedThumbnail} 
            alt="Selected video" 
            className="w-full h-32 object-cover rounded border"
          />
        </div>
      )}
    </div>
  );
}
