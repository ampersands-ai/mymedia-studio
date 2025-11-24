import { Card, CardContent } from "@/components/ui/card";
import { Clock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LazyGridItem } from "@/components/LazyGridItem";
import { GenerationCard } from "./GenerationCard";
import type { Generation } from "../hooks/useGenerationHistory";

interface GenerationListProps {
  generations: Generation[];
  statusFilter: 'all' | 'completed' | 'failed';
  onView: (generation: Generation) => void;
  onDownload: (storagePath: string | null, type: string, outputUrl?: string | null) => void;
}

export const GenerationList = ({
  generations,
  statusFilter,
  onView,
  onDownload,
}: GenerationListProps) => {
  if (!generations || generations.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          {statusFilter === 'all' && (
            <>
              <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-bold mb-2">No creations yet</h3>
              <p className="text-muted-foreground mb-6">
                Start creating to see your content here
              </p>
              <Button onClick={() => (window.location.href = "/dashboard/custom-creation")} className="bg-primary hover:bg-primary/90">
                Start Creating
              </Button>
            </>
          )}
          {statusFilter === 'completed' && (
            <>
              <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-bold mb-2">No successful generations yet</h3>
              <p className="text-muted-foreground">
                Your completed creations will appear here
              </p>
            </>
          )}
          {statusFilter === 'failed' && (
            <>
              <Sparkles className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <h3 className="text-xl font-bold mb-2">No failed generations!</h3>
              <p className="text-muted-foreground">
                All your generations have been successful
              </p>
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
      {generations.map((generation, index) => (
        <LazyGridItem key={generation.id} priority={index < 6}>
          <GenerationCard
            generation={generation}
            index={index}
            onView={onView}
            onDownload={onDownload}
          />
        </LazyGridItem>
      ))}
    </div>
  );
};
