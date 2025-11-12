import { useEffect, useRef } from 'react';
import { logger } from '@/lib/logger';

export const useRenderCount = (componentName: string, logThreshold: number = 10) => {
  const renderCount = useRef(0);
  const startTime = useRef(Date.now());

  useEffect(() => {
    if (!import.meta.env.DEV) return;

    renderCount.current += 1;
    const count = renderCount.current;

    if (count === 1) {
      logger.debug('Component mounted', {
        component: componentName,
        operation: 'renderTracker'
      });
    } else {
      const elapsed = Date.now() - startTime.current;
      logger.debug('Component rendered', {
        component: componentName,
        operation: 'renderTracker',
        renderCount: count,
        elapsedMs: elapsed
      });
    }

    // Warn if threshold exceeded
    if (count === logThreshold) {
      logger.warn('Component render count exceeded threshold', {
        component: componentName,
        operation: 'renderTracker',
        renderCount: count,
        threshold: logThreshold
      });
    }
  });

  return renderCount.current;
};
