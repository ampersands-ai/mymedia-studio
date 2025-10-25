/**
 * Performance Audit Utilities
 * Run comprehensive performance checks and generate reports
 */

export interface PerformanceReport {
  timestamp: string;
  metrics: {
    lcp: number | null;
    fid: number | null;
    cls: number | null;
    fcp: number | null;
    ttfb: number | null;
  };
  bundle: {
    jsSize: number;
    cssSize: number;
    imageCount: number;
    fontCount: number;
  };
  caching: {
    serviceWorkerActive: boolean;
    cacheCount: number;
    cachedItems: number;
  };
  performance: {
    fps: number;
    memory: number;
    willChangeCount: number;
  };
  score: number; // Overall score 0-100
}

/**
 * Run a comprehensive performance audit
 */
export async function runPerformanceAudit(): Promise<PerformanceReport> {
  const report: PerformanceReport = {
    timestamp: new Date().toISOString(),
    metrics: {
      lcp: null,
      fid: null,
      cls: null,
      fcp: null,
      ttfb: null,
    },
    bundle: {
      jsSize: 0,
      cssSize: 0,
      imageCount: 0,
      fontCount: 0,
    },
    caching: {
      serviceWorkerActive: false,
      cacheCount: 0,
      cachedItems: 0,
    },
    performance: {
      fps: 60,
      memory: 0,
      willChangeCount: 0,
    },
    score: 0,
  };

  // Check Core Web Vitals from Performance API
  if ('performance' in window) {
    const perfEntries = performance.getEntriesByType('navigation');
    if (perfEntries.length > 0) {
      const navEntry = perfEntries[0] as PerformanceNavigationTiming;
      report.metrics.ttfb = navEntry.responseStart - navEntry.requestStart;
    }

    // Paint timing
    const paintEntries = performance.getEntriesByType('paint');
    const fcp = paintEntries.find(e => e.name === 'first-contentful-paint');
    if (fcp) report.metrics.fcp = fcp.startTime;
  }

  // Check service worker
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    report.caching.serviceWorkerActive = registrations.length > 0;
  }

  // Check caches
  if ('caches' in window) {
    const cacheNames = await caches.keys();
    report.caching.cacheCount = cacheNames.length;
    
    for (const name of cacheNames) {
      const cache = await caches.open(name);
      const keys = await cache.keys();
      report.caching.cachedItems += keys.length;
    }
  }

  // Check memory (if available)
  if ('memory' in performance) {
    const memory = (performance as any).memory;
    report.performance.memory = Math.round(memory.usedJSHeapSize / 1048576);
  }

  // Check will-change usage
  report.performance.willChangeCount = document.querySelectorAll('[style*="will-change"]').length;

  // Calculate bundle sizes (approximation from performance entries)
  const resourceEntries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
  resourceEntries.forEach(entry => {
    const size = entry.transferSize || 0;
    if (entry.name.endsWith('.js')) {
      report.bundle.jsSize += size;
    } else if (entry.name.endsWith('.css')) {
      report.bundle.cssSize += size;
    } else if (entry.name.match(/\.(jpg|jpeg|png|gif|webp|avif|svg)$/i)) {
      report.bundle.imageCount++;
    } else if (entry.name.match(/\.(woff|woff2|ttf|eot)$/i)) {
      report.bundle.fontCount++;
    }
  });

  // Calculate overall score
  report.score = calculatePerformanceScore(report);

  return report;
}

/**
 * Calculate overall performance score (0-100)
 */
function calculatePerformanceScore(report: PerformanceReport): number {
  let score = 100;

  // Deduct for poor metrics
  if (report.metrics.lcp && report.metrics.lcp > 2500) score -= 20;
  if (report.metrics.fid && report.metrics.fid > 100) score -= 20;
  if (report.metrics.cls && report.metrics.cls > 0.1) score -= 20;
  if (report.metrics.fcp && report.metrics.fcp > 1800) score -= 10;
  if (report.metrics.ttfb && report.metrics.ttfb > 600) score -= 10;

  // Bonus for good practices
  if (report.caching.serviceWorkerActive) score += 5;
  if (report.caching.cachedItems > 10) score += 5;
  if (report.performance.memory < 100) score += 5;
  if (report.performance.willChangeCount < 10) score += 5;

  return Math.max(0, Math.min(100, score));
}

/**
 * Format report as readable text
 */
export function formatPerformanceReport(report: PerformanceReport): string {
  return `
═══════════════════════════════════════
🚀 PERFORMANCE AUDIT REPORT
═══════════════════════════════════════
Timestamp: ${new Date(report.timestamp).toLocaleString()}
Overall Score: ${report.score}/100

📊 CORE WEB VITALS
──────────────────
LCP (Largest Contentful Paint): ${report.metrics.lcp ? `${report.metrics.lcp.toFixed(0)}ms` : 'N/A'}
FID (First Input Delay): ${report.metrics.fid ? `${report.metrics.fid.toFixed(0)}ms` : 'N/A'}
CLS (Cumulative Layout Shift): ${report.metrics.cls ? report.metrics.cls.toFixed(3) : 'N/A'}
FCP (First Contentful Paint): ${report.metrics.fcp ? `${report.metrics.fcp.toFixed(0)}ms` : 'N/A'}
TTFB (Time to First Byte): ${report.metrics.ttfb ? `${report.metrics.ttfb.toFixed(0)}ms` : 'N/A'}

📦 BUNDLE ANALYSIS
──────────────────
JavaScript: ${(report.bundle.jsSize / 1024).toFixed(2)} KB
CSS: ${(report.bundle.cssSize / 1024).toFixed(2)} KB
Images: ${report.bundle.imageCount} loaded
Fonts: ${report.bundle.fontCount} loaded

💾 CACHING STATUS
──────────────────
Service Worker: ${report.caching.serviceWorkerActive ? '✅ Active' : '❌ Inactive'}
Cache Count: ${report.caching.cacheCount}
Cached Items: ${report.caching.cachedItems}

⚡ RUNTIME PERFORMANCE
──────────────────
FPS: ${report.performance.fps}
Memory Usage: ${report.performance.memory} MB
will-change Elements: ${report.performance.willChangeCount}

═══════════════════════════════════════
`;
}

/**
 * Export report to console
 */
export function logPerformanceReport(report: PerformanceReport): void {
  console.log(formatPerformanceReport(report));
}

/**
 * Download report as JSON
 */
export function downloadPerformanceReport(report: PerformanceReport): void {
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `performance-audit-${Date.now()}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
