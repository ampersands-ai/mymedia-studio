import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Copy, Download, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface LyricsLine {
  text: string;
  start_time: number;
  end_time: number;
}

interface LyricsData {
  lyrics?: LyricsLine[];
  raw_text?: string;
}

interface LyricsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lyricsData: LyricsData | null;
}

/**
 * Format seconds to MM:SS.xx format for LRC files
 */
function formatLrcTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = (seconds % 60).toFixed(2).padStart(5, '0');
  return `${mins.toString().padStart(2, '0')}:${secs}`;
}

/**
 * Format seconds to MM:SS format for display
 */
function formatDisplayTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export const LyricsModal = ({ open, onOpenChange, lyricsData }: LyricsModalProps) => {
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);
  const { toast } = useToast();

  const lyrics = lyricsData?.lyrics || [];
  const hasLyrics = lyrics.length > 0;

  /**
   * Generate plain text lyrics (no timestamps)
   */
  const getPlainText = (): string => {
    if (!hasLyrics) return lyricsData?.raw_text || '';
    return lyrics.map(line => line.text).join('\n');
  };

  /**
   * Generate timestamped text for display
   */
  const getTimestampedText = (): string => {
    if (!hasLyrics) return lyricsData?.raw_text || '';
    return lyrics
      .map(line => `[${formatDisplayTime(line.start_time)}] ${line.text}`)
      .join('\n');
  };

  /**
   * Generate LRC format for karaoke/sync applications
   */
  const getLrcFormat = (): string => {
    if (!hasLyrics) return '';
    return lyrics
      .map(line => `[${formatLrcTime(line.start_time)}]${line.text}`)
      .join('\n');
  };

  const handleCopy = async (format: 'plain' | 'timestamped' | 'lrc') => {
    let text = '';
    switch (format) {
      case 'plain':
        text = getPlainText();
        break;
      case 'timestamped':
        text = getTimestampedText();
        break;
      case 'lrc':
        text = getLrcFormat();
        break;
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopiedFormat(format);
      setTimeout(() => setCopiedFormat(null), 2000);
      toast({
        title: "Copied!",
        description: `Lyrics copied to clipboard`,
      });
    } catch {
      toast({
        title: "Copy failed",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const handleDownload = (format: 'txt' | 'lrc') => {
    let content = '';
    let filename = '';
    let mimeType = 'text/plain';

    switch (format) {
      case 'txt':
        content = getTimestampedText();
        filename = `lyrics-${Date.now()}.txt`;
        break;
      case 'lrc':
        content = getLrcFormat();
        filename = `lyrics-${Date.now()}.lrc`;
        mimeType = 'application/x-lrc';
        break;
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Downloaded!",
      description: `Lyrics saved as ${filename}`,
    });
  };

  if (!lyricsData) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Timestamped Lyrics
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap gap-2 pb-3 border-b">
          {/* Copy buttons */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleCopy('plain')}
            className="gap-1.5"
          >
            {copiedFormat === 'plain' ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            Copy Plain
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleCopy('timestamped')}
            className="gap-1.5"
          >
            {copiedFormat === 'timestamped' ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            Copy with Timestamps
          </Button>
          
          {/* Download buttons */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDownload('txt')}
            className="gap-1.5"
          >
            <Download className="h-3.5 w-3.5" />
            .txt
          </Button>
          {hasLyrics && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDownload('lrc')}
              className="gap-1.5"
            >
              <Download className="h-3.5 w-3.5" />
              .lrc
            </Button>
          )}
        </div>

        <ScrollArea className="flex-1 min-h-0">
          <div className="space-y-1 pr-4 py-2">
            {hasLyrics ? (
              lyrics.map((line, index) => (
                <div
                  key={index}
                  className="flex gap-3 py-1.5 hover:bg-muted/50 rounded px-2 -mx-2 transition-colors"
                >
                  <span className="text-xs text-muted-foreground font-mono min-w-[50px] tabular-nums">
                    [{formatDisplayTime(line.start_time)}]
                  </span>
                  <span className="text-sm flex-1">{line.text}</span>
                </div>
              ))
            ) : lyricsData.raw_text ? (
              <pre className="text-sm whitespace-pre-wrap font-sans">
                {lyricsData.raw_text}
              </pre>
            ) : (
              <p className="text-muted-foreground text-sm italic">
                No lyrics available for this audio.
              </p>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
