import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Download, Play, BarChart } from 'lucide-react';
import { 
  runPerformanceAudit, 
  downloadPerformanceReport, 
  logPerformanceReport,
  type PerformanceReport 
} from '@/utils/performanceAudit';
import { logger } from '@/lib/logger';

export function PerformanceAuditPanel() {
  const [report, setReport] = useState<PerformanceReport | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRunAudit = async () => {
    setLoading(true);
    try {
      const auditReport = await runPerformanceAudit();
      setReport(auditReport);
      logPerformanceReport(auditReport);
    } catch (error) {
      logger.error('Performance audit failed', error, {
        component: 'PerformanceAuditPanel',
        operation: 'handleRunAudit'
      });
    } finally {
      setLoading(false);
    }
  };

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 90) return 'default';
    if (score >= 70) return 'secondary';
    return 'destructive';
  };

  const getMetricStatus = (value: number | null, threshold: number, inverted = false) => {
    if (value === null) return 'secondary';
    const isGood = inverted ? value < threshold : value > threshold;
    return isGood ? 'default' : 'destructive';
  };

  if (!import.meta.env.DEV) return null;

  return (
    <Card className="fixed bottom-20 right-2 w-80 z-[99998] shadow-2xl">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <BarChart className="h-4 w-4" />
          Performance Audit
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-xs">
        <Button 
          onClick={handleRunAudit} 
          disabled={loading}
          size="sm"
          className="w-full"
        >
          <Play className="h-3 w-3 mr-2" />
          {loading ? 'Running...' : 'Run Audit'}
        </Button>

        {report && (
          <>
            <div className="flex items-center justify-between">
              <span>Overall Score</span>
              <Badge variant={getScoreBadgeVariant(report.score)}>
                {report.score}/100
              </Badge>
            </div>

            <div className="space-y-2 pt-2 border-t">
              <div className="font-semibold">Core Web Vitals</div>
              {report.metrics.lcp && (
                <div className="flex items-center justify-between">
                  <span>LCP</span>
                  <Badge variant={getMetricStatus(report.metrics.lcp, 2500, true)}>
                    {report.metrics.lcp.toFixed(0)}ms
                  </Badge>
                </div>
              )}
              {report.metrics.fid && (
                <div className="flex items-center justify-between">
                  <span>FID</span>
                  <Badge variant={getMetricStatus(report.metrics.fid, 100, true)}>
                    {report.metrics.fid.toFixed(0)}ms
                  </Badge>
                </div>
              )}
              {report.metrics.cls && (
                <div className="flex items-center justify-between">
                  <span>CLS</span>
                  <Badge variant={getMetricStatus(report.metrics.cls, 0.1, true)}>
                    {report.metrics.cls.toFixed(3)}
                  </Badge>
                </div>
              )}
            </div>

            <div className="space-y-2 pt-2 border-t">
              <div className="font-semibold">Bundle</div>
              <div className="flex items-center justify-between">
                <span>JS Size</span>
                <Badge variant="secondary">
                  {(report.bundle.jsSize / 1024).toFixed(1)} KB
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>CSS Size</span>
                <Badge variant="secondary">
                  {(report.bundle.cssSize / 1024).toFixed(1)} KB
                </Badge>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t">
              <div className="font-semibold">Caching</div>
              <div className="flex items-center justify-between">
                <span>Service Worker</span>
                <Badge variant={report.caching.serviceWorkerActive ? 'default' : 'destructive'}>
                  {report.caching.serviceWorkerActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Cached Items</span>
                <Badge variant="secondary">
                  {report.caching.cachedItems}
                </Badge>
              </div>
            </div>

            <Button
              onClick={() => downloadPerformanceReport(report)}
              size="sm"
              variant="outline"
              className="w-full"
            >
              <Download className="h-3 w-3 mr-2" />
              Download Report
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
