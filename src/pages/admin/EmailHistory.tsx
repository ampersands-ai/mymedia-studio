import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Mail, Search, Filter, Download, Loader2, Clock, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface EmailHistory {
  id: string;
  recipient_email: string;
  email_type: string;
  subject: string;
  sent_at: string;
  delivery_status: string;
  resend_email_id: string | null;
  error_message: string | null;
  opened_at: string | null;
  clicked_at: string | null;
}

export const EmailHistory = () => {
  const [emails, setEmails] = useState<EmailHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [emailTypeFilter, setEmailTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchEmailHistory();
  }, []);

  const fetchEmailHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('email_history')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setEmails(data || []);
    } catch (error) {
      logger.error('Failed to fetch email history', error as Error, { 
        component: 'EmailHistory',
        operation: 'fetchEmailHistory'
      });
      toast.error('Failed to load email history');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      sent: { variant: 'default' as const, icon: Mail, color: 'text-blue-500' },
      delivered: { variant: 'default' as const, icon: CheckCircle2, color: 'text-green-500' },
      failed: { variant: 'destructive' as const, icon: XCircle, color: 'text-red-500' },
      bounced: { variant: 'destructive' as const, icon: AlertTriangle, color: 'text-orange-500' },
      complained: { variant: 'secondary' as const, icon: AlertTriangle, color: 'text-yellow-500' }
    };

    const config = variants[status as keyof typeof variants] || variants.sent;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className={`h-3 w-3 ${config.color}`} />
        {status}
      </Badge>
    );
  };

  const getEmailTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      generation_complete: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
      daily_summary: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      error_alert: 'bg-red-500/10 text-red-500 border-red-500/20',
      user_registration: 'bg-green-500/10 text-green-500 border-green-500/20',
      welcome: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
      test: 'bg-gray-500/10 text-gray-500 border-gray-500/20'
    };

    return (
      <Badge variant="outline" className={colors[type] || ''}>
        {type.replace(/_/g, ' ')}
      </Badge>
    );
  };

  const filteredEmails = emails.filter(email => {
    const matchesSearch = 
      email.recipient_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.subject.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = emailTypeFilter === 'all' || email.email_type === emailTypeFilter;
    const matchesStatus = statusFilter === 'all' || email.delivery_status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  const stats = {
    total: emails.length,
    delivered: emails.filter(e => e.delivery_status === 'delivered').length,
    failed: emails.filter(e => e.delivery_status === 'failed' || e.delivery_status === 'bounced').length,
    openRate: emails.length ? ((emails.filter(e => e.opened_at).length / emails.length) * 100).toFixed(1) : '0'
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Email History</h1>
        <p className="text-muted-foreground mt-2">
          Track all emails sent from the system with delivery status and engagement metrics
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sent</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivered</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.delivered}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.failed}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Rate</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.openRate}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search recipient or subject..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={emailTypeFilter} onValueChange={setEmailTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Email Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="generation_complete">Generation Complete</SelectItem>
                <SelectItem value="daily_summary">Daily Summary</SelectItem>
                <SelectItem value="error_alert">Error Alert</SelectItem>
                <SelectItem value="user_registration">User Registration</SelectItem>
                <SelectItem value="welcome">Welcome</SelectItem>
                <SelectItem value="test">Test</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="bounced">Bounced</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Email Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Email History ({filteredEmails.length})</CardTitle>
            <Button variant="outline" size="sm" onClick={() => toast.info('Export functionality coming soon')}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Recipient</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Opened</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmails.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No emails found matching your filters
                  </TableCell>
                </TableRow>
              ) : (
                filteredEmails.map((email) => (
                  <TableRow key={email.id}>
                    <TableCell className="font-mono text-sm">
                      {format(new Date(email.sent_at), 'MMM d, HH:mm')}
                    </TableCell>
                    <TableCell className="font-medium">{email.recipient_email}</TableCell>
                    <TableCell>{getEmailTypeBadge(email.email_type)}</TableCell>
                    <TableCell className="max-w-xs truncate">{email.subject}</TableCell>
                    <TableCell>{getStatusBadge(email.delivery_status)}</TableCell>
                    <TableCell>
                      {email.opened_at ? (
                        <span className="text-sm text-green-600">✓ Opened</span>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
