import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, Trash2, Info, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { clearAllCaches, getCacheStats } from '@/utils/cacheManagement';
import { useEffect } from 'react';

interface CacheStats {
  serviceWorkerActive: boolean;
  cacheCount: number;
  totalCachedItems: number;
  cacheNames: string[];
}

export function AppCacheSection() {
  const [isClearing, setIsClearing] = useState(false);
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);

  useEffect(() => {
    getCacheStats().then(setCacheStats);
  }, []);

  const handleHardRefresh = async () => {
    setIsClearing(true);
    toast.info('Clearing app cache...', { duration: 2000 });
    
    try {
      await clearAllCaches();
      // Page will reload automatically after clearAllCaches()
    } catch (error) {
      setIsClearing(false);
      toast.error('Failed to clear cache. Please try again.');
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5 text-primary" />
          <CardTitle>App Cache</CardTitle>
        </div>
        <CardDescription>
          Clear cached data to fix display issues or get the latest app version
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="bg-muted/50">
          <Info className="h-4 w-4" />
          <AlertDescription>
            If models or features appear missing, clearing the cache often fixes the issue. 
            This will reload the page with fresh data.
          </AlertDescription>
        </Alert>

        {cacheStats && (
          <div className="text-sm text-muted-foreground space-y-1">
            <p>Service Worker: {cacheStats.serviceWorkerActive ? 'Active' : 'Inactive'}</p>
            <p>Cached items: {cacheStats.totalCachedItems}</p>
          </div>
        )}

        <Button 
          onClick={handleHardRefresh}
          disabled={isClearing}
          variant="outline"
          className="w-full sm:w-auto"
        >
          {isClearing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Clearing...
            </>
          ) : (
            <>
              <Trash2 className="h-4 w-4 mr-2" />
              Clear Cache & Reload
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
