import { useState, useEffect } from "react";
import type { WorkflowTemplatePublic } from "@/types/workflow-public";
import { logger } from "@/lib/logger";
import { getModel } from "@/lib/models/registry";

/**
 * Hook to calculate estimated token cost for a workflow template
 * Uses primary_model_record_id from the public view (workflow_steps are server-only)
 */
export const useWorkflowTokenCost = (
  workflow: WorkflowTemplatePublic,
  userInputs: Record<string, any>
) => {
  const [estimatedTokens, setEstimatedTokens] = useState(50);
  const [isCalculating, setIsCalculating] = useState(false);

  useEffect(() => {
    const calculateCost = async () => {
      setIsCalculating(true);

      try {
        // Use primary_model_record_id from public view
        const primaryModelRecordId = workflow.primary_model_record_id;

        if (!primaryModelRecordId) {
          setEstimatedTokens(50);
          setIsCalculating(false);
          return;
        }

        let modelModule;
        try {
          modelModule = getModel(primaryModelRecordId);
        } catch (error) {
          logger.warn('Model not found in registry', {
            recordId: primaryModelRecordId,
            workflowId: workflow.id
          });
          setEstimatedTokens(50);
          setIsCalculating(false);
          return;
        }

        // Start with base cost from MODEL_CONFIG
        let totalCost = modelModule.MODEL_CONFIG.baseCreditCost;

        // Apply multipliers based on user inputs
        const multipliers = modelModule.MODEL_CONFIG.costMultipliers || {};
        for (const [paramName, multiplierConfig] of Object.entries(multipliers)) {
          const paramValue = userInputs[paramName];

          if (paramValue === undefined || paramValue === null) continue;

          // Handle nested object (parameter-first structure)
          if (typeof multiplierConfig === "object" && !Array.isArray(multiplierConfig)) {
            const multiplier = (multiplierConfig as Record<string, number>)[paramValue] ?? 1;
            if (typeof multiplier === "number") {
              totalCost *= multiplier;
            }
          }
          // Legacy: Handle flat number
          else if (typeof multiplierConfig === "number") {
            if (typeof paramValue === "boolean" && paramValue === true) {
              totalCost *= multiplierConfig;
            } else if (Array.isArray(paramValue)) {
              totalCost += multiplierConfig * paramValue.length;
            } else if (typeof paramValue === "number") {
              totalCost += multiplierConfig * paramValue;
            }
          }
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
