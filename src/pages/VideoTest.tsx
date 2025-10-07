import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const DEFAULT_URL = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

const VideoTest = () => {
  const [url, setUrl] = useState(DEFAULT_URL);
  const videoRef1 = useRef<HTMLVideoElement>(null);
  const videoRef2 = useRef<HTMLVideoElement>(null);
  const [error1, setError1] = useState<string | null>(null);
  const [error2, setError2] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Video Test - Artifio.ai";
  }, []);

  const describeError = (el: HTMLVideoElement | null) => {
    const err = el?.error;
    if (!err) return null;
    switch (err.code) {
      case MediaError.MEDIA_ERR_ABORTED:
        return "Playback aborted";
      case MediaError.MEDIA_ERR_NETWORK:
        return "Network error";
      case MediaError.MEDIA_ERR_DECODE:
        return "Decoding error";
      case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
        return "Source not supported";
      default:
        return "Unknown error";
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-black mb-2">VIDEO PLAYBACK TEST</h1>
      <p className="text-foreground/80 mb-6">
        Use this page to verify browser playback. Try the sample or paste a URL (direct .mp4 recommended).
      </p>

      <Card className="mb-6">
        <CardContent className="p-4 space-y-3">
          <h2 className="font-bold">External sample (Big Buck Bunny)</h2>
          <div className="aspect-video bg-muted rounded-md overflow-hidden">
            <video
              ref={videoRef1}
              src={DEFAULT_URL}
              controls
              playsInline
              preload="metadata"
              crossOrigin="anonymous"
              className="w-full h-full object-contain"
              onError={() => setError1(describeError(videoRef1.current))}
              onLoadedMetadata={() => setError1(null)}
            />
          </div>
          {error1 && <p className="text-sm text-destructive">Error: {error1}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-3">
          <h2 className="font-bold">Custom URL</h2>
          <div className="flex gap-2">
            <Input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/video.mp4"
            />
            <Button
              onClick={() => {
                if (videoRef2.current) {
                  // Reload video element to apply new src
                  videoRef2.current.pause();
                  videoRef2.current.load();
                  videoRef2.current.play().catch(() => {});
                }
              }}
            >
              Load & Play
            </Button>
          </div>
          <div className="text-sm text-muted-foreground">
            Tip: paste a direct MP4 link. The Pixabay page URL won't work unless it's the direct file URL.
          </div>
          <div className="aspect-video bg-muted rounded-md overflow-hidden">
            <video
              ref={videoRef2}
              controls
              playsInline
              preload="metadata"
              crossOrigin="anonymous"
              className="w-full h-full object-contain"
              onError={() => setError2(describeError(videoRef2.current))}
              onLoadedMetadata={() => setError2(null)}
            >
              <source src={url} type="video/mp4" />
            </video>
          </div>
          {error2 && <p className="text-sm text-destructive">Error: {error2}</p>}
        </CardContent>
      </Card>
    </div>
  );
};

export default VideoTest;
