import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Video, TrendingUp, Clock, AlertCircle } from 'lucide-react';
import { VideoJob } from '@/types/video';
import { format } from 'date-fns';
import { VIDEO_JOB_STATUS } from '@/constants/generation-status';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';

export default function VideoJobs() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: jobs, isLoading } = useQuery({
    queryKey: ['admin-video-jobs', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('video_jobs')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as VideoJob[];
    },
    // REMOVED: refetchInterval: 10000 (polling every 10s)
    // REPLACED WITH: Realtime subscription below (instant updates)
    staleTime: 60000, // Data stays fresh for 60s (Realtime keeps it updated)
  });

  // Subscribe to real-time updates for video jobs
  // Replaces 10-second polling with instant push notifications
  useRealtimeSubscription({
    table: 'video_jobs',
    queryKey: ['admin-video-jobs', statusFilter],
    event: '*', // Listen for INSERT, UPDATE, DELETE
  });

  const filteredJobs = jobs?.filter(job =>
    job.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    total: jobs?.length || 0,
    completed: jobs?.filter(j => j.status === VIDEO_JOB_STATUS.COMPLETED).length || 0,
    failed: jobs?.filter(j => j.status === VIDEO_JOB_STATUS.FAILED).length || 0,
    processing: jobs?.filter(j => ![VIDEO_JOB_STATUS.COMPLETED, VIDEO_JOB_STATUS.FAILED].includes(j.status as any)).length || 0,
  };

  const getStatusColor = (status: VideoJob['status']) => {
    const colors: Record<string, string> = {
      [VIDEO_JOB_STATUS.PENDING]: 'bg-gray-500',
      [VIDEO_JOB_STATUS.GENERATING_SCRIPT]: 'bg-blue-500',
      'awaiting_script_approval': 'bg-orange-500',
      [VIDEO_JOB_STATUS.GENERATING_VOICE]: 'bg-purple-500',
      'awaiting_voice_approval': 'bg-amber-500',
      [VIDEO_JOB_STATUS.FETCHING_VIDEO]: 'bg-indigo-500',
      [VIDEO_JOB_STATUS.ASSEMBLING]: 'bg-yellow-500',
      [VIDEO_JOB_STATUS.COMPLETED]: 'bg-green-500',
      [VIDEO_JOB_STATUS.FAILED]: 'bg-red-500'
    };
    return colors[status] || 'bg-gray-500';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black mb-2">VIDEO JOBS MANAGEMENT</h1>
        <p className="text-muted-foreground">
          Monitor and manage all faceless video generation jobs
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Jobs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Video className="h-4 w-4 text-muted-foreground" />
              <span className="text-2xl font-bold">{stats.total}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="text-2xl font-bold">{stats.completed}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Processing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              <span className="text-2xl font-bold">{stats.processing}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Failed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <span className="text-2xl font-bold">{stats.failed}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          <Input
            placeholder="Search by topic or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value={VIDEO_JOB_STATUS.PENDING}>Pending</SelectItem>
              <SelectItem value={VIDEO_JOB_STATUS.GENERATING_SCRIPT}>Generating Script</SelectItem>
              <SelectItem value="awaiting_script_approval">Review Script</SelectItem>
              <SelectItem value={VIDEO_JOB_STATUS.GENERATING_VOICE}>Generating Voice</SelectItem>
              <SelectItem value="awaiting_voice_approval">Review Voiceover</SelectItem>
              <SelectItem value={VIDEO_JOB_STATUS.FETCHING_VIDEO}>Fetching Video</SelectItem>
              <SelectItem value={VIDEO_JOB_STATUS.ASSEMBLING}>Assembling</SelectItem>
              <SelectItem value={VIDEO_JOB_STATUS.COMPLETED}>Completed</SelectItem>
              <SelectItem value={VIDEO_JOB_STATUS.FAILED}>Failed</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Jobs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Video Jobs</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Topic</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Style</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Completed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredJobs?.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell className="font-medium max-w-xs truncate">
                      {job.topic}
                    </TableCell>
                    <TableCell>
                      <Badge className={`${getStatusColor(job.status)} text-white`}>
                        {job.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>{job.duration}s</TableCell>
                    <TableCell className="capitalize">{job.style}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(job.created_at), 'MMM d, HH:mm')}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {job.completed_at ? format(new Date(job.completed_at), 'MMM d, HH:mm') : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
