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
import { useSignedUrl } from "@/hooks/useSignedUrl";
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
  const { signedUrl, isLoading } = useSignedUrl(generation.storage_path);

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
  const queryClient = useQueryClient();

  const { data: disputes, isLoading } = useQuery({
    queryKey: ['token-disputes', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('token_dispute_reports')
        .select(`
          *,
          generation:generations(*),
          profile:profiles(email, full_name)
        `)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter as 'pending' | 'reviewed' | 'resolved' | 'rejected');
      }

      const { data, error } = await query;
      if (error) {
        console.error('Error fetching disputes:', error);
        throw error;
      }
      return data as unknown as TokenDispute[];
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
    mutationFn: async ({ userId, amount }: { userId: string; amount: number }) => {
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
        const error = await response.text();
        throw new Error(error || 'Failed to refund tokens');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['token-disputes'] });
      toast.success('Tokens refunded successfully');
    },
    onError: (error) => {
      toast.error(`Failed to refund tokens: ${error.message}`);
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
        .select('user_id, generation:generations(tokens_used)')
        .in('id', disputeIds);

      // Update all disputes
      const { error: updateError } = await supabase
        .from('token_dispute_reports')
        .update({ 
          status: status as 'pending' | 'reviewed' | 'resolved' | 'rejected',
          admin_notes: `Bulk ${status} on ${format(new Date(), 'PPpp')}`,
          reviewed_at: new Date().toISOString(),
          reviewed_by: session.user.id
        })
        .in('id', disputeIds);

      if (updateError) throw updateError;

      // Refund tokens if requested
      if (shouldRefund && disputes) {
        for (const dispute of disputes) {
          const tokens = (dispute.generation as any)?.tokens_used || 0;
          if (tokens > 0) {
            await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-user-tokens`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({
                user_id: dispute.user_id,
                amount: tokens,
                action: 'add'
              }),
            });
          }
        }
      }

      return { count: disputeIds.length, refunded: shouldRefund ? disputes?.length || 0 : 0 };
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
    updateDisputeMutation.mutate({
      id: selectedDispute.id,
      status: newStatus,
      notes: adminNotes,
    });
  };

  const handleRefundTokens = () => {
    if (!selectedDispute) return;
    
    if (confirm(`Refund ${selectedDispute.generation.tokens_used} tokens to ${selectedDispute.profile.email}?`)) {
      refundTokensMutation.mutate({
        userId: selectedDispute.user_id,
        amount: selectedDispute.generation.tokens_used,
      });
    }
  };

  const handleBulkAction = (action: 'resolve-refund' | 'resolve-no-refund' | 'reject') => {
    if (selectedDisputeIds.length === 0) {
      toast.error('Please select at least one dispute');
      return;
    }

    const status = action === 'reject' ? 'rejected' : 'resolved';
    const shouldRefund = action === 'resolve-refund';
    
    const confirmMsg = shouldRefund 
      ? `Resolve ${selectedDisputeIds.length} disputes and refund tokens to users?`
      : action === 'reject'
      ? `Reject ${selectedDisputeIds.length} disputes without refund?`
      : `Resolve ${selectedDisputeIds.length} disputes without refund?`;

    if (confirm(confirmMsg)) {
      bulkUpdateDisputesMutation.mutate({
        disputeIds: selectedDisputeIds,
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
        <div>
          <h1 className="text-3xl font-black">TOKEN DISPUTES</h1>
          <p className="text-muted-foreground">Review and manage user-reported token issues</p>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Disputes</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="reviewed">Reviewed</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Bulk Action Bar */}
      {selectedDisputeIds.length > 0 && (
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
                ? "There are no token disputes to review"
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
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedDisputeIds.length === disputes?.length && disputes.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Tokens</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Generation Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {disputes?.map((dispute) => {
                  const Icon = getContentIcon(dispute.generation.type);
                  return (
                    <TableRow key={dispute.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedDisputeIds.includes(dispute.id)}
                          onCheckedChange={() => toggleSelectDispute(dispute.id)}
                        />
                      </TableCell>
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
                        <Badge variant="outline">{dispute.generation.tokens_used} tokens</Badge>
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
                      <TableCell>
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedDispute(dispute);
                            setNewStatus(dispute.status);
                            setAdminNotes(dispute.admin_notes || "");
                          }}
                        >
                          Review
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
            <DialogTitle>Token Dispute Details</DialogTitle>
          </DialogHeader>

          {selectedDispute && (
            <div className="space-y-4">
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
                  <div className="text-muted-foreground text-xs">Tokens</div>
                  <Badge className="bg-orange-500 text-white text-xs">
                    {selectedDispute.generation.tokens_used} tokens
                  </Badge>
                </div>
                <div className="col-span-2">
                  <div className="text-muted-foreground text-xs">Reported</div>
                  <div className="text-xs">{format(new Date(selectedDispute.created_at), 'MMM d, yyyy • h:mm a')}</div>
                </div>
              </div>

              {/* Prompt */}
              <div>
                <label className="text-sm font-medium">Prompt</label>
                <p className="mt-1 p-3 bg-muted rounded-lg text-sm">{selectedDispute.generation.prompt}</p>
              </div>

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


              {/* Admin Review */}
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
                    disabled={refundTokensMutation.isPending}
                    variant="outline"
                    className="flex-1"
                  >
                    {refundTokensMutation.isPending ? 'Refunding...' : `Refund ${selectedDispute.generation.tokens_used} Tokens`}
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
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
