import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Clock, Coins } from "lucide-react";
import type { CreationGroup } from "@/constants/creation-groups";

interface ModelSelectorProps {
  models: any[];
  selectedModel: string | null;
  onModelChange: (modelId: string) => void;
  selectedGroup: CreationGroup;
  isLoading: boolean;
}

/**
 * Model selection dropdown with logos, cost, time, and cross-group indicators
 */
export const ModelSelector: React.FC<ModelSelectorProps> = ({
  models,
  selectedModel,
  onModelChange,
  selectedGroup,
  isLoading,
}) => {
  const currentModel = models.find(m => String(m.record_id) === String(selectedModel));

  if (isLoading) {
    return (
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">AI Model</label>
        <div className="flex items-center justify-center p-4 border border-border rounded-lg bg-muted/30">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">AI Model</label>
      <Select value={selectedModel || undefined} onValueChange={onModelChange}>
        <SelectTrigger className="w-full h-auto py-3 px-4 bg-background border-border hover:bg-muted/30 transition-colors">
          <SelectValue placeholder="Select a model">
            {currentModel && (
              <div className="flex items-center gap-3 w-full">
                {currentModel.logo_url && (
                  <img
                    src={currentModel.logo_url}
                    alt={currentModel.model_name}
                    className="h-6 w-6 rounded object-contain flex-shrink-0"
                  />
                )}
                <div className="flex-1 text-left min-w-0">
                  <div className="font-semibold text-foreground truncate">
                    {currentModel.model_name}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Coins className="h-3 w-3" />
                      {currentModel.base_token_cost.toFixed(2)}
                    </span>
                    {currentModel.estimated_time_seconds && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        ~{currentModel.estimated_time_seconds}s
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {models.map((model) => {
            const modelGroups = (model.groups as string[]) || [];
            const otherGroups = modelGroups.filter((g: string) => g !== selectedGroup);
            const isSelected = String(selectedModel) === String(model.record_id);

            return (
              <SelectItem
                key={model.record_id}
                value={String(model.record_id)}
                className="cursor-pointer"
              >
                <div className="flex items-center gap-3 w-full py-1">
                  {model.logo_url && (
                    <img
                      src={model.logo_url}
                      alt={model.model_name}
                      className="h-6 w-6 rounded object-contain flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-foreground truncate">
                      {model.model_name}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Coins className="h-3 w-3" />
                        {model.base_token_cost.toFixed(2)}
                      </span>
                      {model.estimated_time_seconds && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          ~{model.estimated_time_seconds}s
                        </span>
                      )}
                    </div>
                    {otherGroups.length > 0 && (
                      <div className="flex items-center gap-1 mt-1 flex-wrap">
                        <span className="text-xs text-muted-foreground">Also in:</span>
                        {otherGroups.map((group: string) => (
                          <Badge
                            key={group}
                            variant="secondary"
                            className="text-xs px-1.5 py-0 h-5"
                          >
                            {group.replace(/_/g, " ")}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
};
