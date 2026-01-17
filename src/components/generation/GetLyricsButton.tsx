import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { FEATURE_COSTS } from "@/constants/pricing";
import { LyricsModal } from "./LyricsModal";
import { cn } from "@/lib/utils";

interface LyricsLine {
  text: string;
  start_time: number;
  end_time: number;
}

interface LyricsData {
  lyrics?: LyricsLine[];
  raw_text?: string;
}

interface GetLyricsButtonProps {
  generationId: string;
  outputIndex: number;
  userCredits?: number;
  className?: string;
  size?: "default" | "sm" | "lg" | "icon";
}

export const GetLyricsButton = ({
  generationId,
  outputIndex,
  userCredits = 0,
  className,
  size = "sm",
}: GetLyricsButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [lyricsData, setLyricsData] = useState<LyricsData | null>(null);
  const [showModal, setShowModal] = useState(false);
  const { toast } = useToast();

  const lyricsCost = FEATURE_COSTS.LYRICS_FETCH;
  const hasEnoughCredits = userCredits >= lyricsCost;

  const handleGetLyrics = async () => {
    if (!hasEnoughCredits) {
      toast({
        title: "Insufficient Credits",
        description: `You need ${lyricsCost} credits to fetch lyrics. You have ${userCredits.toFixed(2)} credits.`,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-timestamped-lyrics', {
        body: {
          generation_id: generationId,
          output_index: outputIndex,
        },
      });

      if (error) {
        throw error;
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to fetch lyrics');
      }

      setLyricsData(data.data);
      setShowModal(true);

      toast({
        title: "Lyrics Retrieved",
        description: `${lyricsCost} credits used. ${data.credits_remaining?.toFixed(2) || ''} credits remaining.`,
      });
    } catch (error) {
      console.error('Failed to fetch lyrics:', error);
      toast({
        title: "Failed to Fetch Lyrics",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size={size}
        onClick={handleGetLyrics}
        disabled={isLoading || !hasEnoughCredits}
        className={cn("gap-1.5", className)}
        title={!hasEnoughCredits ? `Requires ${lyricsCost} credits` : "Get timestamped lyrics"}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <FileText className="h-4 w-4" />
        )}
        <span className="hidden sm:inline">Lyrics ({lyricsCost})</span>
        <span className="sm:hidden">Lyrics</span>
      </Button>

      <LyricsModal
        open={showModal}
        onOpenChange={setShowModal}
        lyricsData={lyricsData}
      />
    </>
  );
};
