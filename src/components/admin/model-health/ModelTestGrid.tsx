import { ModelTestCard } from "./ModelTestCard";
import type { ModelHealthSummary } from "@/types/admin/model-health";

interface ModelTestGridProps {
  models: ModelHealthSummary[];
  onTest: (modelRecordId: string) => void;
  onConfigure: (model: ModelHealthSummary) => void;
  onViewHistory: (model: ModelHealthSummary) => void;
  onSchedule?: (model: ModelHealthSummary) => void;
  testingModelIds?: Set<string>;
}

export const ModelTestGrid = ({
  models,
  onTest,
  onConfigure,
  onViewHistory,
  onSchedule,
  testingModelIds = new Set(),
}: ModelTestGridProps) => {
  if (models.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No models found matching your filters
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {models.map((model) => (
        <ModelTestCard
          key={model.record_id}
          model={model}
          onTest={() => onTest(model.record_id)}
          onConfigure={() => onConfigure(model)}
          onViewHistory={() => onViewHistory(model)}
          onSchedule={onSchedule ? () => onSchedule(model) : undefined}
          isLoading={testingModelIds.has(model.record_id)}
        />
      ))}
    </div>
  );
};
