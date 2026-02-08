import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import type { Database } from '@/integrations/supabase/types';

type TemplateLandingPageRow = Database['public']['Tables']['template_landing_pages']['Row'];
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import { Loader2, TrendingUp, Users, Coins, Activity, Target } from 'lucide-react';
import { format, subDays } from 'date-fns';

const COLORS = ['#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444'];

export const AdvancedAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [activityData, setActivityData] = useState<any[]>([]);
  const [templateData, setTemplateData] = useState<any[]>([]);
  const [tokenData, setTokenData] = useState<any[]>([]);
  const [userEngagement, setUserEngagement] = useState<any>({});

  useEffect(() => {
    fetchAllAnalytics();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAllAnalytics = async () => {
    try {
      await Promise.all([
        fetchActivityTrends(),
        fetchTemplatePerformance(),
        fetchTokenEconomics(),
        fetchUserEngagement()
      ]);
    } catch (error) {
      logger.error('Failed to fetch analytics data', error as Error, { 
        component: 'AdvancedAnalytics',
        operation: 'fetchAllAnalytics'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchActivityTrends = async () => {
    const thirtyDaysAgo = subDays(new Date(), 30);
    
    const { data } = await supabase
      .from('user_activity_logs')
      .select('created_at, activity_type')
      .gte('created_at', thirtyDaysAgo.toISOString());

    // Group by date and activity type
    const grouped = (data || []).reduce((acc: Record<string, { date: string; downloads: number; shares: number; views: number; generations: number }>, log: { created_at: string; activity_type: string }) => {
      const date = format(new Date(log.created_at), 'MMM dd');
      if (!acc[date]) {
        acc[date] = { date, downloads: 0, shares: 0, views: 0, generations: 0 };
      }
      if (log.activity_type === 'download_generation') acc[date].downloads++;
      if (log.activity_type === 'create_share_link') acc[date].shares++;
      if (log.activity_type === 'view_shared_content') acc[date].views++;
      if (log.activity_type === 'generation_started') acc[date].generations++;
      return acc;
    }, {});

    setActivityData(Object.values(grouped));
  };

  const fetchTemplatePerformance = async () => {
    const { data } = await supabase
      .from('template_landing_pages')
      .select('title, use_count, view_count')
      .eq('is_published', true)
      .order('use_count', { ascending: false })
      .limit(10);

    setTemplateData((data || []).map((t: TemplateLandingPageRow) => ({
      name: t.title?.substring(0, 20) || 'Unknown',
      uses: t.use_count || 0,
      views: t.view_count || 0,
      conversion: t.view_count > 0 ? ((t.use_count / t.view_count) * 100).toFixed(1) : 0
    })));
  };

  const fetchTokenEconomics = async () => {
    const { data } = await supabase
      .from('generations')
      .select('model_id, tokens_used, status, created_at')
      .gte('created_at', subDays(new Date(), 30).toISOString());

    // Group by model
    const grouped = (data || []).reduce((acc: Record<string, { model: string; tokens: number; count: number; success: number; failed: number }>, gen: { model_id: string; tokens_used: number; status: string }) => {
      if (!acc[gen.model_id]) {
        acc[gen.model_id] = {
          model: gen.model_id,
          tokens: 0,
          count: 0,
          success: 0,
          failed: 0
        };
      }
      acc[gen.model_id].tokens += gen.tokens_used || 0;
      acc[gen.model_id].count++;
      if (gen.status === 'completed') acc[gen.model_id].success++;
      if (gen.status === 'failed') acc[gen.model_id].failed++;
      return acc;
    }, {});

    setTokenData(Object.values(grouped));
  };

  const fetchUserEngagement = async () => {
    // SECURITY: Call secure edge function instead of client-side admin SDK
    const { data, error } = await supabase.functions.invoke('admin-analytics', {
      method: 'POST'
    });

    if (error) {
      logger.error('Failed to fetch user engagement', error as Error, {
        component: 'AdvancedAnalytics',
        operation: 'fetchUserEngagement'
      });
      throw error;
    }

    if (data?.success && data?.data?.userEngagement) {
      setUserEngagement(data.data.userEngagement);
    }
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
        <h1 className="text-3xl font-bold">Advanced Analytics</h1>
        <p className="text-muted-foreground mt-2">
          Comprehensive insights into platform performance, user behavior, and resource utilization
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userEngagement.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              {userEngagement.activeUsers} active this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <Target className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userEngagement.successRate}%</div>
            <p className="text-xs text-muted-foreground">Generation completion rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Gens/User</CardTitle>
            <Activity className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userEngagement.avgGensPerUser}</div>
            <p className="text-xs text-muted-foreground">All-time average</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
            <Coins className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(tokenData || []).reduce((sum, d) => sum + d.tokens, 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics Tabs */}
      <Tabs defaultValue="activity" className="space-y-4">
        <TabsList>
          <TabsTrigger value="activity">Activity Trends</TabsTrigger>
          <TabsTrigger value="templates">Template Performance</TabsTrigger>
          <TabsTrigger value="tokens">Token Economics</TabsTrigger>
          <TabsTrigger value="engagement">User Engagement</TabsTrigger>
        </TabsList>

        {/* Activity Trends Tab */}
        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Daily Activity (Last 30 Days)</CardTitle>
              <CardDescription>User actions across the platform</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={activityData || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="generations" stackId="1" stroke="#8b5cf6" fill="#8b5cf6" />
                  <Area type="monotone" dataKey="downloads" stackId="1" stroke="#ec4899" fill="#ec4899" />
                  <Area type="monotone" dataKey="shares" stackId="1" stroke="#f59e0b" fill="#f59e0b" />
                  <Area type="monotone" dataKey="views" stackId="1" stroke="#10b981" fill="#10b981" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Template Performance Tab */}
        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Templates</CardTitle>
              <CardDescription>Most used templates with conversion rates</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={templateData || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="views" fill="#8b5cf6" name="Views" />
                  <Bar dataKey="uses" fill="#ec4899" name="Uses" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Token Economics Tab */}
        <TabsContent value="tokens" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Token Spending by Model</CardTitle>
              <CardDescription>Resource utilization across AI models</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={tokenData || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="model" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="tokens" fill="#f59e0b" name="Tokens Used" />
                  <Bar dataKey="count" fill="#10b981" name="Generations" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Success vs Failed</CardTitle>
                <CardDescription>Generation outcomes by model</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={(tokenData || []).map(d => ({ name: d.model, value: d.success }))}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => entry.name}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {(tokenData || []).map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Avg Tokens Per Generation</CardTitle>
                <CardDescription>Efficiency metrics by model</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {(tokenData || []).map((d, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm font-medium">{d.model}</span>
                    <span className="text-sm text-muted-foreground">
                      {d.count > 0 ? (d.tokens / d.count).toFixed(1) : 0} tokens/gen
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* User Engagement Tab */}
        <TabsContent value="engagement" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                  Engagement Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Active Users</span>
                  <span className="text-2xl font-bold">{userEngagement.activeUsers}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Activation Rate</span>
                  <span className="text-2xl font-bold">
                    {userEngagement.totalUsers > 0 
                      ? ((userEngagement.activeUsers / userEngagement.totalUsers) * 100).toFixed(1)
                      : 0}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Avg Generations/User</span>
                  <span className="text-2xl font-bold">{userEngagement.avgGensPerUser}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Platform Health</CardTitle>
                <CardDescription>Overall system performance</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Success Rate</span>
                    <span className="text-sm text-muted-foreground">{userEngagement.successRate}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500"
                      style={{ width: `${userEngagement.successRate}%` }}
                    />
                  </div>
                </div>
                
                <p className="text-sm text-muted-foreground">
                  Platform is performing {parseFloat(userEngagement.successRate) > 90 ? 'excellently' : 'well'} with a {userEngagement.successRate}% generation success rate.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
