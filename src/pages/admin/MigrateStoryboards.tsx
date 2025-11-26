import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { SmartLoader } from "@/components/ui/smart-loader";
import { toast } from "sonner";
import { AlertCircle, CheckCircle, XCircle, Clock, Download } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface MigrationDetail {
  storyboardId: string;
  topic: string;
  status: 'success' | 'failed' | 'expired' | 'skipped' | 'preview';
  error?: string;
  reason?: string;
  storagePath?: string;
  videoUrl?: string;
  userId?: string;
}

interface MigrationResult {
  total: number;
  processed: number;
  failed: number;
  expired: number;
  skipped: number;
  details: MigrationDetail[];
  message: string;
}

export default function MigrateStoryboards() {
  const queryClient = useQueryClient();
  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null);

  // Query storyboards needing migration
  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['storyboard-migration-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('storyboards')
        .select('id, video_url, video_storage_path', { count: 'exact', head: false } as any)
        .eq('status', 'complete')
        .not('video_url', 'is', null);

      if (error) throw error;

      const needsMigration = data?.filter(s => 
        s.video_url?.includes('json2video') && 
        (!s.video_storage_path || !s.video_storage_path.startsWith('storyboard-videos/'))
      ).length || 0;

      const alreadyMigrated = data?.filter(s => 
        s.video_storage_path?.startsWith('storyboard-videos/')
      ).length || 0;

      return {
        total: data?.length || 0,
        needsMigration,
        alreadyMigrated,
      };
    },
  });

  // Dry run mutation
  const dryRunMutation = useMutation({
    mutationFn: async (limit: number) => {
      const { data, error } = await supabase.functions.invoke('migrate-storyboard-videos', {
        body: { limit, dryRun: true, skipExisting: true },
      });

      if (error) throw error;
      return data as MigrationResult;
    },
    onSuccess: (data) => {
      setMigrationResult(data);
      toast.success('Preview completed', {
        description: `Found ${data.total} storyboards ready for migration`,
      });
    },
    onError: (error) => {
      toast.error('Preview failed', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    },
  });

  // Migration mutation
  const migrateMutation = useMutation({
    mutationFn: async (limit: number) => {
      const { data, error } = await supabase.functions.invoke('migrate-storyboard-videos', {
        body: { limit, dryRun: false, skipExisting: true },
      });

      if (error) throw error;
      return data as MigrationResult;
    },
    onSuccess: (data) => {
      setMigrationResult(data);
      queryClient.invalidateQueries({ queryKey: ['storyboard-migration-stats'] });
      queryClient.invalidateQueries({ queryKey: ['storyboards'] });
      
      toast.success('Migration completed', {
        description: data.message,
      });
    },
    onError: (error) => {
      toast.error('Migration failed', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    },
  });

  const exportReport = () => {
    if (!migrationResult) return;

    const csv = [
      ['Storyboard ID', 'Topic', 'Status', 'Error/Reason', 'Storage Path'].join(','),
      ...migrationResult.details.map(d => 
        [
          d.storyboardId,
          `"${d.topic}"`,
          d.status,
          `"${d.error || d.reason || '-'}"`,
          d.storagePath || '-'
        ].join(',')
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `storyboard-migration-${new Date().toISOString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success('Report exported');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'expired': return <Clock className="h-4 w-4 text-orange-500" />;
      case 'skipped': return <AlertCircle className="h-4 w-4 text-blue-500" />;
      case 'preview': return <Clock className="h-4 w-4 text-gray-500" />;
      default: return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const variant = status === 'success' ? 'default' : 
                   status === 'failed' ? 'destructive' : 
                   status === 'expired' ? 'outline' : 'secondary';
    
    return (
      <Badge variant={variant} className="flex items-center gap-1">
        {getStatusIcon(status)}
        {status.toUpperCase()}
      </Badge>
    );
  };

  if (isLoadingStats) {
    return <SmartLoader />;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Storyboard Video Migration</h1>
        <p className="text-muted-foreground mt-2">
          Migrate storyboard videos from external URLs to permanent Supabase Storage
        </p>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Storyboards</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.total || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Need Migration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-500">{stats?.needsMigration || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Already Migrated</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-500">{stats?.alreadyMigrated || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {migrationResult 
                ? Math.round((migrationResult.processed / migrationResult.total) * 100) 
                : '-'}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alert */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          External video URLs expire after 24 hours. Migrate videos to permanent storage to ensure they remain accessible.
        </AlertDescription>
      </Alert>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Migration Actions</CardTitle>
          <CardDescription>
            Preview or migrate storyboard videos in batches
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline" 
              onClick={() => dryRunMutation.mutate(50)}
              disabled={dryRunMutation.isPending || migrateMutation.isPending}
            >
              {dryRunMutation.isPending ? 'Previewing...' : 'Preview (Dry Run)'}
            </Button>

            <Button 
              onClick={() => migrateMutation.mutate(10)}
              disabled={dryRunMutation.isPending || migrateMutation.isPending}
            >
              {migrateMutation.isPending ? 'Migrating...' : 'Migrate 10'}
            </Button>

            <Button 
              onClick={() => migrateMutation.mutate(25)}
              disabled={dryRunMutation.isPending || migrateMutation.isPending}
            >
              {migrateMutation.isPending ? 'Migrating...' : 'Migrate 25'}
            </Button>

            <Button 
              onClick={() => migrateMutation.mutate(50)}
              disabled={dryRunMutation.isPending || migrateMutation.isPending}
            >
              {migrateMutation.isPending ? 'Migrating...' : 'Migrate 50'}
            </Button>

            {migrationResult && (
              <Button 
                variant="outline" 
                onClick={exportReport}
                className="ml-auto"
              >
                <Download className="h-4 w-4 mr-2" />
                Export Report
              </Button>
            )}
          </div>

          {migrationResult && (
            <div className="text-sm text-muted-foreground">
              {migrationResult.message}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results Table */}
      {migrationResult && migrationResult.details.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Migration Results</CardTitle>
            <CardDescription>
              Showing {migrationResult.details.length} storyboards
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Topic</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Storage Path</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {migrationResult.details.map((detail) => (
                  <TableRow key={detail.storyboardId}>
                    <TableCell className="font-mono text-xs">
                      {detail.storyboardId.slice(0, 8)}...
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {detail.topic}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(detail.status)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                      {detail.error || detail.reason || '-'}
                    </TableCell>
                    <TableCell className="font-mono text-xs max-w-xs truncate">
                      {detail.storagePath || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
