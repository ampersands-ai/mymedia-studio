import { useEffect, useState } from 'react';
import { logger } from '@/lib/logger';
import { hasMemoryInfo, getMemoryUsage } from '@/types/performance';

interface PerformanceMetrics {
  fps: number;
  memory: number;
  cacheSize: number;
  willChangeCount: number;
}

export function DevPerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    memory: 0,
    cacheSize: 0,
    willChangeCount: 0
  });

  useEffect(() => {
    if (!import.meta.env.DEV) return;

    let frames = 0;
    let lastTime = performance.now();
    let animationFrameId: number;

    // FPS counter
    const measureFPS = () => {
      frames++;
      const now = performance.now();
      if (now >= lastTime + 1000) {
        setMetrics(prev => ({ ...prev, fps: frames }));
        frames = 0;
        lastTime = now;
      }
      animationFrameId = requestAnimationFrame(measureFPS);
    };

    measureFPS();

    // Other metrics - check every second
    const interval = setInterval(async () => {
      // Memory usage (Chrome-specific API)
      const memoryUsage = getMemoryUsage(performance);
      if (memoryUsage !== null) {
        setMetrics(prev => ({
          ...prev,
          memory: memoryUsage
        }));
      }

      // Cache size
      if ('caches' in window) {
        try {
          const cacheNames = await caches.keys();
          let totalSize = 0;
          for (const name of cacheNames) {
            const cache = await caches.open(name);
            const keys = await cache.keys();
            totalSize += keys.length;
          }
          setMetrics(prev => ({ ...prev, cacheSize: totalSize }));
        } catch (err) {
          logger.error('Cache size check failed', err, {
            component: 'DevPerformanceMonitor',
            operation: 'measureCacheSize'
          });
        }
      }

      // will-change count
      const willChangeElements = document.querySelectorAll('[style*="will-change"]');
      setMetrics(prev => ({ 
        ...prev, 
        willChangeCount: willChangeElements.length 
      }));
      
      // Warn if too many will-change elements
      if (willChangeElements.length > 10) {
        logger.warn('Excessive will-change elements detected', {
          component: 'DevPerformanceMonitor',
          operation: 'checkWillChange',
          count: willChangeElements.length
        });
      }
    }, 1000);

    return () => {
      clearInterval(interval);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  if (!import.meta.env.DEV) return null;

  return (
    <div 
      className="fixed bottom-2 right-2 bg-black/90 text-white p-3 rounded-lg text-xs font-mono z-[99999] backdrop-blur-sm"
      style={{ minWidth: '150px' }}
    >
      <div className="font-bold mb-2 text-primary">Performance</div>
      <div className="space-y-1">
        <div className={metrics.fps < 55 ? 'text-red-400' : ''}>
          FPS: {metrics.fps}
        </div>
        {metrics.memory > 0 && (
          <div className={metrics.memory > 100 ? 'text-yellow-400' : ''}>
            Memory: {metrics.memory}MB
          </div>
        )}
        <div>Cache: {metrics.cacheSize} items</div>
        <div className={metrics.willChangeCount > 10 ? 'text-red-400' : ''}>
          will-change: {metrics.willChangeCount}
        </div>
      </div>
    </div>
  );
}
