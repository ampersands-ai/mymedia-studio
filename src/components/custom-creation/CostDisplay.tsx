import { Coins } from "lucide-react";
import { cn } from "@/lib/utils";

interface CostDisplayProps {
  cost: number;
  isPerSecondPricing?: boolean;
  hasAudioUploaded?: boolean;
  showPrefix?: boolean;
  className?: string;
}

/**
 * Reusable cost display component that handles per-second pricing formatting.
 * - For per-second pricing without audio: shows "X.X/s"
 * - For per-second pricing with audio uploaded: shows "~X.XX" (total estimated)
 * - For family headers with multiple variants: shows "X+" 
 * - Default: shows "X.XX"
 */
export const CostDisplay: React.FC<CostDisplayProps> = ({
  cost,
  isPerSecondPricing = false,
  hasAudioUploaded = false,
  showPrefix = false,
  className,
}) => {
  let displayValue: string;

  if (isPerSecondPricing && !hasAudioUploaded) {
    // Per-second pricing, no audio uploaded yet - show rate
    displayValue = `${cost.toFixed(1)}/s`;
  } else if (showPrefix) {
    // Family header with multiple variants - show minimum with "+"
    displayValue = `${cost}+`;
  } else {
    // Default or per-second with audio - show total estimate
    displayValue = cost.toFixed(2);
  }

  return (
    <span className={cn("flex items-center gap-0.5", className)}>
      <Coins className="w-3 h-3" />
      <span>{displayValue}</span>
    </span>
  );
};
