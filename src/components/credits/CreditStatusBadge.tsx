import { Badge } from "@/components/ui/badge";
import type { CreditStatus } from "@/types/credit-log";
import { CheckCircle2, Clock, RefreshCw, XCircle, AlertCircle } from "lucide-react";

interface CreditStatusBadgeProps {
  status: CreditStatus;
  amount: number;
  showAmount?: boolean;
}

const statusConfig: Record<CreditStatus, {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
  icon: React.ElementType;
  className: string;
}> = {
  charged: {
    label: "Charged",
    variant: "default",
    icon: CheckCircle2,
    className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30",
  },
  refunded: {
    label: "Refunded",
    variant: "secondary",
    icon: RefreshCw,
    className: "bg-muted/50 text-muted-foreground border-border hover:bg-muted",
  },
  pending_refund: {
    label: "Pending Refund",
    variant: "outline",
    icon: Clock,
    className: "bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/30",
  },
  reserved: {
    label: "Reserved",
    variant: "outline",
    icon: Clock,
    className: "bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30",
  },
  dispute_rejected: {
    label: "Dispute Rejected",
    variant: "destructive",
    icon: XCircle,
    className: "bg-destructive/20 text-destructive border-destructive/30 hover:bg-destructive/30",
  },
  failed: {
    label: "Failed",
    variant: "destructive",
    icon: AlertCircle,
    className: "bg-destructive/20 text-destructive border-destructive/30 hover:bg-destructive/30",
  },
};

export const CreditStatusBadge = ({ status, amount, showAmount = true }: CreditStatusBadgeProps) => {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge 
      variant={config.variant} 
      className={`gap-1.5 font-medium ${config.className}`}
    >
      <Icon className="h-3 w-3" />
      {showAmount && <span>{amount.toFixed(2)}</span>}
      <span className="text-xs opacity-80">{config.label}</span>
    </Badge>
  );
};
