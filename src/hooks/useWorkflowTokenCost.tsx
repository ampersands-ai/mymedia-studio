import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { WorkflowTemplate } from "./useWorkflowTemplates";
import { logger } from "@/lib/logger";

export const useWorkflowTokenCost = (
  workflow: WorkflowTemplate,
  userInputs: Record<string, any>
) => {
  const [estimatedTokens, setEstimatedTokens] = useState(50);
  const [isCalculating, setIsCalculating] = useState(false);

  useEffect(() => {
    const calculateCost = async () => {
      setIsCalculating(true);

      try {
        // Fetch all models used in workflow
        const modelRecordIds = workflow.workflow_steps
          ?.map((step) => step.model_record_id)
          .filter(Boolean) || [];

        if (modelRecordIds.length === 0) {
          setEstimatedTokens(50);
          setIsCalculating(false);
          return;
        }

        const { data: models } = await supabase
          .from("ai_models")
          .select("record_id, base_token_cost, cost_multipliers, input_schema")
          .in("record_id", modelRecordIds);

        let totalCost = 0;

        for (const step of workflow.workflow_steps || []) {
          const model = models?.find((m) => m.record_id === step.model_record_id);
          if (!model) continue;

          // Start with base cost
          let stepCost = model.base_token_cost;

          // Resolve step parameters by merging static params with user inputs
          const resolvedParams = { ...step.parameters };
          for (const [paramKey, mappingSource] of Object.entries(step.input_mappings || {})) {
            // mappingSource like "user_input.image_url"
            if (typeof mappingSource === 'string' && mappingSource.startsWith("user_input.")) {
              const inputKey = mappingSource.replace("user_input.", "");
              resolvedParams[paramKey] = userInputs[inputKey];
            }
          }

          // Apply multipliers (exact same logic as CustomCreation and token-calculator.ts)
          const multipliers = model.cost_multipliers || {};
          for (const [paramName, multiplierConfig] of Object.entries(multipliers)) {
            const paramValue = resolvedParams[paramName];

            if (paramValue === undefined || paramValue === null) continue;

            // Handle nested object (parameter-first structure)
            if (typeof multiplierConfig === "object" && !Array.isArray(multiplierConfig)) {
              const multiplier = multiplierConfig[paramValue] ?? 1;
              if (typeof multiplier === "number") {
                stepCost *= multiplier;
              }
            }
            // Legacy: Handle flat number
            else if (typeof multiplierConfig === "number") {
              if (typeof paramValue === "boolean" && paramValue === true) {
                stepCost *= multiplierConfig;
              } else if (Array.isArray(paramValue)) {
                stepCost += multiplierConfig * paramValue.length;
              } else if (typeof paramValue === "number") {
                stepCost += multiplierConfig * paramValue;
              }
            }
          }

          totalCost += Math.round(stepCost * 100) / 100;
        }

        setEstimatedTokens(Math.round(totalCost * 100) / 100);
      } catch (error) {
        logger.error('Error calculating workflow credit cost', error as Error, {
          component: 'useWorkflowTokenCost',
          operation: 'calculateCost',
          workflowId: workflow.id
        });
        setEstimatedTokens(50);
      } finally {
        setIsCalculating(false);
      }
    };

    calculateCost();
  }, [workflow, userInputs]);

  return { estimatedTokens, isCalculating };
};
