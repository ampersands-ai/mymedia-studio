/**
 * GenerationLedger Page
 * 
 * Admin-only page showing complete history of all generations
 * across all users with filters, pagination, and export.
 */

import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search, 
  Download, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Loader2,
  Image,
  Video,
  Music,
  ChevronLeft,
  ChevronRight,
  Copy,
  Eye
} from 'lucide-react';
import { VirtualizedTable, type ColumnDefinition } from '@/components/admin/VirtualizedTable';
import { useGenerationLedger, type GenerationLedgerEntry, type LedgerFilters } from '@/hooks/useGenerationLedger';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

const STATUSES = ['all', 'pending', 'processing', 'completed', 'failed', 'cancelled'];
const CONTENT_TYPES = ['all', 'image', 'video', 'audio'];

export default function GenerationLedger() {
  const { toast } = useToast();
  const [page, setPage] = useState(0);
  const pageSize = 50;
  const [filters, setFilters] = useState<LedgerFilters>({});
  const [selectedEntry, setSelectedEntry] = useState<GenerationLedgerEntry | null>(null);
  
  // Search debounce state
  const [searchInput, setSearchInput] = useState('');

  const { 
    data: entries, 
    isLoading, 
    refetch, 
    totalCount, 
    totalPages 
  } = useGenerationLedger({
    filters: {
      ...filters,
      userEmail: searchInput || undefined,
    },
    page,
    pageSize,
  });

  // Format duration
  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  // Get status badge
  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-primary/20 text-primary border-primary/30"><CheckCircle2 className="h-3 w-3 mr-1" />Completed</Badge>;
      case 'failed':
        return <Badge className="bg-destructive/20 text-destructive border-destructive/30"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      case 'processing':
        return <Badge className="bg-accent/20 text-accent-foreground border-accent/30"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Processing</Badge>;
      case 'pending':
        return <Badge className="bg-secondary/20 text-secondary-foreground border-secondary/30"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'cancelled':
        return <Badge className="bg-muted text-muted-foreground"><XCircle className="h-3 w-3 mr-1" />Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status || 'Unknown'}</Badge>;
    }
  };

  // Get content type icon
  const getContentTypeIcon = (type: string | null) => {
    switch (type) {
      case 'image':
        return <Image className="h-4 w-4 text-primary" />;
      case 'video':
        return <Video className="h-4 w-4 text-accent-foreground" />;
      case 'audio':
        return <Music className="h-4 w-4 text-secondary-foreground" />;
      default:
        return null;
    }
  };

  // Column definitions
  const columns: ColumnDefinition<GenerationLedgerEntry>[] = useMemo(() => [
    {
      key: 'run_date',
      header: 'Date',
      width: 160,
      minWidth: 140,
      render: (value) => value ? format(new Date(value as string), 'MMM d, yyyy HH:mm') : '—',
    },
    {
      key: 'user_email',
      header: 'User',
      width: 180,
      minWidth: 150,
      render: (value, row): React.ReactNode => {
        const displayValue = String(value || row.user_name || row.user_id.slice(0, 8));
        return (
          <div className="truncate" title={String(value) || undefined}>
            {displayValue}
          </div>
        );
      },
    },
    {
      key: 'artifio_id',
      header: 'Artifio ID',
      width: 120,
      minWidth: 100,
      render: (value): React.ReactNode => {
        const id = value as string;
        return (
          <code className="text-xs bg-muted px-1 py-0.5 rounded truncate block" title={id}>
            {id.slice(0, 8)}...
          </code>
        );
      },
    },
    {
      key: 'provider_task_id',
      header: 'Provider ID',
      width: 120,
      minWidth: 100,
      render: (value): React.ReactNode => {
        if (!value) return <span>—</span>;
        const id = value as string;
        return (
          <code className="text-xs bg-muted px-1 py-0.5 rounded truncate block" title={id}>
            {id.slice(0, 10)}...
          </code>
        );
      },
    },
    {
      key: 'model_id',
      header: 'Model',
      width: 140,
      minWidth: 120,
      render: (value): React.ReactNode => {
        return (
          <div className="truncate text-sm" title={String(value) || undefined}>
            {String(value || '—')}
          </div>
        );
      },
    },
    {
      key: 'content_type',
      header: 'Type',
      width: 80,
      minWidth: 70,
      render: (value): React.ReactNode => {
        const typeValue = value as string;
        return (
          <div className="flex items-center gap-1">
            {getContentTypeIcon(typeValue)}
            <span className="capitalize text-sm">{typeValue || '—'}</span>
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      width: 120,
      minWidth: 100,
      render: (value) => getStatusBadge(value as string),
    },
    {
      key: 'credits_cost',
      header: 'Cost',
      width: 70,
      minWidth: 60,
      render: (value): React.ReactNode => {
        return <span className="font-mono text-sm">{String(value || 0)}</span>;
      },
    },
    {
      key: 'has_output',
      header: 'Output',
      width: 70,
      minWidth: 60,
      render: (value): React.ReactNode => {
        if (value) {
          return <CheckCircle2 className="h-4 w-4 text-primary" />;
        }
        return <XCircle className="h-4 w-4 text-muted-foreground" />;
      },
    },
    {
      key: 'total_duration_ms',
      header: 'Duration',
      width: 90,
      minWidth: 80,
      render: (value) => (
        <span className="text-sm text-muted-foreground">
          {formatDuration(value as number)}
        </span>
      ),
    },
  ], []);

  // Export to CSV
  const handleExport = useCallback(() => {
    if (!entries || entries.length === 0) {
      toast({
        title: 'No data to export',
        description: 'Apply filters and try again.',
        variant: 'destructive',
      });
      return;
    }

    const headers = [
      'Date',
      'User Email',
      'Artifio ID',
      'Provider ID',
      'Model',
      'Type',
      'Status',
      'Credits Cost',
      'Has Output',
      'Duration (ms)',
      'Prompt',
    ];

    const rows = entries.map((e) => [
      e.run_date,
      e.user_email || '',
      e.artifio_id,
      e.provider_task_id || '',
      e.model_id || '',
      e.content_type || '',
      e.status || '',
      e.credits_cost,
      e.has_output ? 'Yes' : 'No',
      e.total_duration_ms,
      `"${(e.prompt || '').replace(/"/g, '""')}"`,
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `generation-ledger-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: 'Export complete',
      description: `Exported ${entries.length} records.`,
    });
  }, [entries, toast]);

  // Handle row click
  const handleRowClick = useCallback((row: GenerationLedgerEntry) => {
    setSelectedEntry(row);
  }, []);

  // Copy to clipboard
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} copied to clipboard` });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Generation Ledger</h1>
          <p className="text-muted-foreground">
            Complete history of all generations across all users
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by email..."
                className="pl-9"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            
            <Select
              value={filters.status || 'all'}
              onValueChange={(v) => setFilters((f) => ({ ...f, status: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s === 'all' ? 'All Statuses' : s.charAt(0).toUpperCase() + s.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.contentType || 'all'}
              onValueChange={(v) => setFilters((f) => ({ ...f, contentType: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Content Type" />
              </SelectTrigger>
              <SelectContent>
                {CONTENT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t === 'all' ? 'All Types' : t.charAt(0).toUpperCase() + t.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <Input
                type="date"
                placeholder="From"
                value={filters.dateFrom || ''}
                onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
              />
              <span className="text-muted-foreground">to</span>
              <Input
                type="date"
                placeholder="To"
                value={filters.dateTo || ''}
                onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{totalCount.toLocaleString()}</div>
            <p className="text-sm text-muted-foreground">Total Generations</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{totalPages}</div>
            <p className="text-sm text-muted-foreground">Pages</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{pageSize}</div>
            <p className="text-sm text-muted-foreground">Per Page</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{page + 1}</div>
            <p className="text-sm text-muted-foreground">Current Page</p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <VirtualizedTable
              data={entries || []}
              columns={columns}
              rowHeight={52}
              maxHeight={600}
              onRowClick={handleRowClick}
              emptyMessage="No generations found matching your filters"
              className="border-0"
            />
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {page * pageSize + 1} to {Math.min((page + 1) * pageSize, totalCount)} of {totalCount} entries
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedEntry} onOpenChange={() => setSelectedEntry(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Generation Details</DialogTitle>
            <DialogDescription>
              Full details for this generation
            </DialogDescription>
          </DialogHeader>
          {selectedEntry && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4 p-1">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Artifio ID</label>
                    <div className="flex items-center gap-2">
                      <code className="text-sm bg-muted px-2 py-1 rounded">{selectedEntry.artifio_id}</code>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(selectedEntry.artifio_id, 'Artifio ID')}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Provider ID</label>
                    <div className="flex items-center gap-2">
                      <code className="text-sm bg-muted px-2 py-1 rounded">{selectedEntry.provider_task_id || '—'}</code>
                      {selectedEntry.provider_task_id && (
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(selectedEntry.provider_task_id!, 'Provider ID')}>
                          <Copy className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">User</label>
                    <p className="text-sm">{selectedEntry.user_email || selectedEntry.user_name || selectedEntry.user_id}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                    <div>{getStatusBadge(selectedEntry.status)}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Model</label>
                    <p className="text-sm">{selectedEntry.model_id || '—'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Content Type</label>
                    <div className="flex items-center gap-1">
                      {getContentTypeIcon(selectedEntry.content_type)}
                      <span className="capitalize">{selectedEntry.content_type || '—'}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Credits Cost</label>
                    <p className="text-sm font-mono">{selectedEntry.credits_cost}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Duration</label>
                    <p className="text-sm">{formatDuration(selectedEntry.total_duration_ms)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Has Output</label>
                    <p className="text-sm">{selectedEntry.has_output ? 'Yes' : 'No'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Run Date</label>
                    <p className="text-sm">{format(new Date(selectedEntry.run_date), 'PPpp')}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Completed At</label>
                    <p className="text-sm">{selectedEntry.completed_at ? format(new Date(selectedEntry.completed_at), 'PPpp') : '—'}</p>
                  </div>
                </div>

                {selectedEntry.prompt && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Prompt</label>
                    <div className="mt-1 p-3 bg-muted rounded-lg">
                      <p className="text-sm whitespace-pre-wrap">{selectedEntry.prompt}</p>
                    </div>
                  </div>
                )}

                {selectedEntry.output_url && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Output</label>
                    <div className="mt-1">
                      <Button variant="outline" size="sm" asChild>
                        <a href={selectedEntry.output_url} target="_blank" rel="noopener noreferrer">
                          <Eye className="h-4 w-4 mr-2" />
                          View Output
                        </a>
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
