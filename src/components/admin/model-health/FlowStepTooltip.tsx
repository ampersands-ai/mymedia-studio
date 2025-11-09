import { FlowStep } from "@/types/admin/model-health";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";

interface FlowStepTooltipProps {
  step: FlowStep;
  children: React.ReactNode;
}

export const FlowStepTooltip = ({ step, children }: FlowStepTooltipProps) => {
  const hasDetails = step.hover_data || Object.keys(step.data || {}).length > 0;

  if (!hasDetails) {
    return <>{children}</>;
  }

  const renderValue = (value: any): string => {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  };

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent 
          side="right" 
          align="start"
          className="max-w-md p-4 bg-popover border-border"
        >
          <ScrollArea className="max-h-96">
            <div className="space-y-3">
              {step.hover_data && (
                <>
                  <div className="font-semibold text-sm text-foreground">
                    {step.hover_data.title}
                  </div>
                  {step.hover_data.preview_url && (
                    <div className="rounded overflow-hidden border border-border">
                      <img 
                        src={step.hover_data.preview_url} 
                        alt="Preview"
                        className="w-full h-auto max-h-32 object-cover"
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    {Object.entries(step.hover_data.details).map(([key, value]) => (
                      <div key={key} className="text-xs">
                        <span className="text-muted-foreground font-medium">
                          {key.replace(/_/g, ' ')}:
                        </span>
                        <div className="mt-0.5 font-mono text-foreground/90 whitespace-pre-wrap break-all">
                          {renderValue(value)}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
              
              {!step.hover_data && step.data && (
                <div className="space-y-2">
                  {Object.entries(step.data).map(([key, value]) => (
                    <div key={key} className="text-xs">
                      <span className="text-muted-foreground font-medium">
                        {key.replace(/_/g, ' ')}:
                      </span>
                      <div className="mt-0.5 font-mono text-foreground/90 whitespace-pre-wrap break-all">
                        {renderValue(value)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
