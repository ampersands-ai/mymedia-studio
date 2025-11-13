import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useGeneration } from '@/hooks/useGeneration';
import { useGenerationPolling } from '@/hooks/useGenerationPolling';
import { useNavigate } from 'react-router-dom';
import type { GenerationOutput } from '@/types/custom-creation';
import { executeGeneration } from '@/lib/generation/executeGeneration';
import { getMaxPromptLength } from '@/lib/custom-creation-utils';
import { logger } from '@/lib/logger';

interface TestResult {
  model_id: string;
  model_name: string;
  status: 'success' | 'failed' | 'error';
  latency_ms?: number;
  error_message?: string;
  output_url?: string;
}

interface TestSummary {
  total: number;
  successful: number;
  failed: number;
  average_latency: number;
}

export const useTestModelGroup = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [summary, setSummary] = useState<TestSummary | null>(null);
  const { toast } = useToast();
  const { generate } = useGeneration();
  const navigate = useNavigate();
  
  // Ref to hold the current promise resolver
  const resolverRef = useRef<((value: { outputs: GenerationOutput[], error?: string }) => void) | null>(null);

  // Use EXACT SAME polling hook as CustomCreation.tsx (line 13, 83)
  const { startPolling } = useGenerationPolling({
    onComplete: (outputs, parentId) => {
      if (resolverRef.current) {
        resolverRef.current({ outputs });
        resolverRef.current = null;
      }
    },
    onError: (error) => {
      if (resolverRef.current) {
        resolverRef.current({ outputs: [], error });
        resolverRef.current = null;
      }
    },
    onTimeout: () => {
      if (resolverRef.current) {
        resolverRef.current({ outputs: [], error: 'Timeout after 20 minutes' });
        resolverRef.current = null;
      }
    }
  });

  const testGroup = async (group: string) => {
    setIsLoading(true);
    setResults([]);
    setSummary(null);

    try {
      toast({
        title: "Starting bulk tests",
        description: `Testing all models in group: ${group}`,
      });

      // Fetch all active models with full schema for validation (EXACT SAME as production needs)
      const { data: models, error: modelsError } = await supabase
        .from('ai_models')
        .select('id, record_id, model_name, provider, input_schema, content_type, groups, max_images')
        .contains('groups', [group])
        .eq('is_active', true);

      if (modelsError) throw modelsError;

      if (!models || models.length === 0) {
        throw new Error(`No active models found in group: ${group}`);
      }

      const testResults: TestResult[] = [];
      let successCount = 0;
      let totalLatency = 0;

      // Test each model sequentially using EXACT SAME PIPELINE as CustomCreation
      for (const model of models) {
        const startTime = Date.now();
        
        try {
          // NO-OP image upload for test (returns empty array)
          const noOpUploadImages = async (userId: string): Promise<string[]> => [];
          
          // Get max prompt length for this model (SAME logic as production)
          const maxPromptLength = getMaxPromptLength(model, undefined);

          // Use EXACT SAME generation pipeline as CustomCreation.tsx
          const generationId = await executeGeneration({
            model,
            prompt: "", // Empty by default - will trigger validation errors same as production
            modelParameters: {}, // No default parameters - will trigger validation errors same as production
            uploadedImages: [],
            enhancePrompt: false,
            userId: "test-user-id", // Test user ID (not used since no uploads)
            uploadImagesToStorage: noOpUploadImages,
            generate,
            startPolling,
            navigate,
            maxPromptLength,
          });

          // Wait for polling to complete using the shared hook
          const pollResult = await new Promise<{ outputs: GenerationOutput[], error?: string }>((resolve) => {
            resolverRef.current = resolve;
            startPolling(generationId);
          });

          const latency = Date.now() - startTime;

          if (pollResult.error) {
            testResults.push({
              model_id: model.id,
              model_name: model.model_name,
              status: 'failed',
              latency_ms: latency,
              error_message: pollResult.error,
            });
          } else {
            successCount++;
            totalLatency += latency;
            testResults.push({
              model_id: model.id,
              model_name: model.model_name,
              status: 'success',
              latency_ms: latency,
              output_url: pollResult.outputs[0]?.storage_path,
            });
          }
        } catch (error) {
          const latency = Date.now() - startTime;
          testResults.push({
            model_id: model.id,
            model_name: model.model_name,
            status: 'error',
            latency_ms: latency,
            error_message: error.message || 'Unknown error',
          });
        }
      }

      setResults(testResults);

      const testSummary: TestSummary = {
        total: models.length,
        successful: successCount,
        failed: models.length - successCount,
        average_latency: successCount > 0 ? Math.round(totalLatency / successCount) : 0,
      };

      setSummary(testSummary);

      toast({
        title: "Tests completed",
        description: `${testSummary.successful}/${testSummary.total} models passed`,
      });

      return { results: testResults, summary: testSummary };
    } catch (error) {
      logger.error('Error testing model group', error instanceof Error ? error : new Error(String(error)), {
        component: 'useTestModelGroup',
        operation: 'testGroup',
        group
      });
      toast({
        title: "Test failed",
        description: error instanceof Error ? error.message : "Failed to test models",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    testGroup,
    isLoading,
    results,
    summary,
  };
};
