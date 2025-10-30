import { Card } from "@/components/ui/card";
import { AlertCircle, CheckCircle, Coins } from "lucide-react";
import { cn } from "@/lib/utils";

interface TokenCostPreviewProps {
  baseCost: number;
  totalCost: number;
  userTokens: number;
  breakdown?: Array<{ parameter: string; multiplier: number }>;
  className?: string;
}

export const TokenCostPreview = ({ 
  baseCost, 
  totalCost, 
  userTokens, 
  breakdown = [],
  className 
}: TokenCostPreviewProps) => {
  const hasEnoughTokens = userTokens >= totalCost;
  const tokensAfter = userTokens - totalCost;

  return (
    <Card className={cn(
      "p-4 border-2 transition-all",
      hasEnoughTokens ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50",
      className
    )}>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          {hasEnoughTokens ? (
            <CheckCircle className="h-5 w-5 text-green-600" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-600" />
          )}
          <h3 className="font-bold text-base">Token Cost</h3>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-neutral-600">Base cost:</span>
            <span className="font-semibold">{Number(baseCost).toFixed(2)} tokens</span>
          </div>

          {breakdown.length > 0 && (
            <>
              {breakdown.map((item, index) => (
                <div key={index} className="flex items-center justify-between text-sm pl-4">
                  <span className="text-neutral-500">+ {item.parameter}:</span>
                  <span className="text-neutral-600">×{item.multiplier.toFixed(2)}</span>
                </div>
              ))}
            </>
          )}

          <div className="pt-2 border-t border-neutral-200">
            <div className="flex items-center justify-between font-bold">
              <span>Total cost:</span>
              <span className="text-lg text-primary-500">{Number(totalCost).toFixed(2)} tokens</span>
            </div>
          </div>
        </div>

        <div className={cn(
          "p-3 rounded-lg border",
          hasEnoughTokens ? "bg-white border-green-200" : "bg-white border-red-200"
        )}>
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-neutral-600 flex items-center gap-1">
              <Coins className="h-4 w-4" />
              Your balance:
            </span>
            <span className="font-semibold">{Number(userTokens).toFixed(2)} tokens</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-neutral-600">After generation:</span>
            <span className={cn(
              "font-bold",
              hasEnoughTokens ? "text-green-600" : "text-red-600"
            )}>
              {hasEnoughTokens ? Number(tokensAfter).toFixed(2) : '0.00'} tokens
            </span>
          </div>
        </div>

        {!hasEnoughTokens && (
          <div className="text-xs text-red-600 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Not enough tokens. Please purchase more to continue.
          </div>
        )}
      </div>
    </Card>
  );
};
