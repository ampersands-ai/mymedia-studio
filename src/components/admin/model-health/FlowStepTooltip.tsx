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
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent 
          side="right" 
          align="start"
          className="max-w-lg p-0 bg-popover border-border shadow-lg"
        >
          <ScrollArea className="max-h-[400px]">
            <div className="p-4 space-y-3">
              {step.hover_data && (
                <>
                  <div className="font-semibold text-foreground pb-2 border-b">
                    {step.hover_data.title}
                  </div>
                  {step.hover_data.preview_url && (
                    <div className="rounded-md overflow-hidden border bg-muted/30">
                      <img 
                        src={step.hover_data.preview_url} 
                        alt="Preview"
                        className="w-full h-auto max-h-40 object-contain"
                      />
                    </div>
                  )}
                  <div className="space-y-2.5">
                    {Object.entries(step.hover_data.details).map(([key, value]) => (
                      <div key={key} className="text-xs space-y-1">
                        <div className="text-muted-foreground font-semibold uppercase tracking-wide text-[10px]">
                          {key.replace(/_/g, ' ')}
                        </div>
                        <div className="font-mono text-[11px] text-foreground bg-muted/50 rounded px-2 py-1.5 whitespace-pre-wrap break-all">
                          {renderValue(value)}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
              
              {!step.hover_data && step.data && (
                <div className="space-y-2.5">
                  {Object.entries(step.data).map(([key, value]) => (
                    <div key={key} className="text-xs space-y-1">
                      <div className="text-muted-foreground font-semibold uppercase tracking-wide text-[10px]">
                        {key.replace(/_/g, ' ')}
                      </div>
                      <div className="font-mono text-[11px] text-foreground bg-muted/50 rounded px-2 py-1.5 whitespace-pre-wrap break-all">
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
