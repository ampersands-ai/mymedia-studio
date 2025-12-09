import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Loader2, Clock, Coins, Images, ChevronDown } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import type { CreationGroup } from "@/constants/creation-groups";
import type { ModelRecord } from "@/types/custom-creation";

interface ModelSelectorProps {
  models: ModelRecord[];
  selectedModel: string | null;
  onModelChange: (modelId: string) => void;
  selectedGroup: CreationGroup;
  isLoading: boolean;
}

/**
 * Model selection dropdown with logos, cost, time, and cross-group indicators
 */
const ModelSelectorComponent: React.FC<ModelSelectorProps> = ({
  models,
  selectedModel,
  onModelChange,
  selectedGroup,
  isLoading,
}) => {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = React.useState(false);
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

  const ModelCard = ({ model, isSelected }: { model: ModelRecord; isSelected: boolean }) => {
    const modelGroups = Array.isArray(model.groups) ? model.groups : 
      (model.groups && typeof model.groups === 'object' ? Object.keys(model.groups) : []);
    const otherGroups = modelGroups.filter((g: string | number) => g !== selectedGroup);

    return (
      <div className={cn(
        "flex items-center gap-3 w-full p-3 rounded-lg border transition-colors cursor-pointer",
        isSelected 
          ? "bg-primary/10 border-primary" 
          : "bg-background border-border hover:bg-muted/30"
      )}>
        {model.logo_url && (
          <div className="h-8 w-8 rounded-md bg-white/90 dark:bg-white/95 p-1 flex items-center justify-center flex-shrink-0 shadow-sm">
            <img
              src={model.logo_url}
              alt={model.model_name}
              className="h-full w-full object-contain"
            />
          </div>
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
            {model.default_outputs && model.default_outputs > 1 && (
              <span className="flex items-center gap-1">
                <Images className="h-3 w-3" />
                ×{model.default_outputs}
              </span>
            )}
          </div>
          {otherGroups.length > 0 && (
            <div className="flex items-center gap-1 mt-1 flex-wrap">
              <span className="text-xs text-muted-foreground">Also in:</span>
              {otherGroups.map((group: string | number) => (
                <Badge
                  key={group}
                  variant="secondary"
                  className="text-xs px-1.5 py-0 h-5"
                >
                  {String(group).replace(/_/g, " ")}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Mobile: Inline collapsible list
  if (isMobile) {
    return (
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">AI Model</label>
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger className="w-full">
            <div className="flex items-center gap-2">
              {currentModel && <ModelCard model={currentModel} isSelected={true} />}
              <ChevronDown className={cn(
                "h-4 w-4 text-muted-foreground transition-transform flex-shrink-0",
                isOpen && "rotate-180"
              )} />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 mt-2">
            {models
              .filter(m => String(m.record_id) !== String(selectedModel))
              .map((model) => (
                <div
                  key={model.record_id}
                  onClick={() => {
                    onModelChange(String(model.record_id));
                    setIsOpen(false);
                  }}
                >
                  <ModelCard model={model} isSelected={false} />
                </div>
              ))}
          </CollapsibleContent>
        </Collapsible>
      </div>
    );
  }

  // Desktop: Original dropdown
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">AI Model</label>
      <TooltipProvider>
        <Select value={selectedModel || undefined} onValueChange={onModelChange}>
        <SelectTrigger className="w-full h-auto py-3 px-4 bg-background border-border hover:bg-muted/30 transition-colors">
          <SelectValue placeholder="Select a model">
            {currentModel && (
              <div className="flex items-center gap-3 w-full">
                {currentModel.logo_url && (
                  <div className="h-8 w-8 rounded-md bg-white/90 dark:bg-white/95 p-1 flex items-center justify-center flex-shrink-0 shadow-sm">
                    <img
                      src={currentModel.logo_url}
                      alt={currentModel.model_name}
                      className="h-full w-full object-contain"
                    />
                  </div>
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
                    {currentModel.default_outputs && currentModel.default_outputs > 1 && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="flex items-center gap-1 cursor-help">
                            <Images className="h-3 w-3" />
                            ×{currentModel.default_outputs}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Minimum number of images for the credits displayed</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </div>
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {models.map((model) => {
            const modelGroups = Array.isArray(model.groups) ? model.groups : 
              (model.groups && typeof model.groups === 'object' ? Object.keys(model.groups) : []);
            const otherGroups = modelGroups.filter((g: string) => g !== selectedGroup);

            return (
              <SelectItem
                key={model.record_id}
                value={String(model.record_id)}
                className="cursor-pointer"
              >
                <div className="flex items-center gap-3 w-full py-1">
                  {model.logo_url && (
                    <div className="h-8 w-8 rounded-md bg-white/90 dark:bg-white/95 p-1 flex items-center justify-center flex-shrink-0 shadow-sm">
                      <img
                        src={model.logo_url}
                        alt={model.model_name}
                        className="h-full w-full object-contain"
                      />
                    </div>
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
                      {model.default_outputs && model.default_outputs > 1 && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="flex items-center gap-1 cursor-help">
                              <Images className="h-3 w-3" />
                              ×{model.default_outputs}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Minimum number of images for the credits displayed</p>
                          </TooltipContent>
                        </Tooltip>
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
      </TooltipProvider>
    </div>
  );
};

// Memoize to prevent re-renders when parent state changes unrelated to model selection
export const ModelSelector = React.memo(ModelSelectorComponent);
