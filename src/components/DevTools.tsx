/**
 * DevTools Component
 * Development-only tool for monitoring service workers and caches
 */
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { unregisterServiceWorkers, getCacheStats } from '@/utils/serviceWorkerCleanup';
import { Bug, RefreshCw } from 'lucide-react';

export const DevTools = () => {
  const [swCount, setSwCount] = useState(0);
  const [cacheCount, setCacheCount] = useState(0);
  const [cachedItems, setCachedItems] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

  const updateStats = async () => {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      setSwCount(registrations.length);
    }
    
    const stats = await getCacheStats();
    setCacheCount(stats.cacheCount);
    setCachedItems(stats.cachedItems);
  };

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    
    updateStats();
    
    // Update stats every 5 seconds
    const interval = setInterval(updateStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleClearAll = async () => {
    await unregisterServiceWorkers();
    await updateStats();
  };

  // Only show in development
  if (!import.meta.env.DEV) return null;

  return (
    <Card className="fixed bottom-4 left-4 bg-black/90 text-white p-3 rounded-lg text-xs font-mono shadow-lg z-[99999] border border-white/20">
      <div className="flex items-center gap-2 mb-2">
        <Bug className="h-4 w-4" />
        <div 
          className="font-bold cursor-pointer select-none"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          Dev Monitor {isExpanded ? '▼' : '▶'}
        </div>
      </div>
      
      {isExpanded && (
        <div className="space-y-2 mt-3 pt-3 border-t border-white/20">
          <div className="flex justify-between items-center">
            <span>Service Workers:</span>
            <span className={swCount > 0 ? 'text-red-400 font-bold' : 'text-green-400'}>
              {swCount}
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span>Caches:</span>
            <span className="text-blue-400">{cacheCount}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span>Cached Items:</span>
            <span className="text-blue-400">{cachedItems}</span>
          </div>
          
          {(swCount > 0 || cacheCount > 0) && (
            <Button
              onClick={handleClearAll}
              size="sm"
              className="w-full mt-2 bg-red-500 hover:bg-red-600 text-white"
            >
              <RefreshCw className="h-3 w-3 mr-2" />
              Clear All & Reload
            </Button>
          )}
          
          {swCount === 0 && cacheCount === 0 && (
            <div className="text-green-400 text-center mt-2">
              ✅ All Clean
            </div>
          )}
        </div>
      )}
    </Card>
  );
};
