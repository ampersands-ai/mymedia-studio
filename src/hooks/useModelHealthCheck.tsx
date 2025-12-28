import { useEffect } from 'react';
import { toast } from 'sonner';
import { checkModelHealth, getMissingFlagshipNames } from '@/lib/models/flagshipModelGuard';
import { logger } from '@/lib/logger';

/**
 * Hook to perform a one-time model health check on app load.
 * Shows a warning toast if flagship models are missing (usually due to stale cache).
 */
export function useModelHealthCheck(loadedModelRecordIds: string[], isLoading: boolean) {
  useEffect(() => {
    // Only run check when models have finished loading
    if (isLoading || loadedModelRecordIds.length === 0) return;

    const result = checkModelHealth(loadedModelRecordIds);
    
    if (!result.isHealthy) {
      const missingNames = getMissingFlagshipNames(result.missingFlagshipIds);
      
      logger.warn('Model health check failed - suggesting cache clear', {
        component: 'useModelHealthCheck',
        loadedCount: result.loadedCount,
        missingNames,
        belowMinimum: result.belowMinimum,
      });

      // Only show toast in production or if significantly unhealthy
      if (result.belowMinimum || result.missingFlagshipIds.length > 1) {
        toast.warning('Some models may be missing', {
          description: 'Try clearing your cache in Settings → Account if you don\'t see expected models.',
          duration: 8000,
          action: {
            label: 'Go to Settings',
            onClick: () => {
              window.location.href = '/settings?tab=account';
            },
          },
        });
      }
    }
  }, [loadedModelRecordIds, isLoading]);
}
