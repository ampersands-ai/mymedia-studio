import { useState, useEffect, useMemo } from "react";
import { AIModel } from "@/hooks/useModels";
import { CreationGroup } from "@/constants/creation-groups";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Coins, Clock, Image as ImageIcon } from "lucide-react";
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
  const [selectedFamily, setSelectedFamily] = useState<string | null>(null);

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

  // Get family of currently selected model
  const currentModel = models.find(m => m.record_id === selectedModel);
  
  // Initialize family from selected model or first available family (only once)
  useEffect(() => {
    if (selectedFamily) return; // Don't change if already set
    
    if (currentModel?.model_family) {
      setSelectedFamily(currentModel.model_family);
    } else if (Object.keys(modelsByFamily).length > 0 && !selectedModel) {
      // Only set first family if there's no model selected at all
      const firstFamily = Object.keys(modelsByFamily).sort()[0];
      setSelectedFamily(firstFamily);
    }
  }, [currentModel?.model_family, modelsByFamily, selectedModel, selectedFamily]);

  // Update family when selected model changes to a different family
  useEffect(() => {
    if (currentModel?.model_family && currentModel.model_family !== selectedFamily) {
      setSelectedFamily(currentModel.model_family);
    }
  }, [currentModel?.model_family, selectedFamily]);

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

  const handleFamilyChange = (family: string) => {
    setSelectedFamily(family);
    // Auto-select first model in new family
    if (modelsByFamily[family] && modelsByFamily[family].length > 0) {
      onModelChange(modelsByFamily[family][0].record_id);
    }
  };

  const variantsInSelectedFamily = selectedFamily ? modelsByFamily[selectedFamily] || [] : [];

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
    <div className="space-y-4">
      {/* Family Selector */}
      <div className="space-y-2">
        <Label>Model Family</Label>
        <Select value={selectedFamily || undefined} onValueChange={handleFamilyChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a model family" />
          </SelectTrigger>
          <SelectContent className="bg-background border-border">
            {Object.keys(modelsByFamily).sort().map((family) => {
              const logo = getFamilyLogo(family);
              const stats = getFamilyStats(family);
              
              return (
                <SelectItem key={family} value={family}>
                  <div className="flex items-center gap-2 flex-wrap">
                    {logo && (
                      <div className="h-5 w-5 rounded bg-white/90 dark:bg-white/95 p-0.5 flex items-center justify-center flex-shrink-0 shadow-sm">
                        <img 
                          src={logo} 
                          alt={family} 
                          className="h-full w-full object-contain"
                        />
                      </div>
                    )}
                    <span className="font-medium">{family}</span>
                    {stats && (
                      <>
                        <Badge variant="value" className="text-xs">
                          {stats.cost}💰{stats.hasMultipleVariants && '+'}
                        </Badge>
                        {stats.duration && (
                          <Badge variant="secondary" className="text-xs">
                            ~{stats.duration}s
                          </Badge>
                        )}
                        {stats.outputs && (
                          <Badge variant="secondary" className="text-xs">
                            ×{stats.outputs}
                          </Badge>
                        )}
                      </>
                    )}
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Compact Variant Selector - only show if more than 1 variant */}
      {selectedFamily && variantsInSelectedFamily.length > 1 && (
        <div className="space-y-2">
          <Label className="text-sm">Select Variant</Label>
          <Select
            value={selectedModel || undefined}
            onValueChange={onModelChange}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose a variant" />
            </SelectTrigger>
            <SelectContent className="bg-background border-border">
              {variantsInSelectedFamily.map((model) => (
                <SelectItem key={model.record_id} value={model.record_id}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">
                      {model.variant_name || model.model_name}
                    </span>
                    <Badge variant="value" className="text-xs">
                      {model.base_token_cost}💰
                    </Badge>
                    {model.estimated_time_seconds && (
                      <Badge variant="secondary" className="text-xs">
                        ~{model.estimated_time_seconds}s
                      </Badge>
                    )}
                    {model.default_outputs && (
                      <Badge variant="secondary" className="text-xs">
                        ×{model.default_outputs}
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Empty State */}
      {selectedFamily && variantsInSelectedFamily.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No models available in this family for the selected content type.
        </div>
      )}
    </div>
  );
};
