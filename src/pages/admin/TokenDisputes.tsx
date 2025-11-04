import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { format } from "date-fns";
import { AlertCircle, CheckCircle, Clock, XCircle, Image as ImageIcon, Video, Music, FileText, Bot, User } from "lucide-react";
import { useImageUrl, useVideoUrl } from "@/hooks/media";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface TokenDispute {
  id: string;
  generation_id: string;
  user_id: string;
  reason: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'rejected';
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  admin_notes: string | null;
  auto_resolved?: boolean;
  refund_amount?: number | null;
  generation: {
    type: string;
    prompt: string;
    output_url: string | null;
    storage_path: string | null;
    status: string;
    tokens_used: number;
    model_id: string | null;
    settings: any;
    workflow_execution_id?: string | null;
    provider_response?: {
      data?: {
        failMsg?: string;
      };
    };
  };
  profile: {
    email: string;
    full_name: string | null;
  };
}

const getContentIcon = (type: string) => {
  switch (type) {
    case "image": return ImageIcon;
    case "video": return Video;
    case "audio": return Music;
    case "text": return FileText;
    default: return FileText;
  }
};

const getStatusBadge = (status: string) => {
  const badges = {
    pending: <Badge className="bg-yellow-500 text-white"><Clock className="h-3 w-3 mr-1" />Pending</Badge>,
    reviewed: <Badge className="bg-blue-500 text-white"><AlertCircle className="h-3 w-3 mr-1" />Reviewed</Badge>,
    resolved: <Badge className="bg-green-500 text-white"><CheckCircle className="h-3 w-3 mr-1" />Resolved</Badge>,
    rejected: <Badge className="bg-red-500 text-white"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>,
  };
  return badges[status as keyof typeof badges] || badges.pending;
};

const GenerationPreview = ({ generation }: { generation: TokenDispute['generation'] }) => {
  // Use content-type-specific hooks
  const { url: imageUrl, isLoading: imageLoading } = useImageUrl(
    generation.type === 'image' ? generation.storage_path : null,
    { strategy: 'public-cdn', bucket: 'generated-content' }
  );
  const { url: videoUrl, isLoading: videoLoading } = useVideoUrl(
    generation.type === 'video' ? generation.storage_path : null,
    { strategy: 'public-direct', bucket: 'generated-content' }
  );
  
  const signedUrl = generation.type === 'image' ? imageUrl : videoUrl;
  const isLoading = imageLoading || videoLoading;

  if (generation.status === 'failed') {
    return (
      <div className="w-full aspect-video flex flex-col items-center justify-center bg-red-50 dark:bg-red-950/20 border-2 border-red-200 dark:border-red-800 rounded-lg">
        <AlertCircle className="h-12 w-12 text-red-500 mb-2" />
        <p className="text-sm font-medium text-red-700 dark:text-red-400">Generation Failed</p>
      </div>
    );
  }

  if (generation.type === 'image' && signedUrl) {
    return <img src={signedUrl} alt="Generated content" className="w-full max-h-48 object-cover rounded-lg border" />;
  }

  if (generation.type === 'video' && signedUrl) {
    return (
      <video 
        src={signedUrl} 
        controls 
        className="w-full max-h-48 object-cover rounded-lg border"
      />
    );
  }

  if (isLoading) {
    return (
      <div className="w-full max-h-48 flex items-center justify-center bg-muted rounded-lg">
        <div className="animate-pulse text-muted-foreground">Loading preview...</div>
      </div>
    );
  }

  return (
    <div className="w-full max-h-48 flex items-center justify-center bg-muted rounded-lg">
      <p className="text-muted-foreground">Preview not available</p>
    </div>
  );
};

export const TokenDisputes = () => {
  const [selectedDispute, setSelectedDispute] = useState<TokenDispute | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [newStatus, setNewStatus] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedDisputeIds, setSelectedDisputeIds] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'active' | 'history'>('active');
  const queryClient = useQueryClient();

  const { data: disputes, isLoading } = useQuery({
    queryKey: ['token-disputes', statusFilter, viewMode],
    queryFn: async () => {
      if (viewMode === 'history') {
        // Query history table
        let query = supabase
          .from('token_dispute_history')
          .select('*')
          .order('archived_at', { ascending: false });

        if (statusFilter !== 'all') {
          query = query.eq('status', statusFilter as 'resolved' | 'rejected');
        }

        const { data, error } = await query;
        if (error) throw error;
        
        // Transform history data to match TokenDispute interface
        return (data || []).map(item => ({
          ...item,
          generation: item.generation_snapshot,
          profile: item.profile_snapshot,
        })) as unknown as TokenDispute[];
      } else {
        // Query active disputes (only pending/reviewed)
        let query = supabase
          .from('token_dispute_reports')
          .select(`
            *,
            generation:generations(*),
            profile:profiles(email, full_name)
          `)
          .in('status', ['pending', 'reviewed'])
          .order('created_at', { ascending: false });

        if (statusFilter !== 'all') {
          query = query.eq('status', statusFilter as 'pending' | 'reviewed');
        }

        const { data, error } = await query;
        if (error) {
          console.error('Error fetching disputes:', error);
          throw error;
        }
        return data as unknown as TokenDispute[];
      }
    },
  });

  const updateDisputeMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes: string }) => {
      const { error } = await supabase
        .from('token_dispute_reports')
        .update({
          status: status as any,
          admin_notes: notes,
          reviewed_at: new Date().toISOString(),
          reviewed_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['token-disputes'] });
      toast.success('Dispute updated successfully');
      setSelectedDispute(null);
      setAdminNotes("");
      setNewStatus("");
    },
    onError: (error) => {
      toast.error('Failed to update dispute');
      console.error(error);
    },
  });

  const refundTokensMutation = useMutation({
    mutationFn: async ({ userId, amount, disputeId }: { userId: string; amount: number; disputeId: string }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-user-tokens`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          user_id: userId,
          amount: amount,
          action: 'add'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to refund credits');
      }

      // Update dispute with refund amount and mark as resolved
      const { error: updateError } = await supabase
        .from('token_dispute_reports')
        .update({ 
          refund_amount: amount,
          status: 'resolved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: session.user.id,
          admin_notes: `Refunded ${amount} credits`
        })
        .eq('id', disputeId);

      if (updateError) throw updateError;

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['token-disputes'] });
      toast.success('Credits refunded and dispute resolved');
      setSelectedDispute(null);
    },
    onError: (error) => {
      toast.error(`Failed to refund credits: ${error.message}`);
      console.error(error);
    },
  });

  const bulkUpdateDisputesMutation = useMutation({
    mutationFn: async ({ 
      disputeIds, 
      status, 
      shouldRefund 
    }: { 
      disputeIds: string[]; 
      status: string; 
      shouldRefund: boolean;
    }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      // Get dispute details for refunding
      const { data: disputes } = await supabase
        .from('token_dispute_reports')
        .select('id, user_id, generation:generations(tokens_used)')
        .in('id', disputeIds);

      // Refund credits if requested
      let refundedCount = 0;
      if (shouldRefund && disputes) {
        for (const dispute of disputes) {
          const credits = (dispute.generation as any)?.tokens_used || 0;
          if (credits > 0) {
            await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-user-tokens`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({
                user_id: dispute.user_id,
                amount: credits,
                action: 'add'
              }),
            });
            refundedCount++;
          }
        }
      }

      // Update all disputes with refund amount tracking
      const { error: updateError } = await supabase
        .from('token_dispute_reports')
        .update({ 
          status: status as 'resolved' | 'rejected',
          admin_notes: shouldRefund 
            ? `Bulk resolved with refund on ${format(new Date(), 'PPpp')}`
            : `Bulk ${status} on ${format(new Date(), 'PPpp')}`,
          reviewed_at: new Date().toISOString(),
          reviewed_by: session.user.id,
          refund_amount: shouldRefund ? disputes?.[0]?.generation?.tokens_used : null
        })
        .in('id', disputeIds);

      if (updateError) throw updateError;

      return { count: disputeIds.length, refunded: refundedCount };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['token-disputes'] });
      setSelectedDisputeIds([]);
      if (data.refunded > 0) {
        toast.success(`${data.count} disputes resolved, ${data.refunded} users refunded`);
      } else {
        toast.success(`${data.count} disputes updated`);
      }
    },
    onError: (error) => {
      toast.error(`Failed to process bulk action: ${error.message}`);
      console.error(error);
    },
  });

  const handleUpdateDispute = () => {
    if (!selectedDispute || !newStatus) {
      toast.error('Please select a status');
      return;
    }

    // Prevent updates in history view
    if (viewMode === 'history') {
      toast.error('Cannot modify archived disputes');
      return;
    }

    // Prevent re-resolving
    if (selectedDispute.status === 'resolved' || selectedDispute.status === 'rejected') {
      toast.error('This dispute has already been processed and cannot be modified');
      return;
    }

    updateDisputeMutation.mutate({
      id: selectedDispute.id,
      status: newStatus,
      notes: adminNotes,
    });
  };

  const handleRefundTokens = async () => {
    if (!selectedDispute) return;

    // Prevent refunds in history view
    if (viewMode === 'history') {
      toast.error('Cannot refund archived disputes');
      return;
    }

    // Check if already refunded
    if (selectedDispute.refund_amount && selectedDispute.refund_amount > 0) {
      toast.error(`Credits already refunded: ${selectedDispute.refund_amount} credits were previously refunded`);
      return;
    }

    // Check if this generation has a dispute in history (already resolved/refunded)
    const { data: historyDispute } = await supabase
      .from('token_dispute_history')
      .select('refund_amount, status')
      .eq('generation_id', selectedDispute.generation_id)
      .maybeSingle();

    if (historyDispute) {
      if (historyDispute.refund_amount && historyDispute.refund_amount > 0) {
        toast.error(`This generation was already refunded: ${historyDispute.refund_amount} credits were previously refunded`);
      } else {
        toast.error(`This generation already has a ${historyDispute.status} dispute in history`);
      }
      return;
    }
    
    if (confirm(`Refund ${selectedDispute.generation.tokens_used} credits to ${selectedDispute.profile.email}?`)) {
      refundTokensMutation.mutate({
        userId: selectedDispute.user_id,
        amount: selectedDispute.generation.tokens_used,
        disputeId: selectedDispute.id,
      });
    }
  };

  const handleBulkAction = async (action: 'resolve-refund' | 'resolve-no-refund' | 'reject') => {
    if (selectedDisputeIds.length === 0) {
      toast.error('Please select at least one dispute');
      return;
    }

    // Filter out any resolved/rejected disputes and already-refunded disputes
    let validDisputes = disputes?.filter(d => 
      selectedDisputeIds.includes(d.id) && 
      d.status !== 'resolved' && 
      d.status !== 'rejected' &&
      (!d.refund_amount || d.refund_amount === 0)
    ) || [];
    
    // Check history table for any already-refunded generations
    if (validDisputes.length > 0) {
      const { data: historyDisputes } = await supabase
        .from('token_dispute_history')
        .select('generation_id, refund_amount')
        .in('generation_id', validDisputes.map(d => d.generation_id));

      if (historyDisputes && historyDisputes.length > 0) {
        const refundedGenIds = historyDisputes
          .filter(h => h.refund_amount && h.refund_amount > 0)
          .map(h => h.generation_id);
        
        // Filter out disputes with already-refunded generations
        validDisputes = validDisputes.filter(d => !refundedGenIds.includes(d.generation_id));
        
        if (refundedGenIds.length > 0) {
          toast.warning(`Skipping ${refundedGenIds.length} dispute(s) with already-refunded generations`);
        }
      }
    }
    
    if (validDisputes.length === 0) {
      toast.error('No valid disputes to process');
      return;
    }
    
    if (validDisputes.length < selectedDisputeIds.length) {
      toast.warning(`Skipping ${selectedDisputeIds.length - validDisputes.length} already-processed dispute(s)`);
    }

    const status = action === 'reject' ? 'rejected' : 'resolved';
    const shouldRefund = action === 'resolve-refund';
    
    const confirmMsg = shouldRefund 
      ? `Resolve ${validDisputes.length} disputes and refund credits?`
      : action === 'reject'
      ? `Reject ${validDisputes.length} disputes?`
      : `Resolve ${validDisputes.length} disputes without refund?`;

    if (confirm(confirmMsg)) {
      bulkUpdateDisputesMutation.mutate({
        disputeIds: validDisputes.map(d => d.id),
        status,
        shouldRefund,
      });
    }
  };

  const toggleSelectAll = () => {
    if (selectedDisputeIds.length === disputes?.length) {
      setSelectedDisputeIds([]);
    } else {
      setSelectedDisputeIds(disputes?.map(d => d.id) || []);
    }
  };

  const toggleSelectDispute = (id: string) => {
    setSelectedDisputeIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  if (isLoading) {
    return <div className="p-8">Loading disputes...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-6">
          <div>
            <h1 className="text-3xl font-black">CREDIT DISPUTES</h1>
            <p className="text-muted-foreground">Review and manage user-reported credit issues</p>
          </div>
          
          {/* View Mode Tabs */}
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'active' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setViewMode('active');
                setStatusFilter('all');
                setSelectedDisputeIds([]);
              }}
            >
              <Clock className="h-4 w-4 mr-2" />
              Active Disputes
            </Button>
            <Button
              variant={viewMode === 'history' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setViewMode('history');
                setStatusFilter('all');
                setSelectedDisputeIds([]);
              }}
            >
              <FileText className="h-4 w-4 mr-2" />
              History
            </Button>
          </div>
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {viewMode === 'active' ? (
              <>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="reviewed">Reviewed</SelectItem>
              </>
            ) : (
              <>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </>
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Bulk Action Bar - Only show in active view */}
      {selectedDisputeIds.length > 0 && viewMode === 'active' && (
        <Card className="border-primary">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">
                {selectedDisputeIds.length} dispute{selectedDisputeIds.length > 1 ? 's' : ''} selected
              </span>
              <div className="flex gap-2">
                <Button 
                  variant="default" 
                  size="sm"
                  onClick={() => handleBulkAction('resolve-refund')}
                  disabled={bulkUpdateDisputesMutation.isPending}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Resolve & Refund
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleBulkAction('resolve-no-refund')}
                  disabled={bulkUpdateDisputesMutation.isPending}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Resolve Only
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => handleBulkAction('reject')}
                  disabled={bulkUpdateDisputesMutation.isPending}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Reject All
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {disputes?.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
            <h3 className="text-lg font-semibold mb-2">No disputes found</h3>
            <p className="text-muted-foreground">
              {statusFilter === 'all' 
                ? "There are no credit disputes to review"
                : `No ${statusFilter} disputes at this time`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Dispute Reports ({disputes?.length || 0})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  {viewMode === 'active' && (
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedDisputeIds.length === disputes?.length && disputes.length > 0}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                  )}
                  <TableHead>User</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Credits</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Generation Status</TableHead>
                  <TableHead>Date</TableHead>
                  {viewMode === 'history' && <TableHead>Refund Info</TableHead>}
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {disputes?.map((dispute) => {
                  const Icon = getContentIcon(dispute.generation.type);
                  return (
                    <TableRow key={dispute.id}>
                      {viewMode === 'active' && (
                        <TableCell>
                          <Checkbox
                            checked={selectedDisputeIds.includes(dispute.id)}
                            onCheckedChange={() => toggleSelectDispute(dispute.id)}
                          />
                        </TableCell>
                      )}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          <div>
                            <div className="font-medium">{dispute.profile.full_name || 'Unknown'}</div>
                            <div className="text-xs text-muted-foreground">{dispute.profile.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          <span className="capitalize">{dispute.generation.type}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{dispute.generation.tokens_used} credits</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(dispute.status)}
                          {dispute.auto_resolved && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <Badge variant="outline" className="text-xs">
                                    <Bot className="h-3 w-3 mr-1" />
                                    Auto
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Automatically resolved for failed generation</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={dispute.generation.status === 'completed' ? 'default' : 'destructive'}>
                          {dispute.generation.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(dispute.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      {viewMode === 'history' && (
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {dispute.refund_amount ? `Refunded ${dispute.refund_amount}` : 'No refund'}
                          </Badge>
                        </TableCell>
                      )}
                      <TableCell>
                        <Button
                          size="sm"
                          variant={viewMode === 'history' ? 'outline' : 'default'}
                          onClick={() => {
                            setSelectedDispute(dispute);
                            setNewStatus(dispute.status);
                            setAdminNotes(dispute.admin_notes || "");
                          }}
                        >
                          {viewMode === 'history' ? 'View' : 'Review'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Dispute Detail Dialog */}
      <Dialog open={!!selectedDispute} onOpenChange={(open) => !open && setSelectedDispute(null)}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {viewMode === 'history' ? 'Dispute History Record' : 'Credit Dispute Details'}
            </DialogTitle>
          </DialogHeader>

          {selectedDispute && (
            <div className="space-y-4">
              {/* Show archive info for history view */}
              {viewMode === 'history' && (
                <div className="bg-muted/50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="font-medium">
                      This dispute was {selectedDispute.status} on{' '}
                      {format(new Date((selectedDispute as any).archived_at || selectedDispute.reviewed_at), 'PPpp')}
                    </span>
                  </div>
                  {selectedDispute.refund_amount && (
                    <div className="mt-2 text-sm text-muted-foreground">
                      Refunded: {selectedDispute.refund_amount} credits
                    </div>
                  )}
                </div>
              )}
              {/* Compact Info Grid */}
              <div className="grid grid-cols-2 gap-3 p-4 bg-muted/50 rounded-lg text-sm">
                <div>
                  <div className="text-muted-foreground text-xs">User</div>
                  <div className="font-medium">{selectedDispute.profile.full_name || 'N/A'}</div>
                  <div className="text-xs text-muted-foreground">{selectedDispute.profile.email}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">Type</div>
                  <div className="font-medium capitalize">{selectedDispute.generation.type}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">Status</div>
                  <Badge variant={selectedDispute.generation.status === 'completed' ? 'default' : 'destructive'} className="text-xs">
                    {selectedDispute.generation.status}
                  </Badge>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">Credits</div>
                  <Badge className="bg-orange-500 text-white text-xs">
                    {selectedDispute.generation.tokens_used} credits
                  </Badge>
                </div>
                <div className="col-span-2">
                  <div className="text-muted-foreground text-xs">Reported</div>
                  <div className="text-xs">{format(new Date(selectedDispute.created_at), 'MMM d, yyyy • h:mm a')}</div>
                </div>
              </div>

              {/* Prompt */}
              {!selectedDispute.generation.workflow_execution_id ? (
                <div>
                  <label className="text-sm font-medium">Prompt</label>
                  <p className="mt-1 p-3 bg-muted rounded-lg text-sm">{selectedDispute.generation.prompt}</p>
                </div>
              ) : (
                <div>
                  <label className="text-sm font-medium">Source</label>
                  <p className="mt-1 p-3 bg-muted rounded-lg text-sm italic text-muted-foreground">Workflow generation</p>
                </div>
              )}

              {/* Preview */}
              <div>
                <label className="text-sm font-medium mb-2 block">Output Preview</label>
                <GenerationPreview generation={selectedDispute.generation} />
              </div>

              {/* User's Report */}
              <div>
                <label className="text-sm font-medium">User's Report</label>
                <p className="mt-1 p-3 bg-muted rounded-lg text-sm">{selectedDispute.reason}</p>
              </div>

              {/* Technical Details - Collapsible */}
              <Collapsible>
                <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium hover:underline">
                  <ChevronDown className="h-4 w-4" />
                  View Technical Details
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 space-y-3">
                  <div>
                    <label className="text-xs text-muted-foreground">Model</label>
                    <p className="text-sm">{selectedDispute.generation.model_id || 'N/A'}</p>
                  </div>
                  
                  {selectedDispute.generation.settings && (
                    <div>
                      <label className="text-xs text-muted-foreground">Parameters</label>
                      <pre className="mt-1 p-3 bg-muted rounded-lg text-xs overflow-x-auto">
                        {JSON.stringify(selectedDispute.generation.settings, null, 2)}
                      </pre>
                    </div>
                  )}

                  {selectedDispute.generation.status === 'failed' && 
                   selectedDispute.generation.provider_response?.data?.failMsg && (
                    <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 p-3 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <div className="text-xs font-medium text-red-700 dark:text-red-400">Error Message</div>
                          <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                            {selectedDispute.generation.provider_response.data.failMsg}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>


              {/* Admin Review - Only show in active view */}
              {viewMode === 'active' && (
                <div className="border-t pt-4 space-y-4">
                  <h3 className="text-sm font-semibold">Admin Review</h3>
                  
                  <div>
                    <label className="text-sm font-medium mb-2 block">Update Status</label>
                    <Select value={newStatus} onValueChange={setNewStatus}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="reviewed">Reviewed</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Admin Notes</label>
                    <Textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="Add notes about your decision..."
                      rows={3}
                    />
                  </div>

                  {selectedDispute.reviewed_at && (
                    <div className="text-xs text-muted-foreground">
                      Last reviewed: {format(new Date(selectedDispute.reviewed_at), 'PPpp')}
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button 
                      onClick={handleRefundTokens}
                      disabled={refundTokensMutation.isPending || !!selectedDispute.refund_amount}
                      variant="outline"
                      className="flex-1"
                    >
                      {refundTokensMutation.isPending 
                        ? 'Refunding...' 
                        : selectedDispute.refund_amount
                        ? 'Already Refunded'
                        : `Refund ${selectedDispute.generation.tokens_used} Credits`}
                    </Button>
                    <Button 
                      onClick={handleUpdateDispute}
                      disabled={updateDisputeMutation.isPending}
                      className="flex-1"
                    >
                      {updateDisputeMutation.isPending ? 'Updating...' : 'Update Dispute'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
