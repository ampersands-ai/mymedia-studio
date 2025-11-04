import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertTriangle, Eye, TrendingUp, DollarSign, Activity } from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

interface ThresholdBreach {
  id: string;
  generation_id: string;
  model_id: string;
  kie_credits_consumed: number;
  our_tokens_charged: number;
  credit_multiplier: number;
  api_request_payload: any;
  api_callback_payload: any;
  created_at: string;
  processing_time_seconds: number;
  task_status: string;
}

export default function ThresholdBreach() {
  const [selectedBreach, setSelectedBreach] = useState<ThresholdBreach | null>(null);

  const { data: breaches, isLoading } = useQuery({
    queryKey: ['threshold-breaches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kie_credit_audits')
        .select('*')
        .eq('is_threshold_breach', true)
        .order('credit_multiplier', { ascending: false });
      
      if (error) throw error;
      return data as ThresholdBreach[];
    }
  });

  const { data: allAudits } = useQuery({
    queryKey: ['all-audits-summary'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kie_credit_audits')
        .select('kie_credits_consumed, our_tokens_charged, credit_multiplier, is_threshold_breach');
      
      if (error) throw error;
      return data;
    }
  });

  // Calculate summary statistics
  const stats = {
    totalBreaches: breaches?.length || 0,
    totalExcessCredits: breaches?.reduce((sum, b) => sum + (b.kie_credits_consumed - b.our_tokens_charged), 0) || 0,
    avgMultiplier: breaches?.length 
      ? (breaches.reduce((sum, b) => sum + b.credit_multiplier, 0) / breaches.length).toFixed(2)
      : '0',
    totalAudits: allAudits?.length || 0
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-destructive/10">
          <AlertTriangle className="h-6 w-6 text-destructive" />
        </div>
        <div>
          <h1 className="text-3xl font-black">Threshold Breach</h1>
          <p className="text-muted-foreground">
            Credits where Kie AI charged more than our credit calculation
          </p>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="brutal-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Total Breaches
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">{stats.totalBreaches}</div>
            <p className="text-xs text-muted-foreground mt-1">
              out of {stats.totalAudits} total generations
            </p>
          </CardContent>
        </Card>

        <Card className="brutal-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-warning" />
              Excess Credits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">{stats.totalExcessCredits.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              credits overcharged
            </p>
          </CardContent>
        </Card>

        <Card className="brutal-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Avg Multiplier
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">{stats.avgMultiplier}x</div>
            <p className="text-xs text-muted-foreground mt-1">
              average breach ratio
            </p>
          </CardContent>
        </Card>

        <Card className="brutal-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Activity className="h-4 w-4 text-accent" />
              Breach Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">
              {stats.totalAudits > 0 ? ((stats.totalBreaches / stats.totalAudits) * 100).toFixed(1) : '0'}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              of all generations
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Breaches Table */}
      <Card className="brutal-card">
        <CardHeader>
          <CardTitle>Breach Records</CardTitle>
          <CardDescription>
            Generations where kie_credits_consumed &gt; (our_tokens_charged / 24)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : breaches && breaches.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Generation ID</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Our Credits</TableHead>
                    <TableHead className="text-right">Kie Credits</TableHead>
                    <TableHead className="text-right">Multiplier</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {breaches.map((breach) => (
                    <TableRow key={breach.id}>
                      <TableCell className="font-mono text-xs">
                        {breach.generation_id.slice(0, 8)}...
                      </TableCell>
                      <TableCell className="font-bold">{breach.model_id}</TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(breach.created_at), 'MMM d, HH:mm')}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {breach.our_tokens_charged}
                      </TableCell>
                      <TableCell className="text-right font-bold text-destructive">
                        {breach.kie_credits_consumed}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="destructive" className="font-bold">
                          {breach.credit_multiplier}x
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={breach.task_status === 'success' ? 'default' : 'secondary'}>
                          {breach.task_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedBreach(breach)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-bold">No threshold breaches found</p>
              <p className="text-sm text-muted-foreground">
                All credit charges are within expected ranges
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details Modal */}
      <Dialog open={!!selectedBreach} onOpenChange={() => setSelectedBreach(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Breach Details</DialogTitle>
            <DialogDescription>
              Complete API request and response payloads
            </DialogDescription>
          </DialogHeader>
          
          {selectedBreach && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-bold text-muted-foreground">Generation ID</p>
                  <p className="font-mono text-sm">{selectedBreach.generation_id}</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-muted-foreground">Model</p>
                  <p className="font-bold">{selectedBreach.model_id}</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-muted-foreground">Our Credits</p>
                  <p className="text-lg font-black">{selectedBreach.our_tokens_charged}</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-muted-foreground">Kie Credits</p>
                  <p className="text-lg font-black text-destructive">{selectedBreach.kie_credits_consumed}</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-muted-foreground">Multiplier</p>
                  <Badge variant="destructive" className="text-lg font-black">
                    {selectedBreach.credit_multiplier}x
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-bold text-muted-foreground">Processing Time</p>
                  <p className="font-bold">{selectedBreach.processing_time_seconds}s</p>
                </div>
              </div>

              {/* API Request */}
              <div>
                <h3 className="font-black text-lg mb-2">API Request Payload</h3>
                <div className="bg-muted p-4 rounded-lg overflow-x-auto">
                  <pre className="text-xs font-mono">
                    {JSON.stringify(selectedBreach.api_request_payload, null, 2)}
                  </pre>
                </div>
              </div>

              {/* API Response */}
              <div>
                <h3 className="font-black text-lg mb-2">API Callback Payload</h3>
                <div className="bg-muted p-4 rounded-lg overflow-x-auto">
                  <pre className="text-xs font-mono">
                    {JSON.stringify(selectedBreach.api_callback_payload, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
