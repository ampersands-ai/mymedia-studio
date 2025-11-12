import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertTriangle, Download } from "lucide-react";
import { StuckGeneration } from "@/hooks/admin/useWebhookMonitoring";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";
import { logger } from "@/lib/logger";

interface WebhookActionsPanelProps {
  stuckGenerations: StuckGeneration[];
  onRefresh: () => void;
}

export const WebhookActionsPanel = ({ stuckGenerations, onRefresh }: WebhookActionsPanelProps) => {
  const [fixing, setFixing] = useState(false);

  const handleFixStuckGenerations = async () => {
    if (stuckGenerations.length === 0) {
      toast.info('No stuck generations to fix');
      return;
    }

    setFixing(true);
    try {
      // Update all stuck generations to failed
      const { error: updateError } = await supabase
        .from('generations')
        .update({ 
          status: 'failed',
          provider_response: {
            error: 'Auto-failed: Stuck in processing > 30min',
            timestamp: new Date().toISOString(),
            auto_fixed: true,
          }
        })
        .in('id', stuckGenerations.map(g => g.id));

      if (updateError) throw updateError;

      // Refund tokens for each stuck generation
      for (const gen of stuckGenerations) {
        const { error: refundError } = await supabase.rpc('increment_tokens', {
          user_id_param: gen.user_id,
          amount: gen.tokens_used
        });
        
        if (refundError) {
          logger.error('Token refund failed for stuck generation', refundError, {
            component: 'WebhookActionsPanel',
            generationId: gen.id,
            userId: gen.user_id,
            tokensToRefund: gen.tokens_used,
            operation: 'refundTokens'
          });
        }
      }

      toast.success(`Fixed ${stuckGenerations.length} stuck generation${stuckGenerations.length > 1 ? 's' : ''} and refunded tokens`);
      onRefresh();
    } catch (error: any) {
      logger.error('Stuck generations fix operation failed', error, {
        component: 'WebhookActionsPanel',
        stuckCount: stuckGenerations.length,
        generationIds: stuckGenerations.map(g => g.id),
        operation: 'fixStuckGenerations'
      });
      toast.error(`Failed to fix stuck generations: ${error.message}`);
    } finally {
      setFixing(false);
    }
  };

  const handleExportLogs = () => {
    toast.info('Export functionality coming soon');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
        <CardDescription>Bulk operations and maintenance tools</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="outline"
            onClick={onRefresh}
            className="flex-1"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh All Data
          </Button>

          <Button
            variant={stuckGenerations.length > 0 ? "destructive" : "outline"}
            onClick={handleFixStuckGenerations}
            disabled={stuckGenerations.length === 0 || fixing}
            className="flex-1"
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            {fixing 
              ? 'Fixing...' 
              : `Fix Stuck (${stuckGenerations.length})`
            }
          </Button>

          <Button
            variant="outline"
            onClick={handleExportLogs}
            className="flex-1"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Logs
          </Button>
        </div>

        <div className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
          <strong>Note:</strong> "Fix Stuck" will mark all generations processing for &gt;30 minutes as failed and refund tokens to users.
        </div>
      </CardContent>
    </Card>
  );
};
