import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Copy, RefreshCw, Loader2 } from "lucide-react";
import type { CaptionData } from "@/types/custom-creation";

interface CaptionDisplayProps {
  captionData: CaptionData;
  isGenerating: boolean;
  onRegenerate: () => Promise<void>;
  onCopyCaption: () => void;
  onCopyHashtags: () => void;
}

/**
 * Caption and hashtags card with expand/collapse and copy
 */
export const CaptionDisplay: React.FC<CaptionDisplayProps> = ({
  captionData,
  isGenerating,
  onRegenerate,
  onCopyCaption,
  onCopyHashtags,
}) => {
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const [hashtagsExpanded, setHashtagsExpanded] = useState(false);

  const displayedHashtags = hashtagsExpanded
    ? captionData.hashtags
    : captionData.hashtags.slice(0, 10);

  return (
    <Card className="bg-muted/50 border-border animate-fade-in">
      <CardContent className="pt-6 space-y-4">
        {/* Caption Section */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <Sparkles className="h-4 w-4 text-primary" />
              Caption
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={onCopyCaption}
              className="h-8 gap-1"
            >
              <Copy className="h-3 w-3" />
              Copy
            </Button>
          </div>
          <div className="text-sm md:text-base bg-background p-4 rounded-lg border border-border">
            {captionExpanded ? (
              <>
                <p className="whitespace-pre-wrap text-foreground">{captionData.caption}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCaptionExpanded(false)}
                  className="mt-2 h-7 text-xs"
                >
                  Show less
                </Button>
              </>
            ) : (
              <>
                <p className="line-clamp-4 whitespace-pre-wrap text-foreground">
                  {captionData.caption}
                </p>
                {captionData.caption.length > 150 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCaptionExpanded(true)}
                    className="mt-2 h-7 text-xs"
                  >
                    View full caption
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Hashtags Section */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-foreground">
              Hashtags ({captionData.hashtags.length})
            </h3>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={onCopyHashtags}
                className="h-8 gap-1"
              >
                <Copy className="h-3 w-3" />
                Copy All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onRegenerate}
                disabled={isGenerating}
                className="h-8 gap-1"
              >
                {isGenerating ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <RefreshCw className="h-3 w-3" />
                )}
                Regenerate
              </Button>
            </div>
          </div>

          <div className="bg-background p-3 rounded-lg border border-border">
            <div className="flex flex-wrap gap-2">
              {displayedHashtags.map((tag, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="text-xs px-2 py-1 cursor-pointer hover:bg-secondary/80 transition-colors"
                  onClick={() => {
                    navigator.clipboard.writeText(tag);
                  }}
                >
                  {tag}
                </Badge>
              ))}
            </div>

            {captionData.hashtags.length > 10 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setHashtagsExpanded(!hashtagsExpanded)}
                className="mt-2 h-7 text-xs w-full"
              >
                {hashtagsExpanded
                  ? "Show less"
                  : `Show ${captionData.hashtags.length - 10} more hashtags`}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
