import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, Download, CheckCircle2, XCircle } from "lucide-react";
import type { GenerationOutput } from "@/types/custom-creation";

interface TestResultsCardProps {
  status: 'running' | 'completed' | 'error';
  error: string | null;
  outputUrl: string | null;
  contentType: string;
  onRunNewTest: () => void;
  onDownloadReport: () => void;
  generationId: string | null;
}

export const TestResultsCard = ({ 
  status, 
  error, 
  outputUrl, 
  contentType,
  onRunNewTest,
  onDownloadReport,
  generationId
}: TestResultsCardProps) => {
  const getStatusIcon = () => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-success" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-destructive" />;
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getStatusIcon()}
          Test Results
        </CardTitle>
        <CardDescription>
          {status === 'completed' && 'Test completed successfully'}
          {status === 'error' && 'Test failed'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {outputUrl && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Generated Output:</p>
            {contentType === 'image' && (
              <img src={outputUrl} alt="Generated" className="rounded-lg max-w-full border border-border" />
            )}
            {contentType === 'video' && (
              <video src={outputUrl} controls className="rounded-lg max-w-full border border-border" />
            )}
            {contentType === 'audio' && (
              <audio src={outputUrl} controls className="w-full" />
            )}
          </div>
        )}

        <div className="flex gap-2">
          <Button onClick={onRunNewTest} variant="outline">
            Run New Test
          </Button>
          {generationId && (
            <Button variant="outline" onClick={onDownloadReport}>
              <Download className="h-4 w-4 mr-2" />
              Download Report
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
