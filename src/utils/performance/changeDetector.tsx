import { useEffect, useRef } from 'react';
import { logger } from '@/lib/logger';

export const useWhyDidYouUpdate = (name: string, props: Record<string, unknown>) => {
  const previousProps = useRef<Record<string, unknown>>();

  useEffect(() => {
    if (!import.meta.env.DEV) return;

    if (previousProps.current) {
      const allKeys = Object.keys({ ...previousProps.current, ...props });
      const changedProps: Record<string, { from: unknown; to: unknown }> = {};

      allKeys.forEach((key) => {
        if (previousProps.current && previousProps.current[key] !== props[key]) {
          changedProps[key] = {
            from: previousProps.current[key],
            to: props[key],
          };
        }
      });

      if (Object.keys(changedProps).length > 0) {
        logger.debug('Props changed', {
          component: name,
          operation: 'whyDidYouUpdate',
          changedProps
        });
      }
    }

    previousProps.current = props;
  });
};
