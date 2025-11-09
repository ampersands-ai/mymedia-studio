import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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

  const testGroup = async (group: string) => {
    setIsLoading(true);
    setResults([]);
    setSummary(null);

    try {
      toast({
        title: "Starting bulk tests",
        description: `Testing all models in group: ${group}`,
      });

      const { data, error } = await supabase.functions.invoke('test-model-group', {
        body: { group },
      });

      if (error) throw error;

      setResults(data.results);
      setSummary(data.summary);

      toast({
        title: "Tests completed",
        description: `${data.summary.successful}/${data.summary.total} models passed`,
      });

      return data;
    } catch (error) {
      console.error('Error testing model group:', error);
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
