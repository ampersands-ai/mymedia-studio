import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Trash2, 
  Download, 
  AlertTriangle, 
  Loader2, 
  Clock, 
  CheckCircle2,
  XCircle,
  FileDown,
  Shield
} from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import { format, formatDistanceToNow } from 'date-fns';

interface DeletionRequest {
  id: string;
  status: 'pending' | 'cancelled' | 'completed';
  requested_at: string;
  scheduled_deletion_at: string;
  reason: string | null;
}

interface ExportRequest {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'expired';
  requested_at: string;
  download_url: string | null;
  expires_at: string | null;
  completed_at: string | null;
}

export function AccountSection() {
  const { user } = useAuth();
  const [deletionRequest, setDeletionRequest] = useState<DeletionRequest | null>(null);
  const [exportRequest, setExportRequest] = useState<ExportRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [deletionReason, setDeletionReason] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    if (user) {
      fetchRequests();
    }
  }, [user]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      
      // Fetch deletion request
      const { data: deletionData, error: deletionError } = await supabase
        .from('account_deletion_requests')
        .select('*')
        .eq('user_id', user?.id)
        .eq('status', 'pending')
        .maybeSingle();

      if (deletionError) throw deletionError;
      setDeletionRequest(deletionData as DeletionRequest | null);

      // Fetch latest export request
      const { data: exportData, error: exportError } = await supabase
        .from('data_export_requests')
        .select('*')
        .eq('user_id', user?.id)
        .order('requested_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (exportError) throw exportError;
      setExportRequest(exportData as ExportRequest | null);
    } catch (error) {
      logger.error('Failed to fetch GDPR requests', error instanceof Error ? error : new Error(String(error)));
    } finally {
      setLoading(false);
    }
  };

  const handleRequestDeletion = async () => {
    if (!user?.id) return;
    
    setIsDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke('request-account-deletion', {
        body: {
          reason: deletionReason || 'User requested deletion',
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success('Account deletion scheduled', {
        description: 'Your account will be deleted in 7 days. You can cancel this request anytime before then.',
      });

      await fetchRequests();
      setDeletionReason('');
    } catch (error) {
      logger.error('Failed to request account deletion', error instanceof Error ? error : new Error(String(error)));
      toast.error('Failed to schedule deletion. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDeletion = async () => {
    if (!deletionRequest?.id) return;
    
    setIsCancelling(true);
    try {
      const { error } = await supabase
        .from('account_deletion_requests')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
        })
        .eq('id', deletionRequest.id)
        .eq('user_id', user?.id);

      if (error) throw error;

      toast.success('Deletion request cancelled', {
        description: 'Your account will not be deleted.',
      });

      setDeletionRequest(null);
    } catch (error) {
      logger.error('Failed to cancel deletion', error instanceof Error ? error : new Error(String(error)));
      toast.error('Failed to cancel deletion. Please try again.');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleRequestExport = async () => {
    if (!user?.id) return;
    
    setIsExporting(true);
    try {
      const { data, error } = await supabase.functions.invoke('export-user-data', {});

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success('Data export started', {
        description: 'We\'ll notify you when your data is ready for download.',
      });

      await fetchRequests();
    } catch (error) {
      logger.error('Failed to request data export', error instanceof Error ? error : new Error(String(error)));
      toast.error('Failed to start export. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Data Export Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileDown className="h-5 w-5 text-primary" />
            <CardTitle>Download Your Data</CardTitle>
          </div>
          <CardDescription>
            Export a copy of all your personal data (GDPR Right to Data Portability)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {exportRequest && exportRequest.status === 'completed' && exportRequest.download_url ? (
            <Alert className="bg-green-500/10 border-green-500/30">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <AlertTitle>Your data is ready!</AlertTitle>
              <AlertDescription className="mt-2">
                <p className="text-sm text-muted-foreground mb-3">
                  Export completed on {format(new Date(exportRequest.completed_at!), 'PPp')}.
                  {exportRequest.expires_at && (
                    <> Link expires {formatDistanceToNow(new Date(exportRequest.expires_at), { addSuffix: true })}.</>
                  )}
                </p>
                <Button asChild size="sm">
                  <a href={exportRequest.download_url} download>
                    <Download className="h-4 w-4 mr-2" />
                    Download Data
                  </a>
                </Button>
              </AlertDescription>
            </Alert>
          ) : exportRequest && ['pending', 'processing'].includes(exportRequest.status) ? (
            <Alert>
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertTitle>Export in progress</AlertTitle>
              <AlertDescription>
                Your data export is being prepared. This may take a few minutes.
              </AlertDescription>
            </Alert>
          ) : exportRequest && exportRequest.status === 'failed' ? (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>Export failed</AlertTitle>
              <AlertDescription>
                There was an error preparing your data. Please try again.
              </AlertDescription>
            </Alert>
          ) : (
            <p className="text-sm text-muted-foreground">
              Request a complete export of your personal data including your profile, 
              generations, and activity history.
            </p>
          )}
          
          <Button 
            onClick={handleRequestExport}
            disabled={isExporting || (exportRequest && ['pending', 'processing'].includes(exportRequest.status))}
            variant="outline"
          >
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Starting Export...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export My Data
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Account Deletion Section */}
      <Card className="border-destructive/30">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-destructive" />
            <CardTitle className="text-destructive">Delete Account</CardTitle>
          </div>
          <CardDescription>
            Permanently delete your account and all associated data (GDPR Right to Erasure)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {deletionRequest ? (
            <Alert className="bg-amber-500/10 border-amber-500/30">
              <Clock className="h-4 w-4 text-amber-500" />
              <AlertTitle className="flex items-center gap-2">
                Deletion Scheduled
                <Badge variant="outline" className="text-amber-500 border-amber-500">
                  {formatDistanceToNow(new Date(deletionRequest.scheduled_deletion_at), { addSuffix: true })}
                </Badge>
              </AlertTitle>
              <AlertDescription className="mt-2 space-y-3">
                <p className="text-sm text-muted-foreground">
                  Your account is scheduled to be permanently deleted on{' '}
                  <strong>{format(new Date(deletionRequest.scheduled_deletion_at), 'PPp')}</strong>.
                </p>
                <p className="text-sm text-muted-foreground">
                  All your data including generations, videos, and profile information will be permanently erased.
                  You can cancel this request before the deletion date.
                </p>
                <Button 
                  variant="outline" 
                  onClick={handleCancelDeletion}
                  disabled={isCancelling}
                >
                  {isCancelling ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Cancelling...
                    </>
                  ) : (
                    'Cancel Deletion Request'
                  )}
                </Button>
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <Alert variant="destructive" className="bg-destructive/10">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>This action cannot be undone</AlertTitle>
                <AlertDescription>
                  Deleting your account will permanently remove all your data including:
                  <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                    <li>Your profile and personal information</li>
                    <li>All generated images and videos</li>
                    <li>Your storyboards and projects</li>
                    <li>Subscription and billing history</li>
                    <li>All activity and audit logs</li>
                  </ul>
                </AlertDescription>
              </Alert>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete My Account
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription className="space-y-4">
                      <p>
                        This will schedule your account for permanent deletion in <strong>7 days</strong>. 
                        You can cancel this request anytime before then.
                      </p>
                      <div className="space-y-2">
                        <Label htmlFor="deletion-reason">
                          Reason for leaving (optional)
                        </Label>
                        <Textarea
                          id="deletion-reason"
                          placeholder="Help us improve by sharing why you're leaving..."
                          value={deletionReason}
                          onChange={(e) => setDeletionReason(e.target.value)}
                          className="min-h-[80px]"
                        />
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleRequestDeletion}
                      disabled={isDeleting}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {isDeleting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Scheduling...
                        </>
                      ) : (
                        'Schedule Deletion'
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
