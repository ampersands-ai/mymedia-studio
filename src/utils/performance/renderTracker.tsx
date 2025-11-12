import { useEffect, useRef } from 'react';

export const useRenderCount = (componentName: string, logThreshold: number = 10) => {
  const renderCount = useRef(0);
  const startTime = useRef(Date.now());

  useEffect(() => {
    if (!import.meta.env.DEV) return;

    renderCount.current += 1;
    const count = renderCount.current;

    if (count === 1) {
      console.log(`[RenderTracker] ${componentName} mounted`);
    } else {
      const elapsed = Date.now() - startTime.current;
      console.log(
        `[RenderTracker] ${componentName} rendered ${count} times (${elapsed}ms since mount)`
      );
    }

    // Warn if threshold exceeded
    if (count === logThreshold) {
      console.warn(
        `⚠️ [RenderTracker] ${componentName} has rendered ${count} times! Consider optimization.`
      );
    }
  });

  return renderCount.current;
};
