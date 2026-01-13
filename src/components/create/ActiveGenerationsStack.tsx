import { Button } from "@/components/ui/button";
import { History } from "lucide-react";
import { useActiveGenerations } from "@/hooks/useActiveGenerations";
import { SingleGenerationConsole } from "./SingleGenerationConsole";

/**
 * Props for ActiveGenerationsStack component
 */
interface ActiveGenerationsStackProps {
  onViewHistory: () => void;
  /** Maximum number of consoles to display before showing "more" link */
  maxConsoles?: number;
  /** Optional: filter to specific model record ID */
  currentModelRecordId?: string | null;
}

/**
 * Displays all active/recent generations as independent stacked consoles
 * Each generation gets its own progress card
 */
export const ActiveGenerationsStack = ({
  onViewHistory,
  maxConsoles = 5,
  currentModelRecordId,
}: ActiveGenerationsStackProps) => {
  const { data: activeGenerations = [], isLoading } = useActiveGenerations();

  // Optionally filter to current model
  const filteredGenerations = currentModelRecordId
    ? activeGenerations.filter(g => g.model_record_id === currentModelRecordId)
    : activeGenerations;

  // Show most recent N generations
  const visibleGenerations = filteredGenerations.slice(0, maxConsoles);
  const hiddenCount = filteredGenerations.length - visibleGenerations.length;

  if (isLoading) {
    return null;
  }

  if (visibleGenerations.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {visibleGenerations.map((gen) => (
        <SingleGenerationConsole
          key={gen.id}
          generation={gen}
          onViewHistory={onViewHistory}
        />
      ))}

      {hiddenCount > 0 && (
        <div className="text-center py-2">
          <Button
            variant="link"
            size="sm"
            onClick={onViewHistory}
            className="text-muted-foreground hover:text-foreground"
          >
            <History className="h-3 w-3 mr-1" />
            +{hiddenCount} more in progress...
          </Button>
        </div>
      )}
    </div>
  );
};
