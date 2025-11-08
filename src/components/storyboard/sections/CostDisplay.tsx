import { Coins } from 'lucide-react';

interface CostDisplayProps {
  duration: number;
  estimatedCost: number;
  tokensRemaining: number;
}

export function CostDisplay({ duration, estimatedCost, tokensRemaining }: CostDisplayProps) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-sm">
          <Coins className="w-4 h-4 text-primary" />
          <span>Estimated render cost: <span className="font-bold">{estimatedCost.toFixed(2)}</span> credits</span>
        </div>
        <p className="text-xs text-muted-foreground ml-6">
          Credits charged when you render the video. Cost based on {duration}s duration.
        </p>
      </div>
      <span className="text-sm">
        Balance: <span className="font-bold">{tokensRemaining.toFixed(2)}</span>
      </span>
    </div>
  );
}
