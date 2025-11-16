/**
 * Standard Hook Template
 * 
 * This template demonstrates the standardized pattern for creating hooks with:
 * - Zod validation for inputs/outputs
 * - Structured error handling
 * - Comprehensive logging with request IDs
 * - Performance timing
 * - Type safety
 * 
 * @example
 * ```typescript
 * // Copy this template and replace:
 * // - FEATURE_NAME with your feature (e.g., "Generation", "Workflow")
 * // - Input/Output schemas with your actual data structures
 * // - Query/mutation logic with your implementation
 * ```
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { logger, generateRequestId, PerformanceTimer } from "@/lib/logger";
import { handleError } from "@/lib/errors";
import type { QueryHookResult } from "@/types";

// ============= Validation Schemas =============

/**
 * Input validation schema
 */
const FeatureInputSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  enabled: z.boolean().default(true),
  // Add your fields here
});

/**
 * Output data schema
 */
const FeatureOutputSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  enabled: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
  // Add your fields here
});

// ============= Type Definitions =============

export type FeatureInput = z.infer<typeof FeatureInputSchema>;
export type FeatureOutput = z.infer<typeof FeatureOutputSchema>;

interface UseFeatureOptions {
  enabled?: boolean;
  refetchInterval?: number;
  onSuccess?: (data: FeatureOutput[]) => void;
  onError?: (error: Error) => void;
}

interface UseFeatureResult extends QueryHookResult<FeatureOutput[]> {
  createFeature: (input: FeatureInput) => void;
  updateFeature: (id: string, input: Partial<FeatureInput>) => void;
  deleteFeature: (id: string) => void;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
}

// ============= Main Hook =============

/**
 * Hook for managing FEATURE_NAME
 * 
 * @param options - Configuration options
 * @returns Query and mutation functions with loading states
 * 
 * @example
 * ```typescript
 * const { 
 *   data, 
 *   isLoading, 
 *   error, 
 *   createFeature 
 * } = useFeature({
 *   enabled: true,
 *   refetchInterval: 30000
 * });
 * ```
 */
export function useFeature(options: UseFeatureOptions = {}): UseFeatureResult {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const requestId = generateRequestId();

  // Create child logger with context
  const hookLogger = logger.child({
    hook: 'useFeature',
    requestId,
  });

  // ============= Query =============

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['features'],
    queryFn: async (): Promise<FeatureOutput[]> => {
      const timer = new PerformanceTimer('fetch-features', { requestId });

      try {
        hookLogger.info('Fetching features');

        const { data, error } = await supabase
          .from('features')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          throw error;
        }

        // Validate response data
        const validatedData = z.array(FeatureOutputSchema).parse(data);
        
        timer.end({ count: validatedData.length });
        hookLogger.info('Features fetched successfully', { 
          count: validatedData.length 
        });

        return validatedData;
      } catch (error) {
        const appError = handleError(error, {
          operation: 'fetch-features',
          requestId,
        });

        hookLogger.error('Failed to fetch features', error as Error, {
          errorCode: appError.code,
        });

        throw appError;
      }
    },
    enabled: options.enabled ?? true,
    refetchInterval: options.refetchInterval,
    staleTime: 20000,
    retry: 2,
  });

  // ============= Create Mutation =============

  const createMutation = useMutation({
    mutationFn: async (input: FeatureInput): Promise<FeatureOutput> => {
      const timer = new PerformanceTimer('create-feature', { requestId });

      try {
        // Validate input
        const validatedInput = FeatureInputSchema.parse(input);
        
        hookLogger.info('Creating feature', { 
          name: validatedInput.name 
        });

        const { data, error } = await supabase
          .from('features')
          .insert(validatedInput)
          .select()
          .single();

        if (error) {
          throw error;
        }

        // Validate response
        const validatedData = FeatureOutputSchema.parse(data);
        
        timer.end({ featureId: validatedData.id });
        hookLogger.info('Feature created successfully', { 
          featureId: validatedData.id 
        });

        return validatedData;
      } catch (error) {
        const appError = handleError(error, {
          operation: 'create-feature',
          requestId,
          input,
        });

        hookLogger.error('Failed to create feature', error as Error, {
          errorCode: appError.code,
        });

        throw appError;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['features'] });
      
      toast({
        title: "Feature created",
        description: `${data.name} has been created successfully.`,
      });

      options.onSuccess?.([data]);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create feature",
        description: error.message,
        variant: "destructive",
      });

      options.onError?.(error);
    },
  });

  // ============= Update Mutation =============

  const updateMutation = useMutation({
    mutationFn: async ({ 
      id, 
      input 
    }: { 
      id: string; 
      input: Partial<FeatureInput> 
    }): Promise<FeatureOutput> => {
      const timer = new PerformanceTimer('update-feature', { requestId, featureId: id });

      try {
        // Validate partial input
        const validatedInput = FeatureInputSchema.partial().parse(input);
        
        hookLogger.info('Updating feature', { 
          featureId: id,
          fields: Object.keys(validatedInput),
        });

        const { data, error } = await supabase
          .from('features')
          .update(validatedInput)
          .eq('id', id)
          .select()
          .single();

        if (error) {
          throw error;
        }

        const validatedData = FeatureOutputSchema.parse(data);
        
        timer.end();
        hookLogger.info('Feature updated successfully', { 
          featureId: id 
        });

        return validatedData;
      } catch (error) {
        const appError = handleError(error, {
          operation: 'update-feature',
          requestId,
          featureId: id,
          input,
        });

        hookLogger.error('Failed to update feature', error as Error, {
          errorCode: appError.code,
          featureId: id,
        });

        throw appError;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['features'] });
      
      toast({
        title: "Feature updated",
        description: `${data.name} has been updated successfully.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update feature",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // ============= Delete Mutation =============

  const deleteMutation = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const timer = new PerformanceTimer('delete-feature', { requestId, featureId: id });

      try {
        hookLogger.info('Deleting feature', { featureId: id });

        const { error } = await supabase
          .from('features')
          .delete()
          .eq('id', id);

        if (error) {
          throw error;
        }

        timer.end();
        hookLogger.info('Feature deleted successfully', { 
          featureId: id 
        });
      } catch (error) {
        const appError = handleError(error, {
          operation: 'delete-feature',
          requestId,
          featureId: id,
        });

        hookLogger.error('Failed to delete feature', error as Error, {
          errorCode: appError.code,
          featureId: id,
        });

        throw appError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['features'] });
      
      toast({
        title: "Feature deleted",
        description: "Feature has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete feature",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // ============= Return Interface =============

  return {
    data,
    isLoading,
    error: error as Error | null,
    refetch: async () => { await refetch(); },
    createFeature: createMutation.mutate,
    updateFeature: (id, input) => updateMutation.mutate({ id, input }),
    deleteFeature: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
