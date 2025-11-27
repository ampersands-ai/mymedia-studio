import { useMemo, useState } from "react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Coins, Image as ImageIcon, ChevronDown, ChevronRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import type { AIModel } from "@/hooks/useModels";

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
  isLoading,
}) => {
  const isMobile = useIsMobile();
  const [mobileDialogOpen, setMobileDialogOpen] = useState(false);
  const [expandedFamilies, setExpandedFamilies] = useState<Record<string, boolean>>({});

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

  const handleModelSelect = (modelId: string) => {
    onModelChange(modelId);
    setMobileDialogOpen(false);
  };

  const toggleFamily = (family: string) => {
    setExpandedFamilies(prev => ({
      ...prev,
      [family]: !prev[family]
    }));
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

  // Mobile View - Dialog with Collapsible families
  if (isMobile) {
    return (
      <div className="space-y-2">
        <Label>Model</Label>
        <Button 
          variant="outline" 
          className="w-full justify-between"
          onClick={() => setMobileDialogOpen(true)}
        >
          {currentModel ? (
            <div className="flex items-center gap-3">
              {currentModel.logo_url && (
                <div className="h-8 w-8 rounded bg-white/90 dark:bg-white/95 p-1 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <img 
                    src={currentModel.logo_url} 
                    alt={currentModel.model_name} 
                    className="h-full w-full object-contain"
                  />
                </div>
              )}
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="font-medium truncate">{currentModel.model_name}</span>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-shrink-0">
                  <div className="flex items-center gap-0.5">
                    <Coins className="w-3 h-3" />
                    <span>{currentModel.base_token_cost}</span>
                  </div>
                  {currentModel.default_outputs && currentModel.default_outputs > 1 && (
                    <div className="flex items-center gap-0.5">
                      <ImageIcon className="w-3 h-3" />
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

        <Dialog open={mobileDialogOpen} onOpenChange={setMobileDialogOpen}>
          <DialogContent className="max-w-[90vw] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Select Model</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              {Object.keys(modelsByFamily).sort((a, b) => {
                const statsA = getFamilyStats(a);
                const statsB = getFamilyStats(b);
                if (!statsA || !statsB) return 0;
                return statsA.cost - statsB.cost;
              }).map((family) => {
                const familyModels = modelsByFamily[family];
                const isSingleModel = familyModels.length === 1;
                const logo = getFamilyLogo(family);
                const stats = getFamilyStats(family);
                
                if (isSingleModel) {
                  const model = familyModels[0];
                  const isSelected = selectedModel === model.record_id;
                  return (
                    <Button
                      key={family}
                      variant={isSelected ? "default" : "outline"}
                      className={cn(
                        "w-full justify-start h-auto p-3",
                        isSelected && "border-2 border-primary"
                      )}
                      onClick={() => handleModelSelect(model.record_id)}
                    >
                      <div className="flex items-center gap-2 w-full min-w-0">
                        {logo && (
                          <div className="h-7 w-7 rounded bg-white/90 dark:bg-white/95 p-1 flex items-center justify-center flex-shrink-0 shadow-sm">
                            <img 
                              src={logo} 
                              alt={model.model_name} 
                              className="h-full w-full object-contain"
                            />
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                          <span className="font-medium text-sm truncate">{model.model_name}</span>
                          {stats && (
                            <div className="flex items-center gap-1.5 text-xs flex-shrink-0">
                              <div className="flex items-center gap-0.5">
                                <Coins className="w-3 h-3" />
                                <span>{stats.cost}</span>
                              </div>
                              {stats.outputs && stats.outputs > 1 && (
                                <div className="flex items-center gap-0.5">
                                  <ImageIcon className="w-3 h-3" />
                                  <span>×{stats.outputs}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        {isSelected && (
                          <Check className="h-4 w-4 ml-auto flex-shrink-0" />
                        )}
                      </div>
                    </Button>
                  );
                } else {
                  return (
                    <Collapsible
                      key={family}
                      open={expandedFamilies[family]}
                      onOpenChange={() => toggleFamily(family)}
                    >
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="ghost"
                          className="w-full justify-between h-auto p-3 bg-muted/50"
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {logo && (
                              <div className="h-7 w-7 rounded bg-white/90 dark:bg-white/95 p-1 flex items-center justify-center flex-shrink-0 shadow-sm">
                                <img 
                                  src={logo} 
                                  alt={family} 
                                  className="h-full w-full object-contain"
                                />
                              </div>
                            )}
                            <div className="flex items-center gap-1.5 flex-1 min-w-0">
                              <span className="font-medium text-sm truncate">{family}</span>
                              {stats && (
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-shrink-0">
                                  <div className="flex items-center gap-0.5">
                                    <Coins className="w-3 h-3" />
                                    <span>{stats.cost}+</span>
                                  </div>
                                  {stats.outputs && stats.outputs > 1 && (
                                    <div className="flex items-center gap-0.5">
                                      <ImageIcon className="w-3 h-3" />
                                      <span>×{stats.outputs}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          <ChevronRight className={cn(
                            "h-4 w-4 shrink-0 transition-transform",
                            expandedFamilies[family] && "rotate-90"
                          )} />
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="space-y-1 mt-1 pl-4">
                        {familyModels.sort((a, b) => a.base_token_cost - b.base_token_cost).map((model) => {
                          const isSelected = selectedModel === model.record_id;
                          return (
                            <Button
                              key={model.record_id}
                              variant={isSelected ? "default" : "ghost"}
                              className={cn(
                                "w-full justify-start h-auto p-2",
                                isSelected && "border-2 border-primary"
                              )}
                              onClick={() => handleModelSelect(model.record_id)}
                            >
                              <div className="flex items-center gap-1.5 w-full min-w-0">
                                <span className="font-medium text-sm truncate">
                                  {model.variant_name || model.model_name}
                                </span>
                                <div className="flex items-center gap-1.5 text-xs flex-shrink-0">
                                  <div className="flex items-center gap-0.5">
                                    <Coins className="w-3 h-3" />
                                    <span>{model.base_token_cost}</span>
                                  </div>
                                  {model.default_outputs && model.default_outputs > 1 && (
                                    <div className="flex items-center gap-0.5">
                                      <ImageIcon className="w-3 h-3" />
                                      <span>×{model.default_outputs}</span>
                                    </div>
                                  )}
                                </div>
                                {isSelected && (
                                  <Check className="h-4 w-4 ml-auto flex-shrink-0" />
                                )}
                              </div>
                            </Button>
                          );
                        })}
                      </CollapsibleContent>
                    </Collapsible>
                  );
                }
              })}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Desktop View - Keep existing dropdown
  return (
    <div className="space-y-2">
      <Label>Model</Label>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-full justify-between">
            {currentModel ? (
              <div className="flex items-center gap-3">
                {currentModel.logo_url && (
                  <div className="h-8 w-8 rounded bg-white/90 dark:bg-white/95 p-1 flex items-center justify-center flex-shrink-0 shadow-sm">
                    <img 
                      src={currentModel.logo_url} 
                      alt={currentModel.model_name} 
                      className="h-full w-full object-contain"
                    />
                  </div>
                )}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="font-medium truncate">{currentModel.model_name}</span>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-shrink-0">
                    <div className="flex items-center gap-0.5">
                      <Coins className="w-3 h-3" />
                      <span>{currentModel.base_token_cost}</span>
                    </div>
                    {currentModel.default_outputs && currentModel.default_outputs > 1 && (
                      <div className="flex items-center gap-0.5">
                        <ImageIcon className="w-3 h-3" />
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
        <DropdownMenuContent className="w-[350px] bg-background border-border z-50 p-1">
          {Object.keys(modelsByFamily).sort((a, b) => {
            const statsA = getFamilyStats(a);
            const statsB = getFamilyStats(b);
            if (!statsA || !statsB) return 0;
            return statsA.cost - statsB.cost;
          }).map((family) => {
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
                  className="cursor-pointer p-3"
                >
                  <div className="flex items-center gap-2 w-full min-w-0">
                    {logo && (
                      <div className="h-7 w-7 rounded bg-white/90 dark:bg-white/95 p-1 flex items-center justify-center flex-shrink-0 shadow-sm">
                        <img 
                          src={logo} 
                          alt={model.model_name} 
                          className="h-full w-full object-contain"
                        />
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <span className="font-medium text-sm truncate">{model.model_name}</span>
                      {stats && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-shrink-0">
                          <div className="flex items-center gap-0.5">
                            <Coins className="w-3 h-3" />
                            <span>{stats.cost}</span>
                          </div>
                          {stats.outputs && stats.outputs > 1 && (
                            <div className="flex items-center gap-0.5">
                              <ImageIcon className="w-3 h-3" />
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
                  <DropdownMenuSubTrigger className="cursor-pointer p-3">
                    <div className="flex items-center gap-2 w-full min-w-0">
                      {logo && (
                        <div className="h-7 w-7 rounded bg-white/90 dark:bg-white/95 p-1 flex items-center justify-center flex-shrink-0 shadow-sm">
                          <img 
                            src={logo} 
                            alt={family} 
                            className="h-full w-full object-contain"
                          />
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        <span className="font-medium text-sm truncate">{family}</span>
                        {stats && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-shrink-0">
                            <div className="flex items-center gap-0.5">
                              <Coins className="w-3 h-3" />
                              <span>{stats.cost}+</span>
                            </div>
                            {stats.outputs && stats.outputs > 1 && (
                              <div className="flex items-center gap-0.5">
                                <ImageIcon className="w-3 h-3" />
                                <span>×{stats.outputs}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="bg-background border-border z-50 p-1">
                    {familyModels.sort((a, b) => a.base_token_cost - b.base_token_cost).map((model) => (
                      <DropdownMenuItem
                        key={model.record_id}
                        onClick={() => onModelChange(model.record_id)}
                        className="cursor-pointer p-2"
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-medium text-sm truncate">
                            {model.variant_name || model.model_name}
                          </span>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-shrink-0">
                            <div className="flex items-center gap-0.5">
                              <Coins className="w-3 h-3" />
                              <span>{model.base_token_cost}</span>
                            </div>
                            {model.default_outputs && model.default_outputs > 1 && (
                              <div className="flex items-center gap-0.5">
                                <ImageIcon className="w-3 h-3" />
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
