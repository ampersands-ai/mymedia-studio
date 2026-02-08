/**
 * System Monitoring Dashboard
 * Comprehensive view of system health, performance, and metrics
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Database,
  HardDrive,
  RefreshCw,
  Server,
  Shield,
  
  TrendingUp,
  Users,
  Zap,
  XCircle,
} from 'lucide-react';
import { useSystemMetrics, useRateLimitMetrics, useErrorMetrics } from '@/hooks/useSystemMetrics';
import { formatDistanceToNow } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';

export default function SystemMonitoringDashboard() {
  const queryClient = useQueryClient();
  const { data: systemMetrics, isLoading: systemLoading } = useSystemMetrics();
  const { data: rateLimitMetrics, isLoading: rateLimitLoading } = useRateLimitMetrics();
  const { data: errorMetrics, isLoading: errorLoading } = useErrorMetrics();

  const isLoading = systemLoading || rateLimitLoading || errorLoading;

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ['system-metrics'] });
    queryClient.invalidateQueries({ queryKey: ['rate-limit-metrics'] });
    queryClient.invalidateQueries({ queryKey: ['error-metrics'] });
  };

  const getHealthStatus = () => {
    if (!systemMetrics || !errorMetrics) return 'unknown';
    
    const errorRate = systemMetrics.performance.errorRate24h;
    const criticalErrors = errorMetrics.criticalErrors24h;
    
    if (criticalErrors > 5 || errorRate > 10) return 'critical';
    if (criticalErrors > 0 || errorRate > 5) return 'degraded';
    return 'healthy';
  };

  const healthStatus = getHealthStatus();

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-50 border-green-200';
      case 'degraded': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-muted-foreground bg-muted';
    }
  };

  const getHealthIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'degraded': return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'critical': return <XCircle className="h-5 w-5 text-red-600" />;
      default: return <Activity className="h-5 w-5 text-muted-foreground" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">System Monitoring</h1>
          <p className="text-muted-foreground">
            Real-time infrastructure health and performance metrics
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Card className={`px-4 py-2 ${getHealthColor(healthStatus)}`}>
            <div className="flex items-center gap-2">
              {getHealthIcon(healthStatus)}
              <span className="font-semibold capitalize">{healthStatus}</span>
            </div>
          </Card>
          <Button onClick={refreshAll} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Database className="h-4 w-4 text-primary" />
              Total Generations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {systemMetrics?.database.totalGenerations.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {systemMetrics?.database.activeGenerations} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Active Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {systemMetrics?.users.activeUsers24h.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {systemMetrics?.users.totalUsers.toLocaleString()} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              Success Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {systemMetrics?.performance.successRate24h.toFixed(1)}%
            </div>
            <Progress 
              value={systemMetrics?.performance.successRate24h} 
              className="h-2 mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Avg Latency
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {systemMetrics?.performance.avgApiLatency}ms
            </div>
            <p className="text-xs text-muted-foreground">
              API response time
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="errors">Errors</TabsTrigger>
          <TabsTrigger value="rate-limits">Rate Limits</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Database Health */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Database Health
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Total Generations</span>
                  <span className="font-mono">{systemMetrics?.database.totalGenerations.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Active Generations</span>
                  <Badge variant="outline">{systemMetrics?.database.activeGenerations}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Failed (24h)</span>
                  <Badge variant={systemMetrics?.database.failedGenerations24h ? 'destructive' : 'outline'}>
                    {systemMetrics?.database.failedGenerations24h}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* User Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  User Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Total Users</span>
                  <span className="font-mono">{systemMetrics?.users.totalUsers.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Active (24h)</span>
                  <span className="font-mono">{systemMetrics?.users.activeUsers24h.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">New Users (7d)</span>
                  <Badge className="bg-green-100 text-green-800">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    {systemMetrics?.users.newUsers7d}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Premium Users</span>
                  <Badge variant="secondary">{systemMetrics?.users.premiumUsers}</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="errors" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className={errorMetrics?.criticalErrors24h ? 'border-red-200 bg-red-50' : ''}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Critical Errors</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${errorMetrics?.criticalErrors24h ? 'text-red-600' : ''}`}>
                  {errorMetrics?.criticalErrors24h}
                </div>
                <p className="text-xs text-muted-foreground">Last 24 hours</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Errors</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{errorMetrics?.totalErrors24h}</div>
                <p className="text-xs text-muted-foreground">Last 24 hours</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {systemMetrics?.performance.errorRate24h.toFixed(2)}%
                </div>
                <Progress 
                  value={100 - (systemMetrics?.performance.errorRate24h || 0)} 
                  className="h-2 mt-2"
                />
              </CardContent>
            </Card>
          </div>

          {/* Errors by Category */}
          <Card>
            <CardHeader>
              <CardTitle>Errors by Category</CardTitle>
              <CardDescription>Distribution of errors in the last 24 hours</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {errorMetrics?.errorsByCategory.slice(0, 5).map(({ category, count }) => (
                  <div key={category} className="flex items-center justify-between">
                    <span className="text-sm capitalize">{category.replace(/_/g, ' ')}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary"
                          style={{ 
                            width: `${(count / (errorMetrics?.totalErrors24h || 1)) * 100}%` 
                          }}
                        />
                      </div>
                      <span className="text-sm font-mono w-8 text-right">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Errors */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Errors</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {errorMetrics?.recentErrors.map((error) => (
                  <div 
                    key={error.id} 
                    className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg"
                  >
                    <AlertTriangle className={`h-4 w-4 mt-0.5 ${
                      error.severity === 'critical' ? 'text-red-500' : 'text-yellow-500'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{error.message}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">{error.category}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(error.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rate-limits" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Blocked Requests (24h)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{rateLimitMetrics?.totalBlocked24h}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Currently Blocked</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{rateLimitMetrics?.currentlyBlocked}</div>
                <p className="text-xs text-muted-foreground">Active blocks</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Protection Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                  <span className="text-lg font-medium">Active</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Blocked Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Top Blocked Actions</CardTitle>
              <CardDescription>Most frequently rate-limited actions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {rateLimitMetrics?.topBlockedActions.map(({ action, count }) => (
                  <div key={action} className="flex items-center justify-between">
                    <span className="text-sm font-mono">{action}</span>
                    <Badge variant="secondary">{count} blocks</Badge>
                  </div>
                ))}
                {(!rateLimitMetrics?.topBlockedActions || rateLimitMetrics.topBlockedActions.length === 0) && (
                  <p className="text-sm text-muted-foreground">No rate limit blocks in the last 24 hours</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5" />
                  API Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Average Latency</span>
                  <span className="font-mono">{systemMetrics?.performance.avgApiLatency}ms</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Success Rate</span>
                  <span className="font-mono text-green-600">
                    {systemMetrics?.performance.successRate24h.toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Error Rate</span>
                  <span className={`font-mono ${
                    (systemMetrics?.performance.errorRate24h || 0) > 5 ? 'text-red-600' : ''
                  }`}>
                    {systemMetrics?.performance.errorRate24h.toFixed(2)}%
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HardDrive className="h-5 w-5" />
                  Resource Usage
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Active Generations</span>
                    <span>{systemMetrics?.database.activeGenerations}</span>
                  </div>
                  <Progress value={Math.min((systemMetrics?.database.activeGenerations || 0) * 10, 100)} />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Rate Limit Utilization</span>
                    <span>{rateLimitMetrics?.currentlyBlocked} active</span>
                  </div>
                  <Progress value={Math.min((rateLimitMetrics?.currentlyBlocked || 0) * 5, 100)} />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
