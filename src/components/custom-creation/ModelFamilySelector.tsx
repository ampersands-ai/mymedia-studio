import { useMemo } from "react";
import { AIModel } from "@/hooks/useModels";
import { CreationGroup } from "@/constants/creation-groups";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Coins, Clock, Image as ImageIcon, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModelFamilySelectorProps {
  models: AIModel[];
  selectedModel: string | null;
  onModelChange: (modelId: string) => void;
  selectedGroup: CreationGroup;
  isLoading: boolean;
}

export const ModelFamilySelector: React.FC<ModelFamilySelectorProps> = ({
  models,
  selectedModel,
  onModelChange,
  selectedGroup,
  isLoading,
}) => {
  // Group models by family
  const modelsByFamily = useMemo(() => {
    const grouped: Record<string, AIModel[]> = {};
    models.forEach(model => {
      const family = model.model_family || 'Other';
      if (!grouped[family]) grouped[family] = [];
      grouped[family].push(model);
    });
    
    // Sort models within each family by display_order_in_family
    Object.keys(grouped).forEach(family => {
      grouped[family].sort((a, b) => 
        (a.display_order_in_family || 0) - (b.display_order_in_family || 0)
      );
    });
    
    return grouped;
  }, [models]);

  // Get currently selected model
  const currentModel = models.find(m => m.record_id === selectedModel);

  // Helper function to get stats for a family (minimum cost model's stats)
  const getFamilyStats = (family: string) => {
    const familyModels = modelsByFamily[family] || [];
    if (familyModels.length === 0) return null;
    
    // Find the model with minimum cost
    const minCostModel = familyModels.reduce((min, model) => 
      (model.base_token_cost < min.base_token_cost) ? model : min
    );
    
    return {
      cost: minCostModel.base_token_cost,
      duration: minCostModel.estimated_time_seconds,
      outputs: minCostModel.default_outputs,
      hasMultipleVariants: familyModels.length > 1
    };
  };

  // Get logo from first model in family
  const getFamilyLogo = (family: string) => {
    const firstModel = modelsByFamily[family]?.[0];
    return firstModel?.logo_url;
  };

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-10 bg-muted rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="h-24 bg-muted rounded" />
          <div className="h-24 bg-muted rounded" />
          <div className="h-24 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label>Model</Label>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-full justify-between">
            {currentModel ? (
              <div className="flex items-center gap-3">
                {currentModel.logo_url && (
                  <div className="h-10 w-10 rounded bg-white/90 dark:bg-white/95 p-1 flex items-center justify-center flex-shrink-0 shadow-sm">
                    <img 
                      src={currentModel.logo_url} 
                      alt={currentModel.model_name} 
                      className="h-full w-full object-contain"
                    />
                  </div>
                )}
                <div className="flex flex-col gap-1 items-start">
                  <span className="font-medium">{currentModel.model_name}</span>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Coins className="w-3.5 h-3.5" />
                      <span>{currentModel.base_token_cost}</span>
                    </div>
                    {currentModel.estimated_time_seconds && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>~{currentModel.estimated_time_seconds}s</span>
                      </div>
                    )}
                    {currentModel.default_outputs && (
                      <div className="flex items-center gap-1">
                        <ImageIcon className="w-3.5 h-3.5" />
                        <span>×{currentModel.default_outputs}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <span className="text-muted-foreground">Select a model</span>
            )}
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-[500px] bg-background border-border z-50 p-2">
          {Object.keys(modelsByFamily).sort().map((family) => {
            const familyModels = modelsByFamily[family];
            const isSingleModel = familyModels.length === 1;
            const logo = getFamilyLogo(family);
            const stats = getFamilyStats(family);
            
            if (isSingleModel) {
              // Single model family - direct menu item
              const model = familyModels[0];
              return (
                <DropdownMenuItem
                  key={family}
                  onClick={() => onModelChange(model.record_id)}
                  className="cursor-pointer p-4"
                >
                  <div className="flex items-center gap-3 w-full">
                    {logo && (
                      <div className="h-10 w-10 rounded bg-white/90 dark:bg-white/95 p-1 flex items-center justify-center flex-shrink-0 shadow-sm">
                        <img 
                          src={logo} 
                          alt={model.model_name} 
                          className="h-full w-full object-contain"
                        />
                      </div>
                    )}
                    <div className="flex flex-col gap-1 flex-1">
                      <span className="font-medium">{model.model_name}</span>
                      {stats && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Coins className="w-3.5 h-3.5" />
                            <span>{stats.cost}</span>
                          </div>
                          {stats.duration && (
                            <div className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              <span>~{stats.duration}s</span>
                            </div>
                          )}
                          {stats.outputs && (
                            <div className="flex items-center gap-1">
                              <ImageIcon className="w-3.5 h-3.5" />
                              <span>×{stats.outputs}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </DropdownMenuItem>
              );
            } else {
              // Multi-model family - cascading submenu
              return (
                <DropdownMenuSub key={family}>
                  <DropdownMenuSubTrigger className="cursor-pointer p-4">
                    <div className="flex items-center gap-3 w-full">
                      {logo && (
                        <div className="h-10 w-10 rounded bg-white/90 dark:bg-white/95 p-1 flex items-center justify-center flex-shrink-0 shadow-sm">
                          <img 
                            src={logo} 
                            alt={family} 
                            className="h-full w-full object-contain"
                          />
                        </div>
                      )}
                      <div className="flex flex-col gap-1 flex-1">
                        <span className="font-medium">{family}</span>
                        {stats && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Coins className="w-3.5 h-3.5" />
                              <span>{stats.cost}+</span>
                            </div>
                            {stats.duration && (
                              <div className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                <span>~{stats.duration}s+</span>
                              </div>
                            )}
                            {stats.outputs && (
                              <div className="flex items-center gap-1">
                                <ImageIcon className="w-3.5 h-3.5" />
                                <span>×{stats.outputs}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="bg-background border-border z-50 p-2">
                    {familyModels.map((model) => (
                      <DropdownMenuItem
                        key={model.record_id}
                        onClick={() => onModelChange(model.record_id)}
                        className="cursor-pointer p-3"
                      >
                        <div className="flex flex-col gap-1">
                          <span className="font-medium">
                            {model.variant_name || model.model_name}
                          </span>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Coins className="w-3.5 h-3.5" />
                              <span>{model.base_token_cost}</span>
                            </div>
                            {model.estimated_time_seconds && (
                              <div className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                <span>~{model.estimated_time_seconds}s</span>
                              </div>
                            )}
                            {model.default_outputs && (
                              <div className="flex items-center gap-1">
                                <ImageIcon className="w-3.5 h-3.5" />
                                <span>×{model.default_outputs}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              );
            }
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
