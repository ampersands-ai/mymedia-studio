import { Badge } from "@/components/ui/badge";
import { Clock, Loader2, CheckCircle2, XCircle } from "lucide-react";

interface TestStatusHeaderProps {
  modelName: string | undefined;
  status: 'idle' | 'running' | 'completed' | 'error';
  startTime: number | null;
  endTime: number | null;
}

export const TestStatusHeader = ({ modelName, status, startTime, endTime }: TestStatusHeaderProps) => {
  const getStatusIcon = () => {
    switch (status) {
      case 'running':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'completed':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'error':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusVariant = (): "default" | "destructive" | "outline" | "secondary" => {
    switch (status) {
      case 'running':
        return 'secondary';
      case 'completed':
        return 'default';
      case 'error':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getElapsedTime = () => {
    if (!startTime) return null;
    const end = endTime || Date.now();
    const elapsed = Math.floor((end - startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
  };

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold">{modelName || 'Model Test'}</h1>
        {startTime && (
          <p className="text-sm text-muted-foreground mt-1">
            {status === 'running' ? 'Running for' : 'Completed in'}: {getElapsedTime()}
          </p>
        )}
      </div>
      <Badge variant={getStatusVariant()} className="flex items-center gap-2">
        {getStatusIcon()}
        {status === 'idle' ? 'Ready' : status}
      </Badge>
    </div>
  );
};
