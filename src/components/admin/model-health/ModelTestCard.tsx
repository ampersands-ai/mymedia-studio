import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlayCircle, Settings, History, Clock } from "lucide-react";
import type { ModelHealthSummary } from "@/types/admin/model-health";
import { CREATION_GROUPS } from "@/constants/creation-groups";
import { formatDistanceToNow } from "date-fns";

interface ModelTestCardProps {
  model: ModelHealthSummary;
  onTest: () => void;
  onConfigure: () => void;
  onViewHistory: () => void;
  onSchedule?: () => void;
  isLoading?: boolean;
}

export const ModelTestCard = ({
  model,
  onTest,
  onConfigure,
  onViewHistory,
  onSchedule,
  isLoading = false,
}: ModelTestCardProps) => {
  const getStatusColor = () => {
    if (!model.last_test_at) return "bg-muted";
    if ((model.success_rate_percent_24h || 0) >= 95) return "bg-green-500";
    if ((model.success_rate_percent_24h || 0) >= 80) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getStatusLabel = () => {
    if (!model.last_test_at) return "Never Tested";
    if ((model.success_rate_percent_24h || 0) >= 95) return "Healthy";
    if ((model.success_rate_percent_24h || 0) >= 80) return "Warning";
    return "Critical";
  };

  return (
    <Card 
      className="relative cursor-pointer hover:shadow-lg transition-shadow"
      onClick={() => !isLoading && model.is_active && onTest()}
    >
      <div className={`absolute top-0 left-0 w-full h-1 rounded-t-lg ${getStatusColor()}`} />
      
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{model.model_name}</CardTitle>
            <div className="flex gap-2 mt-1">
              <Badge variant="outline" className="text-xs">
                {model.provider}
              </Badge>
          <Badge variant="outline" className="text-xs">
            {model.groups?.[0] 
              ? CREATION_GROUPS.find(g => g.id === model.groups[0])?.label || model.content_type
              : model.content_type}
          </Badge>
            </div>
          </div>
          <Badge variant={model.is_active ? "default" : "secondary"} className="text-xs">
            {model.is_active ? "Active" : "Inactive"}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Status:</span>
            <span className="font-medium">{getStatusLabel()}</span>
          </div>
          
          {model.last_test_at && (
            <>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last Test:</span>
                <span className="font-medium">
                  {formatDistanceToNow(new Date(model.last_test_at), { addSuffix: true })}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-muted-foreground">Success Rate:</span>
                <span className="font-medium">{model.success_rate_percent_24h?.toFixed(1)}%</span>
              </div>
              
              {model.avg_latency_ms !== null && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Avg Latency:</span>
                  <span className="font-medium">{(model.avg_latency_ms / 1000).toFixed(1)}s</span>
                </div>
              )}
              
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tests (24h):</span>
                <span className="font-medium">
                  {model.successful_tests_24h}/{model.total_tests_24h}
                </span>
              </div>
            </>
          )}
        </div>
        
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onTest();
            }}
            disabled={isLoading || !model.is_active}
            className="flex-1"
          >
            <PlayCircle className="h-4 w-4 mr-1" />
            Test
          </Button>
          
          <Button 
            size="sm" 
            variant="outline" 
            onClick={(e) => {
              e.stopPropagation();
              onConfigure();
            }}
          >
            <Settings className="h-4 w-4" />
          </Button>
          
          <Button 
            size="sm" 
            variant="outline" 
            onClick={(e) => {
              e.stopPropagation();
              onViewHistory();
            }}
          >
            <History className="h-4 w-4" />
          </Button>

          {onSchedule && (
            <Button 
              size="sm" 
              variant="outline" 
              onClick={(e) => {
                e.stopPropagation();
                onSchedule();
              }}
            >
              <Clock className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
