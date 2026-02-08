/**
 * UserDailySummaries Page
 * 
 * Admin-only page showing per-user daily summaries
 * with aggregated metrics and drill-down capability.
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Search, 
  RefreshCw, 
  Users, 
  Coins, 
  TrendingUp,
  Loader2,
  ChevronDown,
  ChevronRight,
  Calendar,
  Image,
  Video,
  Music
} from 'lucide-react';
import { useUserSummaries, useUserDailyStats, type UserSummary } from '@/hooks/useUserDailySnapshots';
import { format } from 'date-fns';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';

function UserDailyDetail({ userId }: { userId: string }) {
  const { data: dailyStats, isLoading } = useUserDailyStats(userId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!dailyStats || dailyStats.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No generation history for this user
      </div>
    );
  }

  return (
    <ScrollArea className="max-h-[400px]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="text-right">Success</TableHead>
            <TableHead className="text-right">Failed</TableHead>
            <TableHead className="text-right">Credits</TableHead>
            <TableHead className="text-right">
              <Image className="h-4 w-4 inline" />
            </TableHead>
            <TableHead className="text-right">
              <Video className="h-4 w-4 inline" />
            </TableHead>
            <TableHead className="text-right">
              <Music className="h-4 w-4 inline" />
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {dailyStats.map((day) => (
            <TableRow key={day.date}>
              <TableCell className="font-medium">
                {format(new Date(day.date), 'MMM d, yyyy')}
              </TableCell>
              <TableCell className="text-right">{day.total}</TableCell>
              <TableCell className="text-right text-green-600">{day.successful}</TableCell>
              <TableCell className="text-right text-red-600">{day.failed}</TableCell>
              <TableCell className="text-right font-mono">{day.credits_used.toFixed(1)}</TableCell>
              <TableCell className="text-right text-muted-foreground">{day.images}</TableCell>
              <TableCell className="text-right text-muted-foreground">{day.videos}</TableCell>
              <TableCell className="text-right text-muted-foreground">{day.audio}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );
}

function UserSummaryCard({ user }: { user: UserSummary }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="overflow-hidden">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isOpen ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
                <div>
                  <CardTitle className="text-base">
                    {user.email || user.display_name || user.user_id.slice(0, 8)}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {user.last_activity 
                      ? `Last active: ${format(new Date(user.last_activity), 'MMM d, yyyy')}`
                      : 'Never active'
                    }
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div className="text-right">
                  <div className="font-semibold">{user.total_generations}</div>
                  <div className="text-xs text-muted-foreground">generations</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-green-600">{user.success_rate}%</div>
                  <div className="text-xs text-muted-foreground">success</div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-semibold">{user.credits_used.toFixed(1)}</div>
                  <div className="text-xs text-muted-foreground">used</div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-semibold">{user.credits_remaining.toFixed(1)}</div>
                  <div className="text-xs text-muted-foreground">remaining</div>
                </div>
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 border-t">
            <div className="grid grid-cols-4 gap-4 py-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{user.successful_runs}</div>
                <div className="text-xs text-muted-foreground">Successful</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{user.failed_runs}</div>
                <div className="text-xs text-muted-foreground">Failed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{user.total_generations}</div>
                <div className="text-xs text-muted-foreground">Total</div>
              </div>
              <div className="text-center">
                <Progress 
                  value={user.success_rate} 
                  className="h-2 mt-2"
                />
                <div className="text-xs text-muted-foreground mt-1">Success Rate</div>
              </div>
            </div>
            
            <div className="border rounded-lg">
              <div className="px-4 py-2 bg-muted/50 border-b">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Daily Breakdown
                </h4>
              </div>
              <UserDailyDetail userId={user.user_id} />
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

export default function UserDailySummaries() {
  const [searchTerm, setSearchTerm] = useState('');
  const { data: users, isLoading, refetch } = useUserSummaries(searchTerm);

  // Calculate aggregate stats
  const aggregateStats = useMemo(() => {
    if (!users) return null;
    
    return {
      totalUsers: users.length,
      totalGenerations: users.reduce((sum, u) => sum + u.total_generations, 0),
      totalCreditsUsed: users.reduce((sum, u) => sum + u.credits_used, 0),
      avgSuccessRate: users.length > 0
        ? users.reduce((sum, u) => sum + u.success_rate, 0) / users.length
        : 0,
    };
  }, [users]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Daily Summaries</h1>
          <p className="text-muted-foreground">
            Per-user generation metrics and daily breakdowns
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Aggregate Stats */}
      {aggregateStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{aggregateStats.totalUsers}</div>
                  <p className="text-sm text-muted-foreground">Users</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Image className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{aggregateStats.totalGenerations.toLocaleString()}</div>
                  <p className="text-sm text-muted-foreground">Generations</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-500/10 rounded-lg">
                  <Coins className="h-5 w-5 text-yellow-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{aggregateStats.totalCreditsUsed.toFixed(0)}</div>
                  <p className="text-sm text-muted-foreground">Credits Used</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{aggregateStats.avgSuccessRate.toFixed(1)}%</div>
                  <p className="text-sm text-muted-foreground">Avg Success</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by email or name..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* User List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : users && users.length > 0 ? (
        <div className="space-y-4">
          {users.map((user) => (
            <UserSummaryCard key={user.user_id} user={user} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No users found matching your search</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
