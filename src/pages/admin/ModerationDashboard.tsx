import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Shield, ShieldAlert, ShieldCheck, ShieldX, Users, TrendingUp, Search, ExternalLink } from 'lucide-react';
import { format, subDays, startOfDay, eachDayOfInterval } from 'date-fns';
import { Link } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';

interface ModerationLog {
  id: string;
  user_id: string;
  prompt: string;
  flagged: boolean;
  flagged_categories: string[] | null;
  category_scores: Record<string, number> | null;
  exempt: boolean;
  created_at: string;
  profiles?: { email: string | null; display_name: string | null };
}

interface RepeatOffender {
  user_id: string;
  email: string | null;
  block_count: number;
  latest_categories: string[];
}

const CATEGORY_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

export default function ModerationDashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('7');

  // Fetch all moderation logs
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['moderation-logs-all', dateRange],
    queryFn: async () => {
      const daysAgo = parseInt(dateRange);
      const startDate = startOfDay(subDays(new Date(), daysAgo)).toISOString();
      
      const { data, error } = await supabase
        .from('moderation_logs')
        .select('*, profiles!moderation_logs_user_id_fkey(email, display_name)')
        .gte('created_at', startDate)
        .order('created_at', { ascending: false })
        .limit(500);
      
      if (error) throw error;
      return data as ModerationLog[];
    },
  });

  // Calculate stats
  const stats = {
    total: logs.length,
    blocked: logs.filter(l => l.flagged).length,
    passed: logs.filter(l => !l.flagged && !l.exempt).length,
    exempt: logs.filter(l => l.exempt).length,
    passRate: logs.length > 0 
      ? Math.round((logs.filter(l => !l.flagged).length / logs.length) * 100) 
      : 100,
  };

  // Calculate repeat offenders (3+ blocks in the date range)
  const repeatOffenders: RepeatOffender[] = (() => {
    const userBlocks: Record<string, { count: number; email: string | null; categories: Set<string> }> = {};
    
    logs.filter(l => l.flagged).forEach(log => {
      if (!userBlocks[log.user_id]) {
        userBlocks[log.user_id] = { 
          count: 0, 
          email: log.profiles?.email || null,
          categories: new Set()
        };
      }
      userBlocks[log.user_id].count++;
      (log.flagged_categories || []).forEach(c => userBlocks[log.user_id].categories.add(c));
    });
    
    return Object.entries(userBlocks)
      .filter(([, data]) => data.count >= 3)
      .map(([user_id, data]) => ({
        user_id,
        email: data.email,
        block_count: data.count,
        latest_categories: Array.from(data.categories),
      }))
      .sort((a, b) => b.block_count - a.block_count);
  })();

  // Calculate category breakdown
  const categoryBreakdown: { category: string; count: number }[] = (() => {
    const counts: Record<string, number> = {};
    logs.filter(l => l.flagged).forEach(log => {
      (log.flagged_categories || []).forEach(cat => {
        counts[cat] = (counts[cat] || 0) + 1;
      });
    });
    return Object.entries(counts)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  })();

  // Calculate trends data
  const trendsData = (() => {
    const daysAgo = parseInt(dateRange);
    const days = eachDayOfInterval({
      start: subDays(new Date(), daysAgo),
      end: new Date(),
    });
    
    return days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const dayLogs = logs.filter(l => l.created_at.startsWith(dayStr));
      return {
        date: format(day, 'MMM dd'),
        total: dayLogs.length,
        blocked: dayLogs.filter(l => l.flagged).length,
        passed: dayLogs.filter(l => !l.flagged).length,
      };
    });
  })();

  // Filter logs
  const filteredLogs = logs.filter(log => {
    const matchesSearch = searchTerm === '' || 
      log.prompt.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === 'all' || 
      (categoryFilter === 'blocked' && log.flagged) ||
      (categoryFilter === 'passed' && !log.flagged && !log.exempt) ||
      (categoryFilter === 'exempt' && log.exempt) ||
      (log.flagged_categories || []).includes(categoryFilter);
    
    return matchesSearch && matchesCategory;
  });

  // Get unique categories for filter
  const allCategories = Array.from(
    new Set(logs.flatMap(l => l.flagged_categories || []))
  ).sort();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Moderation Dashboard</h1>
        <p className="text-muted-foreground">Global view of content moderation across all users</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Checks</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Last {dateRange} days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Blocked</CardTitle>
            <ShieldX className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.blocked}</div>
            <p className="text-xs text-muted-foreground">
              {stats.total > 0 ? Math.round((stats.blocked / stats.total) * 100) : 0}% block rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pass Rate</CardTitle>
            <ShieldCheck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{stats.passRate}%</div>
            <p className="text-xs text-muted-foreground">{stats.passed} passed checks</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Repeat Offenders</CardTitle>
            <ShieldAlert className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-500">{repeatOffenders.length}</div>
            <p className="text-xs text-muted-foreground">3+ blocks in period</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Trends Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Moderation Trends
            </CardTitle>
            <CardDescription>Daily moderation activity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendsData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))' 
                    }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="total" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    name="Total"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="blocked" 
                    stroke="hsl(var(--destructive))" 
                    strokeWidth={2}
                    name="Blocked"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Top Flagged Categories
            </CardTitle>
            <CardDescription>Most common violation types</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {categoryBreakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryBreakdown} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" className="text-xs" />
                    <YAxis 
                      type="category" 
                      dataKey="category" 
                      className="text-xs" 
                      width={100}
                      tickFormatter={(val) => val.replace(/_/g, ' ')}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))' 
                      }} 
                    />
                    <Bar dataKey="count" name="Count">
                      {categoryBreakdown.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No blocked content in this period
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Repeat Offenders */}
      {repeatOffenders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-amber-500" />
              Repeat Offenders
            </CardTitle>
            <CardDescription>Users with 3+ moderation blocks in the selected period</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {repeatOffenders.slice(0, 10).map((offender) => (
                <div 
                  key={offender.user_id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-amber-500/5 border-amber-500/20"
                >
                  <div className="flex items-center gap-3">
                    <Users className="h-4 w-4 text-amber-500" />
                    <div>
                      <p className="font-medium text-sm">{offender.email || 'Unknown User'}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {offender.latest_categories.slice(0, 3).map((cat) => (
                          <Badge key={cat} variant="outline" className="text-xs">
                            {cat.replace(/_/g, ' ')}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="destructive">{offender.block_count} blocks</Badge>
                    <Link to={`/admin/users/${offender.user_id}/generations`}>
                      <Button variant="outline" size="sm">
                        <ExternalLink className="h-3 w-3 mr-1" />
                        View
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Moderation Logs</CardTitle>
          <CardDescription>Complete audit trail of moderation checks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by prompt or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
                <SelectItem value="passed">Passed</SelectItem>
                <SelectItem value="exempt">Exempt</SelectItem>
                {allCategories.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat.replace(/_/g, ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-full sm:w-32">
                <SelectValue placeholder="Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Today</SelectItem>
                <SelectItem value="7">7 days</SelectItem>
                <SelectItem value="14">14 days</SelectItem>
                <SelectItem value="30">30 days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead className="max-w-xs">Prompt</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Categories</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No moderation logs found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.slice(0, 50).map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(log.created_at), 'MMM dd, HH:mm')}
                      </TableCell>
                      <TableCell className="text-sm">
                        {log.profiles?.email || 'Unknown'}
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-sm">
                        {log.prompt}
                      </TableCell>
                      <TableCell>
                        {log.exempt ? (
                          <Badge variant="secondary">Exempt</Badge>
                        ) : log.flagged ? (
                          <Badge variant="destructive">Blocked</Badge>
                        ) : (
                          <Badge variant="outline" className="text-green-500 border-green-500">Passed</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {(log.flagged_categories || []).slice(0, 2).map((cat) => (
                            <Badge key={cat} variant="outline" className="text-xs">
                              {cat.replace(/_/g, ' ')}
                            </Badge>
                          ))}
                          {(log.flagged_categories || []).length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{(log.flagged_categories || []).length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Link to={`/admin/users/${log.user_id}/generations`}>
                          <Button variant="ghost" size="sm">
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {filteredLogs.length > 50 && (
            <p className="text-sm text-muted-foreground text-center mt-4">
              Showing 50 of {filteredLogs.length} logs
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
