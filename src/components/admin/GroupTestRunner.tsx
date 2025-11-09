import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PlayCircle, Loader2, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useTestModelGroup } from '@/hooks/useTestModelGroup';

export const GroupTestRunner = () => {
  const { testGroup, isLoading, results, summary } = useTestModelGroup();
  const [hasRun, setHasRun] = useState(false);

  const handleTest = async () => {
    setHasRun(true);
    await testGroup('text-to-image');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Text-to-Image Models Test</h2>
          <p className="text-muted-foreground">Run tests on all text-to-image models</p>
        </div>
        <Button
          onClick={handleTest}
          disabled={isLoading}
          size="lg"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Testing...
            </>
          ) : (
            <>
              <PlayCircle className="h-4 w-4 mr-2" />
              Run Tests
            </>
          )}
        </Button>
      </div>

      {summary && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Test Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-2xl font-bold">{summary.total}</div>
              <div className="text-sm text-muted-foreground">Total Models</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-500">{summary.successful}</div>
              <div className="text-sm text-muted-foreground">Successful</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-500">{summary.failed}</div>
              <div className="text-sm text-muted-foreground">Failed</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{summary.average_latency}ms</div>
              <div className="text-sm text-muted-foreground">Avg Latency</div>
            </div>
          </div>
        </Card>
      )}

      {hasRun && results.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Test Results</h3>
          <div className="space-y-3">
            {results.map((result, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 rounded-lg border bg-card"
              >
                <div className="flex items-center gap-3">
                  {result.status === 'success' ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  <div>
                    <div className="font-medium">{result.model_name}</div>
                    {result.error_message && (
                      <div className="text-sm text-red-500">{result.error_message}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {result.latency_ms && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      {result.latency_ms}ms
                    </div>
                  )}
                  <Badge variant={result.status === 'success' ? 'default' : 'destructive'}>
                    {result.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {isLoading && (
        <Card className="p-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </Card>
      )}
    </div>
  );
};
